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

const normalizeCouponCode = (value: string) => value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

const parseNumberField = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

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
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const codeRaw = typeof body?.code === "string" ? body.code : "";
    const subtotalRaw = parseNumberField(body?.subtotal);
    const subtotal = subtotalRaw && subtotalRaw > 0 ? subtotalRaw : null;

    const normalized = normalizeCouponCode(codeRaw);
    if (!normalized) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    if (!subtotal) {
      return NextResponse.json(
        { error: "Cart subtotal is required to apply a coupon" },
        { status: 400 }
      );
    }

    const couponsCollection = db.collection("coupons");
    const coupon = await couponsCollection.findOne({ code: normalized });

    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    const assignedUserId = coupon.assignedUserId;
    if (assignedUserId) {
      const assignedId =
        typeof assignedUserId === "string"
          ? new ObjectId(assignedUserId)
          : assignedUserId;
      if (assignedId.toString() !== userId.toString()) {
        return NextResponse.json(
          { error: "This coupon is not assigned to your account" },
          { status: 403 }
        );
      }
    }

    const minSubtotal = parseNumberField(coupon.minSubtotal);
    if (minSubtotal && subtotal < minSubtotal) {
      return NextResponse.json(
        { error: `Cart subtotal must be at least ${minSubtotal}` },
        { status: 400 }
      );
    }

    const now = new Date();
    const startDate = new Date(coupon.startDate);
    const endDate = new Date(coupon.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Coupon dates are invalid" },
        { status: 400 }
      );
    }

    if (now < startDate) {
      return NextResponse.json({ error: "Coupon is not active yet" }, { status: 400 });
    }

    if (now > endDate) {
      return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
    }

    const redemptionCollection = db.collection("couponRedemptions");
    const existingRedemption = await redemptionCollection.findOne({
      userId,
      couponId: coupon._id,
    });

    if (existingRedemption) {
      return NextResponse.json(
        { error: "You have already used this coupon" },
        { status: 409 }
      );
    }

    const discountPercentage = parseNumberField(coupon.discountPercentage);
    const discountedPrice = parseNumberField(coupon.discountedPrice);

    if (!discountPercentage && !discountedPrice) {
      return NextResponse.json(
        { error: "This coupon has no discount configured" },
        { status: 400 }
      );
    }

    let discountAmount = 0;
    if (discountPercentage && discountPercentage > 0) {
      discountAmount = Math.round((subtotal * discountPercentage) / 100);
    } else if (discountedPrice && discountedPrice > 0) {
      if (discountedPrice >= subtotal) {
        return NextResponse.json(
          { error: "Discounted price must be less than cart subtotal" },
          { status: 400 }
        );
      }
      discountAmount = Math.max(0, subtotal - discountedPrice);
    }

    const appliedAt = new Date();
    await redemptionCollection.insertOne({
      userId,
      couponId: coupon._id,
      code: coupon.code,
      discountPercentage,
      discountedPrice,
      subtotal,
      discountAmount,
      appliedAt,
    });

    return NextResponse.json(
      {
        coupon: {
          _id: coupon._id.toString(),
          name: coupon.name,
          code: coupon.code,
          startDate: coupon.startDate,
          endDate: coupon.endDate,
          discountPercentage,
          discountedPrice,
        },
        redemption: {
          appliedAt: appliedAt.toISOString(),
          discountAmount,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("POST apply coupon error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to apply coupon" },
      { status: 500 }
    );
  }
}
