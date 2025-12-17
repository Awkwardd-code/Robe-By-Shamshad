/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/db/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const parsedParams = await params;
    const slug = parsedParams?.slug;
    if (!slug) {
      return NextResponse.json(
        { error: "Missing collection slug" },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collectionsCollection = db.collection("collections");

    const collection = await collectionsCollection
      .aggregate([
        { $match: { slug } },
        { $limit: 1 },
        {
          $lookup: {
            from: "products",
            let: {
              productIds: {
                $map: {
                  input: {
                    $filter: {
                      input: "$collections",
                      as: "item",
                      cond: { $eq: ["$$item.type", "product"] },
                    },
                  },
                  as: "product",
                  in: "$$product.refId",
                },
              },
            },
            pipeline: [
              { $match: { $expr: { $in: ["$_id", "$$productIds"] } } },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  brand: 1,
                  category: 1,
                  pricing: 1,
                  inventory: 1,
                  media: 1,
                  slug: 1,
                  tags: 1,
                  details: 1,
                  summary: 1,
                  description: 1,
                  ratings: 1,
                  gender: 1,
                  isNew: 1,
                  isBestseller: 1,
                },
              },
            ],
            as: "productDetails",
          },
        },
        {
          $lookup: {
            from: "combo_offers",
            let: {
              comboIds: {
                $map: {
                  input: {
                    $filter: {
                      input: "$collections",
                      as: "item",
                      cond: { $eq: ["$$item.type", "combo"] },
                    },
                  },
                  as: "combo",
                  in: "$$combo.refId",
                },
              },
            },
            pipeline: [
              { $match: { $expr: { $in: ["$_id", "$$comboIds"] } } },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  description: 1,
                  summary: 1,
                  slug: 1,
                  pricing: 1,
                  thumbnail: 1,
                  tags: 1,
                  inventory: 1,
                  media: 1,
                  details: 1,
                  ratings: 1,
                  isNew: 1,
                  isBestseller: 1,
                },
              },
            ],
            as: "comboDetails",
          },
        },
        {
          $addFields: {
            collections: {
              $map: {
                input: "$collections",
                as: "item",
                in: {
                  $mergeObjects: [
                    "$$item",
                    {
                      $cond: {
                        if: { $eq: ["$$item.type", "product"] },
                        then: {
                          product: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$productDetails",
                                  as: "productDetail",
                                  cond: {
                                    $eq: ["$$productDetail._id", "$$item.refId"],
                                  },
                                },
                              },
                              0,
                            ],
                          },
                        },
                        else: {
                          combo: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$comboDetails",
                                  as: "comboDetail",
                                  cond: {
                                    $eq: [
                                      "$$comboDetail._id",
                                      "$$item.refId",
                                    ],
                                  },
                                },
                              },
                              0,
                            ],
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            bannerImage: 1,
            bannerTitle: 1,
            bannerDescription: 1,
            slug: 1,
            brandImage: 1,
            tags: 1,
            collections: 1,
            status: 1,
            featured: 1,
            visibility: 1,
            sortOrder: 1,
            scheduledDate: 1,
            views: 1,
            clicks: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ])
      .next();

    if (!collection) {
      return NextResponse.json(
        { type: "not_found", message: "Collection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ type: "collection", data: collection }, { status: 200 });
  } catch (error: any) {
    console.error("GET product-data error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch collection data" },
      { status: 500 }
    );
  }
}
