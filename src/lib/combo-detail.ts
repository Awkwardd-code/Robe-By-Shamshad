import { connectToDatabase } from "@/db/client";
import { ObjectId } from "mongodb";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function fetchComboOfferBySlug(rawSlug: string) {
  const db = await connectToDatabase();
  const comboOffersCollection = db.collection("combo_offers");

  const slugParam = safeDecodeURIComponent(String(rawSlug ?? "")).trim();
  if (!slugParam) return null;

  const slugExactRx = new RegExp(`^${escapeRegExp(slugParam)}$`, "i");
  const slugLooseRx = new RegExp(escapeRegExp(slugParam), "i");

  const slugMatch: Record<string, unknown>[] = [{ slug: slugExactRx }, { slug: slugLooseRx }];
  if (ObjectId.isValid(slugParam)) {
    slugMatch.push({ _id: new ObjectId(slugParam) });
  }

  const offer = await comboOffersCollection
    .aggregate([
      { $match: { $or: slugMatch } },
      {
        $lookup: {
          from: "products",
          let: {
            productIds: {
              $map: { input: "$products", as: "p", in: "$$p.productId" },
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
                description: 1,
              },
            },
          ],
          as: "productDetails",
        },
      },
      {
        $addFields: {
          products: {
            $map: {
              input: "$products",
              as: "comboProduct",
              in: {
                $mergeObjects: [
                  "$$comboProduct",
                  {
                    product: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$productDetails",
                            as: "pd",
                            cond: { $eq: ["$$pd._id", "$$comboProduct.productId"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          },
          "inventory.remaining": {
            $subtract: ["$inventory.totalStock", "$inventory.soldCount"],
          },
          savings: {
            $subtract: ["$pricing.originalTotal", "$pricing.discountedPrice"],
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          slug: 1,
          products: 1,
          pricing: 1,
          inventory: 1,
          validity: 1,
          tags: 1,
          features: 1,
          thumbnail: 1,
          gallery: 1,
          delivery: 1,
          createdAt: 1,
          updatedAt: 1,
          savings: 1,
        },
      },
      { $limit: 1 },
    ])
    .next();

  return offer ?? null;
}
