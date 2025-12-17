import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Db, ObjectId } from "mongodb";
import { AUTH_COOKIE_OPTIONS, createAuthToken } from "@/lib/auth-token";
import { connectToDatabase } from "@/db/client";

const SESSION_MAX_AGE_SECONDS = AUTH_COOKIE_OPTIONS.maxAge ?? 60 * 60 * 24 * 7;

interface UserRecord {
  _id: ObjectId;
  name: string;
  email: string;
  password: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  isAdmin?: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

async function createSession(db: Db, userId: ObjectId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await db.collection("sessions").insertOne({
    token,
    userId,
    createdAt: new Date(),
    expiresAt
  });

  return { token, expiresAt };
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const db = await connectToDatabase();
    const normalizedEmail = normalizeEmail(email);

    const user = await db.collection<UserRecord>("users").findOne({ email: normalizedEmail });

    if (!user || user.password !== password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "This account has been deactivated. Please contact support." },
        { status: 403 }
      );
    }

    await db.collection<UserRecord>("users").updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date().toISOString() } }
    );

    const session = await createSession(db, user._id);

    const authToken = await createAuthToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isAdmin: user.isAdmin ? 1 : 0,
      sessionToken: session.token
    });

    const { password: _password, ...userWithoutPassword } = user;
    void _password;

    const response = NextResponse.json(
      {
        message: "Login successful",
        user: {
          ...userWithoutPassword,
          _id: user._id.toString()
        },
        session: {
          token: session.token,
          expiresAt: session.expiresAt.toISOString()
        }
      },
      { status: 200 }
    );

    response.cookies.set({
      ...AUTH_COOKIE_OPTIONS,
      value: authToken
    });

    return response;
  } catch (error) {
    console.error("Failed to process login:", error);
    return NextResponse.json({ error: "Unable to process login request" }, { status: 500 });
  }
}
