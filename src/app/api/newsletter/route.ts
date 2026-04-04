import nodemailer from "nodemailer";
import { NextRequest, NextResponse } from "next/server";
import { Db, ObjectId, type Filter } from "mongodb";
import { connectToDatabase } from "@/db/client";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";

interface NewsletterSubscriberRecord {
  _id?: ObjectId;
  name: string;
  email: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionRecord {
  _id: ObjectId;
  token: string;
  userId: ObjectId | string;
  expiresAt?: Date;
}

interface UserRecord {
  _id?: ObjectId;
  isAdmin?: number;
}

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;
const HARD_CODED_ADMIN_EMAIL = "shamshad.robe@gmail.com";

let emailTransporter: nodemailer.Transporter | null = null;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeSource(source: unknown) {
  if (typeof source !== "string") return "preview-masterclass";
  const trimmed = source.trim().toLowerCase();
  return trimmed || "preview-masterclass";
}

function normalizeSourceFilter(source: unknown) {
  if (typeof source !== "string") return "";
  const trimmed = source.trim().toLowerCase();
  return trimmed;
}

function isValidEmail(email: string) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

function parsePageParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toIsoDate(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

function getAdminRecipient() {
  return HARD_CODED_ADMIN_EMAIL;
}

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
    auth: { user, pass },
  });

  return emailTransporter;
}

async function sendAdminNotificationEmail(payload: {
  name: string;
  email: string;
  source: string;
  createdAt: Date;
}) {
  const adminRecipient = getAdminRecipient();
  if (!adminRecipient) {
    console.warn("Newsletter admin recipient is not configured.");
    return false;
  }

  const transporter = await getEmailTransporter();
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER;

  await transporter.sendMail({
    from: fromAddress,
    to: adminRecipient,
    subject: "New Preview Enrollment Received",
    text: `A new preview enrollment has been submitted.

Name: ${payload.name}
Email: ${payload.email}
Source: ${payload.source}
Time: ${payload.createdAt.toISOString()}`,
    html: `<p>A new preview enrollment has been submitted.</p>
<p><strong>Name:</strong> ${payload.name}</p>
<p><strong>Email:</strong> ${payload.email}</p>
<p><strong>Source:</strong> ${payload.source}</p>
<p><strong>Time:</strong> ${payload.createdAt.toISOString()}</p>`,
  });

  return true;
}

async function getSessionUser(req: NextRequest, db: Db) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyAuthToken(token);
  if (!payload?.sessionToken) return null;

  const session = await db
    .collection<SessionRecord>("sessions")
    .findOne({ token: payload.sessionToken });
  if (!session) return null;

  if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
    await db.collection("sessions").deleteOne({ _id: session._id });
    return null;
  }

  const userId =
    typeof session.userId === "string" ? new ObjectId(session.userId) : session.userId;
  return db.collection<UserRecord>("users").findOne({ _id: userId });
}

async function requireAdmin(req: NextRequest, db: Db) {
  const user = await getSessionUser(req, db);
  if (!user || !user.isAdmin) return null;
  return user;
}

async function getSubscriberCollection(db: Db) {
  const collection = db.collection<NewsletterSubscriberRecord>("newsletterSubscribers");
  await Promise.allSettled([
    collection.createIndex({ email: 1 }, { unique: true }),
    collection.createIndex({ createdAt: -1 }),
  ]);
  return collection;
}

function serializeSubscriber(subscriber: NewsletterSubscriberRecord) {
  return {
    _id: subscriber._id?.toString() ?? "",
    name: subscriber.name,
    email: subscriber.email,
    source: subscriber.source,
    createdAt: toIsoDate(subscriber.createdAt),
    updatedAt: toIsoDate(subscriber.updatedAt),
  };
}

export async function GET(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    const adminUser = await requireAdmin(req, db);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parsePageParam(searchParams.get("page"), 1);
    const requestedLimit = parsePageParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT);
    const limit = Math.min(Math.max(requestedLimit, 1), MAX_PAGE_LIMIT);
    const skip = (page - 1) * limit;
    const search = (searchParams.get("search") || "").trim();
    const source = normalizeSourceFilter(searchParams.get("source"));

    const collection = await getSubscriberCollection(db);
    const query: Filter<NewsletterSubscriberRecord> = {};

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
        { source: { $regex: safeSearch, $options: "i" } },
      ];
    }

    if (source && source !== "all") {
      query.source = source;
    }

    const totalCount = await collection.countDocuments(query);
    const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [newInLast7Days, newInLast24Hours] = await Promise.all([
      collection.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      collection.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } }),
    ]);

    const subscribers = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      subscribers: subscribers.map(serializeSubscriber),
      totalCount,
      totalPages,
      page,
      pageSize: limit,
      filters: {
        search,
        source: source || "all",
      },
      stats: {
        newInLast7Days,
        newInLast24Hours,
      },
    });
  } catch (error) {
    console.error("Failed to fetch newsletter subscribers:", error);
    return NextResponse.json(
      { error: "Failed to fetch newsletter subscribers" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? normalizeName(body.name) : "";
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const source = normalizeSource(body.source);

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Please provide a valid name." },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = await getSubscriberCollection(db);

    const existingSubscriber = await collection.findOne({ email });
    if (existingSubscriber) {
      return NextResponse.json(
        { error: "This email is already enrolled." },
        { status: 409 }
      );
    }

    const now = new Date();
    const newSubscriber: NewsletterSubscriberRecord = {
      name,
      email,
      source,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const result = await collection.insertOne(newSubscriber);
      newSubscriber._id = result.insertedId;
    } catch (error) {
      const maybeDuplicate = error as { code?: number };
      if (maybeDuplicate?.code === 11000) {
        return NextResponse.json(
          { error: "This email is already enrolled." },
          { status: 409 }
        );
      }
      throw error;
    }

    let adminEmailSent = false;
    try {
      adminEmailSent = await sendAdminNotificationEmail({
        name,
        email,
        source,
        createdAt: now,
      });
    } catch (emailError) {
      console.error("Failed to send newsletter admin notification:", emailError);
    }

    return NextResponse.json(
      {
        message: adminEmailSent
          ? "Enrollment submitted successfully."
          : "Enrollment submitted. Admin notification email was not sent.",
        subscriber: serializeSubscriber(newSubscriber),
        adminEmailSent,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to submit newsletter enrollment:", error);
    return NextResponse.json(
      { error: "Unable to submit enrollment right now. Please try again." },
      { status: 500 }
    );
  }
}
