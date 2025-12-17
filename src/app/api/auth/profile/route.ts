import { NextRequest, NextResponse } from "next/server";
import { Db, ObjectId } from "mongodb";
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
  isAdmin?: number;
  isActive: boolean;
  emailVerified: boolean;
  updatedAt: string;
  createdAt: string;
}

async function requireUser(req: NextRequest, db: Db) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const payload = await verifyAuthToken(token);
  if (!payload?.sessionToken) {
    return null;
  }

  const session = await db
    .collection<SessionRecord>("sessions")
    .findOne({ token: payload.sessionToken });
  if (!session) {
    return null;
  }

  if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
    await db.collection("sessions").deleteOne({ _id: session._id });
    return null;
  }

  const userId =
    typeof session.userId === "string" ? new ObjectId(session.userId) : session.userId;

  const user = await db.collection<UserRecord>("users").findOne({ _id: userId });
  return user;
}

function sanitizeUser(user: UserRecord) {
  const { _id, name, email, phone, bio, avatar, avatarPublicId } = user;
  return {
    id: _id.toString(),
    name,
    email,
    phone: phone ?? "",
    bio: bio ?? "",
    avatar: avatar ?? "",
    avatarPublicId: avatarPublicId ?? "",
    isAdmin: user.isAdmin ?? 0
  };
}

export async function GET(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    const user = await requireUser(req, db);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error("Failed to load profile:", error);
    return NextResponse.json(
      { error: "Unable to load profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    const user = await requireUser(req, db);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, phone, bio, avatar, avatarPublicId } = body ?? {};

    const updates: Partial<UserRecord> = {
      updatedAt: new Date().toISOString()
    };

    if (typeof name === "string" && name.trim().length >= 2) {
      updates.name = name.trim();
    }

    if (typeof phone === "string") {
      updates.phone = phone.trim();
    }

    if (typeof bio === "string") {
      updates.bio = bio.trim();
    }

    if (typeof avatar === "string") {
      updates.avatar = avatar;
    }

    if (typeof avatarPublicId === "string") {
      updates.avatarPublicId = avatarPublicId;
    }

    if (typeof email === "string" && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const duplicate = await db.collection<UserRecord>("users").findOne({
          _id: { $ne: user._id },
          email: normalizedEmail
        });
        if (duplicate) {
          return NextResponse.json(
            { error: "Another account already uses that email" },
            { status: 409 }
          );
        }
        updates.email = normalizedEmail;
        updates.emailVerified = false;
      }
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json(
        { error: "No changes provided" },
        { status: 400 }
      );
    }

    const result = await db
      .collection<UserRecord>("users")
      .findOneAndUpdate(
        { _id: user._id },
        { $set: updates },
        { returnDocument: "after" }
      );

    const updatedUser = result ?? null;

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { error: "Unable to update profile" },
      { status: 500 }
    );
  }
}
