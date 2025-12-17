import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

const STATE_COOKIE_NAME = "google_oauth_state";
const STATE_MAX_AGE_SECONDS = 600;

export async function GET(req: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Google OAuth is not configured" },
        { status: 500 }
      );
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const redirectUri = new URL("/api/auth/google/callback", origin).toString();

    const state = crypto.randomBytes(16).toString("hex");
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set({
      name: STATE_COOKIE_NAME,
      value: state,
      maxAge: STATE_MAX_AGE_SECONDS,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });

    return response;
  } catch (error) {
    console.error("Failed to initiate Google auth:", error);
    return NextResponse.json(
      { error: "Unable to start Google login" },
      { status: 500 }
    );
  }
}
