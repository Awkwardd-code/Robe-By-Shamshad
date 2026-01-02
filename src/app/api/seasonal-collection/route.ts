import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/db/client";

const DEFAULT_PAGE_LIMIT = 10;
const MAX_PAGE_LIMIT = 50;

type SeasonalImage = {
  url?: string;
  publicId?: string;
};

interface SeasonalCollectionRequestBody {
  title?: string;
  description?: string;
  offer?: string;
  offerDescription?: string;
  image?: SeasonalImage;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      MAX_PAGE_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") || `${DEFAULT_PAGE_LIMIT}`, 10))
    );
    const searchTerm = asString(searchParams.get("search"));

    const db = await connectToDatabase();
    const seasonalCollection = db.collection("seasonalCollections");

    const query: Record<string, unknown> = {};
    if (searchTerm) {
      const regex = { $regex: escapeRegExp(searchTerm), $options: "i" };
      query.$or = [
        { title: regex },
        { description: regex },
        { offer: regex },
        { offerDescription: regex },
      ];
    }

    const totalCount = await seasonalCollection.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const skip = (page - 1) * limit;

    const seasonalCollections = await seasonalCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json(
      {
        seasonalCollections,
        totalPages,
        currentPage: page,
        totalCount,
        pageLimit: limit,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch seasonal collection";
    console.error("GET seasonal collection error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SeasonalCollectionRequestBody;
    const title = asString(body.title);
    const description = asString(body.description);
    const offer = asString(body.offer);
    const offerDescription = asString(body.offerDescription);
    const imageUrl = asString(body.image?.url);
    const imagePublicId = asString(body.image?.publicId);




    if (!imageUrl) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const db = await connectToDatabase();
    const seasonalCollection = db.collection("seasonalCollections");

    const now = new Date();
    const newSeasonalEntry = {
      title,
      description,
      offer,
      offerDescription,
      image: {
        url: imageUrl,
        publicId: imagePublicId || null,
      },
      createdAt: now,
      updatedAt: now,
    };

    const result = await seasonalCollection.insertOne(newSeasonalEntry);
    const createdEntry = await seasonalCollection.findOne({
      _id: result.insertedId,
    });

    return NextResponse.json(createdEntry, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create seasonal collection";
    console.error("POST seasonal collection error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
