import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/db/client";

type ReviewPayload = {
  comboId?: string;
  name?: string;
  email?: string;
  rating?: number;
  title?: string;
  comment?: string;
  source?: string;
};

const parseRating = (value: unknown) => {
  const rating = Number(value);
  if (!Number.isFinite(rating)) return null;
  const rounded = Math.round(rating);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
};

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export async function GET(request: NextRequest) {
  try {
    const comboId = request.nextUrl.searchParams.get("comboId")?.trim();
    if (!comboId || !ObjectId.isValid(comboId)) {
      return NextResponse.json(
        { error: "Valid comboId is required" },
        { status: 400 }
      );
    }

    const comboObjectId = new ObjectId(comboId);
    const db = await connectToDatabase();
    const reviewsCollection = db.collection("combo_reviews");

    const [reviews, stats] = await Promise.all([
      reviewsCollection
        .find({ comboId: comboObjectId })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray(),
      reviewsCollection
        .aggregate([
          { $match: { comboId: comboObjectId } },
          {
            $group: {
              _id: null,
              averageRating: { $avg: "$rating" },
              totalReviews: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]);

    const statsRow = stats[0] ?? { averageRating: 0, totalReviews: 0 };

    return NextResponse.json(
      {
        reviews: reviews.map((review) => ({
          id: review._id.toString(),
          comboId: review.comboId.toString(),
          name: review.name,
          email: review.email,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          source: review.source,
          createdAt: review.createdAt,
        })),
        stats: {
          averageRating: Number(statsRow.averageRating ?? 0),
          totalReviews: Number(statsRow.totalReviews ?? 0),
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load reviews";
    console.error("GET combo reviews error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReviewPayload;
    const comboId = normalizeText(body.comboId);
    const name = normalizeText(body.name);
    const email = normalizeText(body.email);
    const title = normalizeText(body.title);
    const comment = normalizeText(body.comment);
    const rating = parseRating(body.rating);
    const source = normalizeText(body.source) || "combo_offer";

    if (!comboId || !ObjectId.isValid(comboId)) {
      return NextResponse.json(
        { error: "Valid comboId is required" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!comment) {
      return NextResponse.json(
        { error: "Review comment is required" },
        { status: 400 }
      );
    }

    if (!rating) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const comboCollection = db.collection("combo_offers");
    const reviewsCollection = db.collection("combo_reviews");
    const comboObjectId = new ObjectId(comboId);

    const comboExists = await comboCollection.findOne(
      { _id: comboObjectId },
      { projection: { _id: 1 } }
    );

    if (!comboExists) {
      return NextResponse.json(
        { error: "Combo offer not found" },
        { status: 404 }
      );
    }

    const reviewDoc = {
      comboId: comboObjectId,
      name,
      email: email || undefined,
      rating,
      title: title || undefined,
      comment,
      source,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertResult = await reviewsCollection.insertOne(reviewDoc);

    const stats = await reviewsCollection
      .aggregate([
        { $match: { comboId: comboObjectId } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const statsRow = stats[0] ?? { averageRating: 0, totalReviews: 0 };
    const averageRating = Number(statsRow.averageRating ?? 0);
    const totalReviews = Number(statsRow.totalReviews ?? 0);

    await comboCollection.updateOne(
      { _id: comboObjectId },
      {
        $set: {
          rating: averageRating,
          reviewsCount: totalReviews,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json(
      {
        review: {
          id: insertResult.insertedId.toString(),
          comboId,
          name,
          email: email || undefined,
          rating,
          title: title || undefined,
          comment,
          source,
          createdAt: reviewDoc.createdAt,
        },
        stats: {
          averageRating,
          totalReviews,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to submit review";
    console.error("POST combo reviews error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
