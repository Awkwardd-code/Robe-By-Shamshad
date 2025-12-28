import "server-only";

import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import { connectToDatabase } from "@/db/client";

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
  addresses: Array<{
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    isDefault?: boolean;
  }>;
  password: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  createdAt: string;
  updatedAt: string;
  lastLogin: string;
}

interface SessionRecord {
  _id: ObjectId;
  token: string;
  userId: ObjectId | string;
  user?: SessionUserSnapshot;
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
}

export interface SessionAuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  avatarPublicId?: string;
  role?: string;
  isAdmin?: number;
}

function sanitizeSessionUser(user: SessionUserSnapshot): SessionAuthUser {
  return {
    id: user._id,
    name: user.name ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    bio: user.bio ?? "",
    avatar: user.avatar ?? "",
    avatarPublicId: user.avatarPublicId ?? "",
    role: user.role ?? "customer",
    isAdmin: user.isAdmin ?? 0
  };
}

function sanitizeUserRecord(user: UserRecord): SessionAuthUser {
  return {
    id: user._id.toString(),
    name: user.name ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    bio: user.bio ?? "",
    avatar: user.avatar ?? "",
    avatarPublicId: user.avatarPublicId ?? "",
    role: user.role ?? "customer",
    isAdmin: user.isAdmin ?? 0
  };
}

export async function getSessionUser(): Promise<SessionAuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const payload = await verifyAuthToken(token);
  if (!payload?.sessionToken) {
    return null;
  }

  const db = await connectToDatabase();
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

  if (session.user) {
    return sanitizeSessionUser(session.user);
  }

  const userId =
    typeof session.userId === "string" ? new ObjectId(session.userId) : session.userId;
  const user = await db.collection<UserRecord>("users").findOne({ _id: userId });
  if (!user) {
    return null;
  }

  return sanitizeUserRecord(user);
}
