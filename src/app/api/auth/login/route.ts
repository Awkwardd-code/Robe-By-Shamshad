import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Db, ObjectId } from "mongodb";
import { AUTH_COOKIE_OPTIONS, createAuthToken } from "@/lib/auth-token";
import { connectToDatabase } from "@/db/client";

const SESSION_MAX_AGE_SECONDS = AUTH_COOKIE_OPTIONS.maxAge ?? 60 * 60 * 24 * 7;

interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
}

interface UserRecord {
  _id: ObjectId;
  name: string;
  email: string;
  password: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  avatarPublicId?: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  isAdmin?: number;
  addresses?: Address[];
  totalOrders?: number;
  totalSpent?: number;
  lastOrderDate?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionUserSnapshot {
  _id: string;
  name: string;
  email: string;
  phone: string;
  bio: string;
  avatar: string;
  avatarPublicId: string;
  role: string;
  isActive: boolean;
  isAdmin: number;
  emailVerified: boolean;
  addresses: Address[];
  password: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  createdAt: string;
  updatedAt: string;
  lastLogin: string;
}

function buildSessionUserSnapshot(user: UserRecord): SessionUserSnapshot {
  return {
    _id: user._id.toString(),
    name: user.name ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    bio: user.bio ?? "",
    avatar: user.avatar ?? "",
    avatarPublicId: user.avatarPublicId ?? "",
    role: user.role ?? "",
    isActive: user.isActive ?? false,
    isAdmin: user.isAdmin ?? 0,
    emailVerified: user.emailVerified ?? false,
    addresses: user.addresses ?? [],
    password: user.password ?? "",
    totalOrders: user.totalOrders ?? 0,
    totalSpent: user.totalSpent ?? 0,
    lastOrderDate: user.lastOrderDate ?? "",
    createdAt: user.createdAt ?? "",
    updatedAt: user.updatedAt ?? "",
    lastLogin: user.lastLogin ?? ""
  };
}

async function createSession(db: Db, user: UserRecord) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await db.collection("sessions").insertOne({
    token,
    userId: user._id,
    user: buildSessionUserSnapshot(user),
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

    const lastLoginAt = new Date().toISOString();
    await db.collection<UserRecord>("users").updateOne(
      { _id: user._id },
      { $set: { lastLogin: lastLoginAt } }
    );

    const sessionUser = { ...user, lastLogin: lastLoginAt };
    const session = await createSession(db, sessionUser);

    const authToken = await createAuthToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isAdmin: user.isAdmin ? 1 : 0,
      sessionToken: session.token
    });

    const { password: _password, ...userWithoutPassword } = sessionUser;
    void _password;

    const response = NextResponse.json(
      {
        message: "Login successful",
        user: {
          ...userWithoutPassword,
          _id: sessionUser._id.toString()
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
