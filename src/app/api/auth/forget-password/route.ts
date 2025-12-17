/* eslint-disable @typescript-eslint/no-unused-vars */
import crypto from "crypto";
import nodemailer from "nodemailer";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/db/client";

const RESET_TOKEN_LENGTH = 30;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

let emailTransporter: nodemailer.Transporter | null = null;

async function getEmailTransporter() {
  if (emailTransporter) return emailTransporter;

  const host = process.env.EMAIL_SERVER_HOST;
  const port = Number(process.env.EMAIL_SERVER_PORT) || 587;
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error("Email server credentials are not configured");
  }

  emailTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });

  return emailTransporter;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateToken(length: number) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(length);
  let token = "";
  for (let i = 0; i < length; i += 1) {
    token += alphabet[bytes[i] % alphabet.length];
  }
  return token;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const normalizedEmail = normalizeEmail(email);
    const user = await db.collection("users").findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with that email" },
        { status: 404 }
      );
    }

    const token = generateToken(RESET_TOKEN_LENGTH);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const resetLink = `${baseUrl}/reset-password/${token}`;

    await db.collection("passwordResets").deleteMany({ userId: user._id });

    await db.collection("passwordResets").insertOne({
      userId: user._id,
      token,
      expiresAt,
      used: false,
      createdAt: new Date()
    });

    const transporter = await getEmailTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER;
    await transporter.sendMail({
      from: fromAddress,
      to: normalizedEmail,
      subject: "Reset your Robe By Shamshad password",
      text: `Hi ${user.name},

We received a request to reset your password. Use the link below within the next hour. It works only once.
${resetLink}

If you didn't request this change, you can safely ignore this email.`,
      html: `<p>Hi ${user.name},</p>
<p>We received a request to reset your password. Click the button below within the next hour. The link works only once.</p>
<p style="text-align:center;margin:24px 0;">
  <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#059669;color:#fff;border-radius:6px;text-decoration:none;">Reset Password</a>
</p>
<p>If you didn't request this change, you can safely ignore this email.</p>`
    });

    return NextResponse.json({
      message: "Reset link sent"
    });
  } catch (error) {
    console.error("Failed to send reset email:", error);
    return NextResponse.json(
      { error: "Unable to process reset request" },
      { status: 500 }
    );
  }
}
