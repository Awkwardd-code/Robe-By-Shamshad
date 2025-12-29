import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/db/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid seasonal collection ID" },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const seasonalCollection = db.collection("seasonalCollections");

    const entry = await seasonalCollection.findOne({ _id: new ObjectId(id) });

    if (!entry) {
      return NextResponse.json(
        { error: "Seasonal collection entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(entry, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch seasonal collection";
    console.error("GET seasonal collection entry error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid seasonal collection ID" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as SeasonalCollectionRequestBody;
    const title = asString(body.title);
    const description = asString(body.description);
    const offer = asString(body.offer);
    const offerDescription = asString(body.offerDescription);
    const imageUrl = asString(body.image?.url);
    const imagePublicId = asString(body.image?.publicId);

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    if (!offer) {
      return NextResponse.json({ error: "Offer is required" }, { status: 400 });
    }

    const db = await connectToDatabase();
    const seasonalCollection = db.collection("seasonalCollections");

    const existing = await seasonalCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Seasonal collection entry not found" },
        { status: 404 }
      );
    }

    const resolvedImageUrl = imageUrl || existing.image?.url || "";
    if (!resolvedImageUrl) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const updateData = {
      title,
      description,
      offer,
      offerDescription,
      image: {
        url: resolvedImageUrl,
        publicId: imagePublicId || existing.image?.publicId || null,
      },
      updatedAt: new Date(),
    };

    const result = await seasonalCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Seasonal collection entry not found" },
        { status: 404 }
      );
    }

    const updatedEntry = await seasonalCollection.findOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json(updatedEntry, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update seasonal collection";
    console.error("PUT seasonal collection entry error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid seasonal collection ID" },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const seasonalCollection = db.collection("seasonalCollections");

    const existing = await seasonalCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Seasonal collection entry not found" },
        { status: 404 }
      );
    }

    const result = await seasonalCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Seasonal collection entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Seasonal collection entry deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete seasonal collection";
    console.error("DELETE seasonal collection entry error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
