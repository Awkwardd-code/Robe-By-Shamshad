import type { ComponentProps } from "react";
import ProductDetail from "@/components/Product/ProductDetail";
import { connectToDatabase } from "@/db/client";
import { ObjectId } from "mongodb";

export type ProductDetailProps = ComponentProps<typeof ProductDetail>["product"];

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const mapProduct = (apiProduct: Record<string, unknown>): ProductDetailProps => {
  const pricing = apiProduct.pricing as ProductDetailProps["pricing"] | undefined;
  const inventory = apiProduct.inventory as ProductDetailProps["inventory"] | undefined;
  const ratings = apiProduct.ratings as ProductDetailProps["ratings"] | undefined;
  const details = apiProduct.details as ProductDetailProps["details"] | undefined;
  const mediaData = apiProduct.media as ProductDetailProps["media"] | undefined;

  const asString = (value: unknown) => (typeof value === "string" ? value : undefined);
  const asBoolean = (value: unknown) => (typeof value === "boolean" ? value : undefined);
  const asStringArray = (value: unknown) =>
    Array.isArray(value)
      ? (value.filter((item) => typeof item === "string") as string[])
      : [];

  const currentValue = Number(pricing?.current?.value) || 0;
  const originalValue =
    pricing?.original?.value !== undefined ? Number(pricing.original.value) : undefined;
  const stockValue = Number(inventory?.quantity) || 0;

  const normalizedMedia =
    mediaData && (mediaData.thumbnail || mediaData.gallery?.length)
      ? {
          thumbnail: mediaData.thumbnail || "",
          gallery: Array.isArray(mediaData.gallery) ? mediaData.gallery : [],
        }
      : undefined;

  const tasteNotes = asStringArray(apiProduct.tasteNotes);
  const tags = asStringArray(apiProduct.tags);

  return {
    id: String(apiProduct._id),
    slug: asString(apiProduct.slug) || String(apiProduct._id),
    name: asString(apiProduct.name) || "Unknown Product",
    brand: asString(apiProduct.brand),
    category: asString(apiProduct.category),
    subcategory: asString(apiProduct.subcategory),
    sku: asString(apiProduct.sku),
    barcode: asString(apiProduct.barcode),
    description: asString(apiProduct.description),
    summary: asString(apiProduct.summary),
    pricing,
    price: currentValue,
    oldPrice: originalValue,
    unit:
      pricing?.current?.unit ||
      pricing?.original?.unit ||
      ("1 kg" as ProductDetailProps["unit"]),
    inventory,
    stock: stockValue,
    ratings,
    rating: ratings?.averageRating || 0,
    reviewsCount: ratings?.totalReviews || 0,
    media: normalizedMedia,
    image: normalizedMedia?.thumbnail || "/images/placeholder.jpg",
    imageAlt: `${apiProduct.name ?? "Product"} image`,
    gallery:
      normalizedMedia?.gallery?.map((src) => ({
        src,
        alt: `${apiProduct.name ?? "Product"} gallery image`,
      })) || [],
    details,
    categoryName: typeof apiProduct.categoryName === "string" ? apiProduct.categoryName : undefined,
    createdAt: asString(apiProduct.createdAt),
    updatedAt: asString(apiProduct.updatedAt),
    shortDescription:
      asString(apiProduct.summary) || asString(apiProduct.description)?.slice(0, 150),
    badge: asString(apiProduct.badge),
    origin: asString(apiProduct.origin),
    harvestWindow: asString(apiProduct.harvestWindow),
    tasteNotes,
    tags,
    storage: asString(apiProduct.storage),
    isCombo: asBoolean(apiProduct.isCombo),
    validity: apiProduct.validity as ProductDetailProps["validity"],
  };
};

export async function fetchProductBySlug(rawSlug: string) {
  const db = await connectToDatabase();
  const productsCollection = db.collection("products");

  const slug = decodeURIComponent(rawSlug).trim();

  const orMatch: Record<string, unknown>[] = [];

  orMatch.push({ slug });

  if (ObjectId.isValid(slug)) {
    orMatch.push({ _id: new ObjectId(slug) });
  }

  const nameRx = new RegExp(`^${escapeRegex(slug)}$`, "i");
  orMatch.push({ name: nameRx });

  const product = await productsCollection
    .aggregate([
      { $match: { $or: orMatch } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "slug",
          as: "categoryDetails",
        },
      },
      {
        $addFields: {
          categoryDetails: { $arrayElemAt: ["$categoryDetails", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          slug: 1,
          name: 1,
          brand: 1,
          category: 1,
          subcategory: 1,
          sku: 1,
          barcode: 1,
          description: 1,
          summary: 1,
          gender: 1,
          pricing: 1,
          inventory: 1,
          ratings: 1,
          media: 1,
          details: 1,
          categoryName: "$categoryDetails.name",
          badge: 1,
          origin: 1,
          harvestWindow: 1,
          tasteNotes: 1,
          tags: 1,
          storage: 1,
          isCombo: 1,
          validity: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ])
    .next();

  return product as Record<string, unknown> | null;
}
