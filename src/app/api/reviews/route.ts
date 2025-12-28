import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/db/client";

type ReviewPayload = {
  productId?: string;
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

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildExactMatch = (value: string) => new RegExp(`^${escapeRegExp(value)}$`, "i");

export async function GET(request: NextRequest) {
  try {
    const productIdParam = request.nextUrl.searchParams.get("productId")?.trim();
    const comboIdParam = request.nextUrl.searchParams.get("comboId")?.trim();
    const db = await connectToDatabase();

    let targetType: "product" | "combo" | null = null;
    let targetObjectId: ObjectId | null = null;

    if (comboIdParam) {
      targetType = "combo";
      if (ObjectId.isValid(comboIdParam)) {
        targetObjectId = new ObjectId(comboIdParam);
      } else {
        const comboMatch = await db.collection("combo_offers").findOne(
          { slug: buildExactMatch(comboIdParam) },
          { projection: { _id: 1 } }
        );
        targetObjectId = comboMatch?._id ?? null;
        if (!targetObjectId) {
          return NextResponse.json(
            { error: "Combo offer not found" },
            { status: 404 }
          );
        }
      }
    } else if (productIdParam) {
      targetType = "product";
      if (ObjectId.isValid(productIdParam)) {
        targetObjectId = new ObjectId(productIdParam);
      } else {
        const productMatch = await db.collection("products").findOne(
          {
            $or: [
              { slug: buildExactMatch(productIdParam) },
              { sku: buildExactMatch(productIdParam) },
              { barcode: buildExactMatch(productIdParam) },
            ],
          },
          { projection: { _id: 1 } }
        );
        targetObjectId = productMatch?._id ?? null;
        if (!targetObjectId) {
          return NextResponse.json(
            { error: "Product not found" },
            { status: 404 }
          );
        }
      }
    }

    if (!targetType || !targetObjectId) {
      return NextResponse.json(
        { error: "Valid productId or comboId is required" },
        { status: 400 }
      );
    }

    const reviewsCollection = db.collection(
      targetType === "combo" ? "combo_reviews" : "product_reviews"
    );

    const [reviews, stats] = await Promise.all([
      reviewsCollection
        .find({
          [targetType === "combo" ? "comboId" : "productId"]: targetObjectId,
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray(),
      reviewsCollection
        .aggregate([
          {
            $match: {
              [targetType === "combo" ? "comboId" : "productId"]: targetObjectId,
            },
          },
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
          ...(targetType === "combo"
            ? { comboId: review.comboId.toString() }
            : { productId: review.productId.toString() }),
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
    console.error("GET reviews error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReviewPayload;
    const productIdParam = normalizeText(body.productId);
    const comboIdParam = normalizeText(body.comboId);
    const name = normalizeText(body.name);
    const email = normalizeText(body.email);
    const title = normalizeText(body.title);
    const comment = normalizeText(body.comment);
    const rating = parseRating(body.rating);
    const source = normalizeText(body.source);

    const db = await connectToDatabase();
    let targetType: "product" | "combo" | null = null;
    let targetObjectId: ObjectId | null = null;

    if (comboIdParam) {
      targetType = "combo";
      if (ObjectId.isValid(comboIdParam)) {
        targetObjectId = new ObjectId(comboIdParam);
      } else {
        const comboMatch = await db.collection("combo_offers").findOne(
          { slug: buildExactMatch(comboIdParam) },
          { projection: { _id: 1 } }
        );
        targetObjectId = comboMatch?._id ?? null;
        if (!targetObjectId) {
          return NextResponse.json(
            { error: "Combo offer not found" },
            { status: 404 }
          );
        }
      }
    } else if (productIdParam) {
      targetType = "product";
      if (ObjectId.isValid(productIdParam)) {
        targetObjectId = new ObjectId(productIdParam);
      } else {
        const productMatch = await db.collection("products").findOne(
          {
            $or: [
              { slug: buildExactMatch(productIdParam) },
              { sku: buildExactMatch(productIdParam) },
              { barcode: buildExactMatch(productIdParam) },
            ],
          },
          { projection: { _id: 1 } }
        );
        targetObjectId = productMatch?._id ?? null;
        if (!targetObjectId) {
          return NextResponse.json(
            { error: "Product not found" },
            { status: 404 }
          );
        }
      }
    }

    if (!targetType || !targetObjectId) {
      return NextResponse.json(
        { error: "Valid productId or comboId is required" },
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

    const targetCollection = db.collection(
      targetType === "combo" ? "combo_offers" : "products"
    );
    const targetExists = await targetCollection.findOne(
      { _id: targetObjectId },
      { projection: { _id: 1 } }
    );

    if (!targetExists) {
      return NextResponse.json(
        { error: targetType === "combo" ? "Combo offer not found" : "Product not found" },
        { status: 404 }
      );
    }

    const reviewsCollection = db.collection(
      targetType === "combo" ? "combo_reviews" : "product_reviews"
    );
    const resolvedSource = source || targetType;

    const reviewDoc = {
      ...(targetType === "combo"
        ? { comboId: targetObjectId }
        : { productId: targetObjectId }),
      name,
      email: email || undefined,
      rating,
      title: title || undefined,
      comment,
      source: resolvedSource,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertResult = await reviewsCollection.insertOne(reviewDoc);

    const stats = await reviewsCollection
      .aggregate([
        {
          $match: {
            [targetType === "combo" ? "comboId" : "productId"]: targetObjectId,
          },
        },
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

    if (targetType === "combo") {
      await targetCollection.updateOne(
        { _id: targetObjectId },
        {
          $set: {
            rating: averageRating,
            reviewsCount: totalReviews,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      await targetCollection.updateOne(
        { _id: targetObjectId },
        {
          $set: {
            ratings: { averageRating, totalReviews },
            updatedAt: new Date(),
          },
        }
      );
    }

    const resolvedTargetId = targetObjectId.toString();

    return NextResponse.json(
      {
        review: {
          id: insertResult.insertedId.toString(),
          ...(targetType === "combo"
            ? { comboId: resolvedTargetId }
            : { productId: resolvedTargetId }),
          name,
          email: email || undefined,
          rating,
          title: title || undefined,
          comment,
          source: resolvedSource,
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
    console.error("POST reviews error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
