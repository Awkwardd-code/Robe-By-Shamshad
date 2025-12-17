import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/db/client";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string" || token.length < 10) {
      return NextResponse.json(
        { error: "Invalid or missing token" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const resetRecord = await db.collection("passwordResets").findOne({
      token,
      used: false
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: "Reset link is invalid or already used" },
        { status: 400 }
      );
    }

    if (resetRecord.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Reset link has expired" },
        { status: 410 }
      );
    }

    const userId = resetRecord.userId as ObjectId;

    await db.collection("users").updateOne(
      { _id: userId },
      {
        $set: {
          password,
          updatedAt: new Date().toISOString()
        }
      }
    );

    await db.collection("passwordResets").updateOne(
      { _id: resetRecord._id },
      { $set: { used: true, usedAt: new Date() } }
    );

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Failed to reset password:", error);
    return NextResponse.json(
      { error: "Unable to reset password" },
      { status: 500 }
    );
  }
}
