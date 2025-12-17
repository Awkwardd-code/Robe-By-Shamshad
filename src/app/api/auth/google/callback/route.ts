import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Db, ObjectId } from "mongodb";
import { AUTH_COOKIE_OPTIONS, createAuthToken } from "@/lib/auth-token";
import { connectToDatabase } from "@/db/client";

const STATE_COOKIE_NAME = "google_oauth_state";
const SESSION_MAX_AGE_SECONDS = AUTH_COOKIE_OPTIONS.maxAge ?? 60 * 60 * 24 * 7;

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  refresh_token?: string;
  id_token?: string;
}

interface GoogleUserInfo {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  email_verified?: boolean;
}

interface UserRecord {
  _id?: ObjectId;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: "customer" | "staff";
  isActive: boolean;
  isAdmin?: number;
  emailVerified: boolean;
  addresses?: Array<{
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    isDefault?: boolean;
  }>;
  password?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
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

function buildRedirectResponse(
  url: string,
  options?: { error?: string; clearState?: boolean }
) {
  const target = new URL(url);
  if (options?.error) {
    target.searchParams.set("error", options.error);
  }
  const response = NextResponse.redirect(target.toString());
  if (options?.clearState) {
    response.cookies.set({
      name: STATE_COOKIE_NAME,
      value: "",
      maxAge: 0,
      path: "/"
    });
  }
  return response;
}

export async function GET(req: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const loginRedirect = `${origin}/login`;

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return buildRedirectResponse(loginRedirect, {
        error: "Google auth disabled",
        clearState: true
      });
    }

    const { searchParams } = req.nextUrl;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const storedState = req.cookies.get(STATE_COOKIE_NAME)?.value;

    if (!code || !state || !storedState || state !== storedState) {
      return buildRedirectResponse(loginRedirect, {
        error: "Invalid Google response",
        clearState: true
      });
    }

    const redirectUri = new URL("/api/auth/google/callback", origin).toString();

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      console.error("Google token exchange failed:", await tokenResponse.text());
      return buildRedirectResponse(loginRedirect, {
        error: "Unable to complete Google login",
        clearState: true
      });
    }

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    if (!profileResponse.ok) {
      console.error("Failed to fetch Google profile:", await profileResponse.text());
      return buildRedirectResponse(loginRedirect, {
        error: "Unable to fetch Google profile",
        clearState: true
      });
    }

    const profile = (await profileResponse.json()) as GoogleUserInfo;
    if (!profile.email) {
      return buildRedirectResponse(loginRedirect, {
        error: "Google account has no email",
        clearState: true
      });
    }

    const db = await connectToDatabase();
    const normalizedEmail = profile.email.trim().toLowerCase();

    let user = await db.collection<UserRecord>("users").findOne({ email: normalizedEmail });

    if (user && !user.isActive) {
      return buildRedirectResponse(loginRedirect, {
        error: "Account is deactivated",
        clearState: true
      });
    }

    const timestamp = new Date().toISOString();
    const avatarUrl = profile.picture ?? "";

    if (!user) {
      const newUser: UserRecord = {
        name: profile.name || "Google User",
        email: normalizedEmail,
        phone: "",
        avatar: avatarUrl,
        role: "customer",
        isAdmin: 0,
        isActive: true,
        addresses: [],
        password: "",
        emailVerified: Boolean(profile.email_verified),
        totalOrders: 0,
        totalSpent: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastLogin: timestamp
      };

      const insertResult = await db.collection("users").insertOne(newUser);
      user = {
        ...newUser,
        _id: insertResult.insertedId
      };
    } else {
      await db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: {
            avatar: avatarUrl || user.avatar || "",
            updatedAt: timestamp,
            lastLogin: timestamp,
            emailVerified: user.emailVerified || Boolean(profile.email_verified)
          }
        }
      );
    }

    const session = await createSession(db, user._id as ObjectId);
    const response = NextResponse.redirect(origin);

    const authToken = await createAuthToken({
      id: (user._id as ObjectId).toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isAdmin: user.isAdmin ?? 0,
      sessionToken: session.token
    });

    response.cookies.set({
      ...AUTH_COOKIE_OPTIONS,
      value: authToken
    });

    response.cookies.set({
      name: STATE_COOKIE_NAME,
      value: "",
      maxAge: 0,
      path: "/"
    });

    return response;
  } catch (error) {
    console.error("Google callback failed:", error);
    return buildRedirectResponse(loginRedirect, {
      error: "Google login failed",
      clearState: true
    });
  }
}
