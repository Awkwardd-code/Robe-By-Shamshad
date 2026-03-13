/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { Db, ObjectId } from "mongodb";
import { connectToDatabase } from "@/db/client";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";

interface SessionRecord {
  _id: ObjectId;
  token: string;
  userId: ObjectId | string;
  expiresAt?: Date;
}

const COUPON_CODE_LENGTH = 14;
const COUPON_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
const CART_COUPON_SOURCE = "cart_threshold_10";
const CART_COUPON_DISCOUNT_PERCENT = 10;
const CART_COUPON_MIN_SUBTOTAL = 20000;
const CART_COUPON_VALID_DAYS = 7;

const normalizeCouponCode = (value: string) =>
  value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

const generateCouponCode = () => {
  let value = "";
  for (let i = 0; i < COUPON_CODE_LENGTH; i += 1) {
    value += COUPON_CHARS[Math.floor(Math.random() * COUPON_CHARS.length)];
  }
  return value;
};

const parseNumberField = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const serializeCoupon = (coupon: any) => ({
  _id: coupon._id.toString(),
  name: coupon.name,
  code: coupon.code,
  startDate: coupon.startDate,
  endDate: coupon.endDate,
  discountPercentage: coupon.discountPercentage,
  discountedPrice: coupon.discountedPrice,
  minSubtotal: coupon.minSubtotal,
  source: coupon.source,
});

async function getSessionUserId(req: NextRequest, db: Db) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyAuthToken(token);
  if (!payload?.sessionToken) return null;

  const session = await db.collection<SessionRecord>("sessions").findOne({
    token: payload.sessionToken,
  });

  if (!session) return null;

  if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
    await db.collection("sessions").deleteOne({ _id: session._id });
    return null;
  }

  return typeof session.userId === "string"
    ? new ObjectId(session.userId)
    : session.userId;
}

export async function POST(request: NextRequest) {
  try {
    const db = await connectToDatabase();
    const userId = await getSessionUserId(request, db);
    const userIdString = userId ? userId.toString() : null;

    const body = await request.json().catch(() => ({}));
    const subtotalRaw = parseNumberField(body?.subtotal);
    const subtotal = subtotalRaw && subtotalRaw > 0 ? subtotalRaw : 0;

    if (subtotal < CART_COUPON_MIN_SUBTOTAL) {
      return NextResponse.json(
        { eligible: false, reason: "Subtotal below threshold" },
        { status: 200 }
      );
    }

    const couponsCollection = db.collection("coupons");
    const redemptionCollection = db.collection("couponRedemptions");
    const now = new Date();

    if (userId && userIdString) {
      const existingCoupons = await couponsCollection
        .find({
          source: CART_COUPON_SOURCE,
          startDate: { $lte: now },
          endDate: { $gte: now },
          $or: [{ assignedUserId: userId }, { assignedUserId: userIdString }],
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();

      if (existingCoupons.length > 0) {
        const existingIds = existingCoupons.map((coupon) => coupon._id);
        const redemptions = await redemptionCollection
          .find({
            couponId: { $in: existingIds },
            $or: [{ userId }, { userId: userIdString }, { actorId: userIdString }],
          })
          .project({ couponId: 1 })
          .toArray();
        const redeemedSet = new Set(
          redemptions.map((entry: any) => entry.couponId?.toString())
        );

        const unused = existingCoupons.find(
          (coupon) => !redeemedSet.has(coupon._id.toString())
        );

        if (unused) {
          return NextResponse.json(
            {
              eligible: true,
              coupon: serializeCoupon(unused),
            },
            { status: 200 }
          );
        }
      }
    } else {
      const existingPublicCoupon = await couponsCollection.findOne({
        source: CART_COUPON_SOURCE,
        minSubtotal: CART_COUPON_MIN_SUBTOTAL,
        startDate: { $lte: now },
        endDate: { $gte: now },
        $or: [{ assignedUserId: { $exists: false } }, { assignedUserId: null }],
      });

      if (existingPublicCoupon) {
        return NextResponse.json(
          {
            eligible: true,
            coupon: serializeCoupon(existingPublicCoupon),
          },
          { status: 200 }
        );
      }
    }

    let code = normalizeCouponCode(generateCouponCode());
    let attempts = 0;
    while (attempts < 5) {
      const exists = await couponsCollection.findOne({ code });
      if (!exists) break;
      code = normalizeCouponCode(generateCouponCode());
      attempts += 1;
    }

    if (attempts >= 5) {
      return NextResponse.json(
        { error: "Unable to generate coupon code" },
        { status: 500 }
      );
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + CART_COUPON_VALID_DAYS);

    const newCoupon = {
      name: "Cart threshold reward",
      code,
      startDate,
      endDate,
      discountPercentage: CART_COUPON_DISCOUNT_PERCENT,
      discountedPrice: null,
      appliesTo: "cart_threshold",
      source: CART_COUPON_SOURCE,
      assignedUserId: userId ?? null,
      minSubtotal: CART_COUPON_MIN_SUBTOTAL,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await couponsCollection.insertOne(newCoupon);
    const createdCoupon = await couponsCollection.findOne({
      _id: result.insertedId,
    });

    if (!createdCoupon) {
      return NextResponse.json(
        { error: "Failed to create coupon" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        eligible: true,
        coupon: serializeCoupon(createdCoupon),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST threshold coupon error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create coupon" },
      { status: 500 }
    );
  }
}
