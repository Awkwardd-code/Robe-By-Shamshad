/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { Db, ObjectId, type Filter, type Sort } from "mongodb";
import { connectToDatabase } from "@/db/client";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";

type FeatureAlign = "left" | "center";
type FeatureIconTone = "primary" | "muted";

interface FeatureRecord {
  _id?: ObjectId;
  title: string;
  description: string;
  imageUrl: string;
  imagePublicId: string;
  href?: string;
  align: FeatureAlign;
  iconTone: FeatureIconTone;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserRecord {
  _id?: ObjectId;
  isAdmin?: number;
}

interface SessionRecord {
  _id: ObjectId;
  token: string;
  userId: ObjectId | string;
  expiresAt?: Date;
}

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseBoolean(value: unknown, fallback: boolean) {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return fallback;
}

function parseNumber(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  const user = await db.collection<UserRecord>("users").findOne({ _id: userId });
  return user;
}

async function requireAdmin(req: NextRequest, db: Db) {
  const user = await getSessionUser(req, db);
  if (!user || !user.isAdmin) return null;
  return user;
}

function serializeFeature(feature: FeatureRecord) {
  return {
    id: feature._id?.toString() ?? "",
    title: feature.title ?? "",
    description: feature.description ?? "",
    imageUrl: feature.imageUrl ?? "",
    imagePublicId: feature.imagePublicId ?? "",
    href: feature.href ?? "",
    align: feature.align ?? "left",
    iconTone: feature.iconTone ?? "primary",
    order: feature.order ?? 0,
    isActive: feature.isActive ?? true,
    createdAt: feature.createdAt,
    updatedAt: feature.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const admin = searchParams.get("admin") === "true";
    const db = await connectToDatabase();

    if (admin) {
      const adminUser = await requireAdmin(req, db);
      if (!adminUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const search = normalizeString(searchParams.get("search"));
    const activeParam = searchParams.get("active");
    const rawPage = parseNumber(searchParams.get("page"), 1);
    const page = Math.max(rawPage, 1);
    const requestedLimit = parseNumber(searchParams.get("limit"), DEFAULT_PAGE_LIMIT);
    const limit = Math.min(Math.max(requestedLimit, 1), MAX_PAGE_LIMIT);
    const skip = Math.max((page - 1) * limit, 0);

    const sortBy = normalizeString(searchParams.get("sortBy")) || "order";
    const sortOrder = normalizeString(searchParams.get("sortOrder")) || "asc";

    const query: Filter<FeatureRecord> = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { href: { $regex: search, $options: "i" } },
      ];
    }

    if (!admin) {
      query.isActive = true;
    } else if (activeParam !== null) {
      query.isActive = activeParam === "true";
    }

    const sort: Sort = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
      updatedAt: -1,
    };

    const collection = db.collection<FeatureRecord>("featuresGrid");
    const totalCount = await collection.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit) || 1;

    const features = await collection
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json(
      {
        features: features.map(serializeFeature),
        totalPages,
        currentPage: page,
        totalCount,
        pageLimit: limit,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Failed to fetch features grid:", error);
    return NextResponse.json(
      { error: "Failed to fetch features grid" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    const adminUser = await requireAdmin(req, db);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;

    const payload: FeatureRecord = {
      title: normalizeString(body.title),
      description: normalizeString(body.description),
      imageUrl: normalizeString(body.imageUrl),
      imagePublicId: normalizeString(body.imagePublicId),
      href: normalizeString(body.href),
      align: body.align === "center" ? "center" : "left",
      iconTone: body.iconTone === "muted" ? "muted" : "primary",
      order: parseNumber(body.order, 0),
      isActive: parseBoolean(body.isActive, true),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const collection = db.collection<FeatureRecord>("featuresGrid");
    const result = await collection.insertOne(payload);
    const created = await collection.findOne({ _id: result.insertedId });

    return NextResponse.json(serializeFeature(created as FeatureRecord), { status: 201 });
  } catch (error: any) {
    console.error("Failed to create feature:", error);
    return NextResponse.json(
      { error: "Failed to create feature" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    const adminUser = await requireAdmin(req, db);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Feature id is required" }, { status: 400 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const updates: Partial<FeatureRecord> = {};

    if (Object.prototype.hasOwnProperty.call(body, "title")) {
      updates.title = normalizeString(body.title);
    }
    if (Object.prototype.hasOwnProperty.call(body, "description")) {
      updates.description = normalizeString(body.description);
    }
    if (Object.prototype.hasOwnProperty.call(body, "href")) {
      updates.href = normalizeString(body.href);
    }
    if (Object.prototype.hasOwnProperty.call(body, "imageUrl")) {
      updates.imageUrl = normalizeString(body.imageUrl);
    }
    if (Object.prototype.hasOwnProperty.call(body, "imagePublicId")) {
      updates.imagePublicId = normalizeString(body.imagePublicId);
    }
    if (Object.prototype.hasOwnProperty.call(body, "align")) {
      updates.align = body.align === "center" ? "center" : "left";
    }
    if (Object.prototype.hasOwnProperty.call(body, "iconTone")) {
      updates.iconTone = body.iconTone === "muted" ? "muted" : "primary";
    }
    if (Object.prototype.hasOwnProperty.call(body, "order")) {
      updates.order = parseNumber(body.order, 0);
    }
    if (Object.prototype.hasOwnProperty.call(body, "isActive")) {
      updates.isActive = parseBoolean(body.isActive, true);
    }
    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "No update fields provided" }, { status: 400 });
    }

    updates.updatedAt = new Date().toISOString();

    const collection = db.collection<FeatureRecord>("featuresGrid");
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }

    const updated = await collection.findOne({ _id: new ObjectId(id) });
    return NextResponse.json(serializeFeature(updated as FeatureRecord), { status: 200 });
  } catch (error: any) {
    console.error("Failed to update feature:", error);
    return NextResponse.json(
      { error: "Failed to update feature" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    const adminUser = await requireAdmin(req, db);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Feature id is required" }, { status: 400 });
    }

    const collection = db.collection<FeatureRecord>("featuresGrid");
    const existing = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }

    await collection.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete feature:", error);
    return NextResponse.json(
      { error: "Failed to delete feature" },
      { status: 500 }
    );
  }
}
