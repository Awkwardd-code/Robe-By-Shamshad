import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS, verifyAuthToken } from "@/lib/auth-token";
import { Db } from "mongodb";
import { connectToDatabase } from "@/db/client";

async function clearSession(db: Db, token: string) {
  await db.collection("sessions").deleteOne({ token });
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    const sessionToken = payload?.sessionToken;
    const response = NextResponse.json({ success: true });

    response.cookies.set({
      ...AUTH_COOKIE_OPTIONS,
      value: "",
      maxAge: 0
    });

    if (sessionToken) {
      const db = await connectToDatabase();
      await clearSession(db, sessionToken);
    }

    return response;
  } catch (error) {
    console.error("Logout failed:", error);
    return NextResponse.json({ error: "Unable to logout" }, { status: 500 });
  }
}
