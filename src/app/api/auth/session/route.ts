import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import { connectToDatabase } from "@/db/client";

interface SessionRecord {
  _id: ObjectId;
  token: string;
  userId: ObjectId | string;
  expiresAt?: Date;
}

interface UserRecord {
  _id: ObjectId;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  avatarPublicId?: string;
  role?: string;
  isAdmin?: number;
  isActive: boolean;
  emailVerified: boolean;
  updatedAt: string;
  createdAt: string;
}

function sanitizeUser(user: UserRecord) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    bio: user.bio ?? "",
    avatar: user.avatar ?? "",
    avatarPublicId: user.avatarPublicId ?? "",
    role: user.role ?? "customer",
    isAdmin: user.isAdmin ?? 0,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
    updatedAt: user.updatedAt,
    createdAt: user.createdAt
  };
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyAuthToken(token);
    if (!payload?.sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await connectToDatabase();
    const session = await db.collection<SessionRecord>("sessions").findOne({
      token: payload.sessionToken
    });

    if (!session) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
      await db.collection("sessions").deleteOne({ _id: session._id });
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const userId =
      typeof session.userId === "string" ? new ObjectId(session.userId) : session.userId;
    const user = await db.collection<UserRecord>("users").findOne({ _id: userId });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: sanitizeUser(user),
      session: {
        token: session.token,
        expiresAt: session.expiresAt?.toISOString() ?? null,
        issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null
      }
    });
  } catch (error) {
    console.error("Failed to load session:", error);
    return NextResponse.json({ error: "Unable to load session" }, { status: 500 });
  }
}
