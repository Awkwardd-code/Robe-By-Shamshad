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

export async function GET(request: NextRequest) {
  try {
    const db = await connectToDatabase();
    const userId = await getSessionUserId(request, db);
    const userIdString = userId ? userId.toString() : null;

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "6", 10);
    const resolvedLimit = Number.isFinite(limit) && limit > 0 ? limit : 6;

    const now = new Date();
    let usedCouponIds: ObjectId[] = [];
    if (userId && userIdString) {
      const redemptions = await db
        .collection("couponRedemptions")
        .find({
          $or: [{ userId }, { userId: userIdString }, { actorId: userIdString }],
        })
        .project({ couponId: 1 })
        .toArray();

      usedCouponIds = redemptions
        .map((item: any) => item.couponId)
        .filter((id: any) => ObjectId.isValid(id))
        .map((id: any) => new ObjectId(id));
    }

    const couponsCollection = db.collection("coupons");
    const query: any = {
      startDate: { $lte: now },
      endDate: { $gte: now },
    };
    query.$or = userId && userIdString
      ? [
          { assignedUserId: { $exists: false } },
          { assignedUserId: null },
          { assignedUserId: userId },
          { assignedUserId: userIdString },
        ]
      : [{ assignedUserId: { $exists: false } }, { assignedUserId: null }];

    if (usedCouponIds.length > 0) {
      query._id = { $nin: usedCouponIds };
    }

    const coupons = await couponsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(resolvedLimit)
      .toArray();

    return NextResponse.json({ coupons }, { status: 200 });
  } catch (error: any) {
    console.error("GET available coupons error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch available coupons" },
      { status: 500 }
    );
  }
}
