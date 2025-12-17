/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ComponentProps } from "react";
import ComboOfferDetail, {
  type ComboGalleryItem,
} from "@/components/ComboOffer/ComboOfferDetail";

type DeliveryInfo = {
  isFree?: boolean;
  charge?: number | string | null;
  message?: string | null;
};

type NormalizedDelivery = {
  isFree: boolean;
  charge: number;
  message: string;
};

type RawComboOffer = Record<string, any>;

const parseDeliveryCharge = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const normalizeDeliveryData = (
  delivery: DeliveryInfo | undefined,
  currency: string
): NormalizedDelivery | undefined => {
  if (!delivery) return undefined;

  const parsedCharge = parseDeliveryCharge(delivery.charge);

  return {
    isFree: Boolean(delivery.isFree),
    charge: parsedCharge,
    message:
      delivery.message ||
      (delivery.isFree ? "Free Delivery" : `Delivery Charge: ${parsedCharge} ${currency}`),
  };
};

const resolveDeliveryCharge = (
  delivery?: NormalizedDelivery
): number | undefined => {
  if (!delivery) return undefined;
  const chargeValue = delivery.charge ?? 0;
  return delivery.isFree ? 0 : chargeValue;
};

const getImagePath = (imagePath?: string) => {
  if (!imagePath) return "/images/combo-placeholder.jpg";
  if (imagePath.startsWith("http")) return imagePath;
  if (imagePath.startsWith("/")) return imagePath;
  return `/images/${imagePath}`;
};

const sanitizeString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
};

export type ComboOfferDetailProps = ComponentProps<
  typeof ComboOfferDetail
>["comboOffer"];

export const mapComboOffer = (offer: RawComboOffer): ComboOfferDetailProps => {
  const currency = sanitizeString(offer?.pricing?.currency) || "BDT";
  const thumbnail = getImagePath(offer?.thumbnail);
  const gallery: ComboGalleryItem[] =
    Array.isArray(offer?.gallery) && offer.gallery.length > 0
      ? offer.gallery.map((src: string) => ({
          src: getImagePath(src),
          alt: `${offer?.name ?? "Combo"} combo`,
        }))
      : [{ src: thumbnail, alt: `${offer?.name ?? "Combo"} combo` }];

  const delivery = normalizeDeliveryData(offer?.delivery, currency);
  const deliveryCharge = resolveDeliveryCharge(delivery);

  const inventoryStatusRaw = sanitizeString(offer?.inventory?.status) || "inactive";
  const inventoryStatus =
    inventoryStatusRaw === "active" || inventoryStatusRaw === "sold_out"
      ? (inventoryStatusRaw as ComboOfferDetailProps["inventory"]["status"])
      : "inactive";

  const validity = offer?.validity ?? {};
  const startDate = new Date(validity?.startDate).getTime();
  const endDate = new Date(validity?.endDate).getTime();
  const now = Date.now();
  const validityIsActive =
    !Number.isNaN(startDate) && !Number.isNaN(endDate) && startDate <= now && now <= endDate;

  const mappedOffer = {
    id: sanitizeString(offer?._id ?? ""),
    _id: sanitizeString(offer?._id ?? ""),
    name: sanitizeString(offer?.name ?? "Unknown Combo"),
    description: sanitizeString(offer?.description ?? ""),
    slug: sanitizeString(offer?.slug ?? ""),
    thumbnail,
    gallery,
    pricing: {
      originalTotal: Number(offer?.pricing?.originalTotal) || 0,
      discountedPrice: Number(offer?.pricing?.discountedPrice) || 0,
      discountPercentage: Number(offer?.pricing?.discountPercentage) || 0,
      currency,
    },
    products: Array.isArray(offer?.products)
      ? offer.products.map((p: any) => ({
          productId: sanitizeString(p?.productId ?? ""),
          quantity: Number(p?.quantity) || 1,
          product: p?.product
            ? {
                id: p.product.id ? sanitizeString(p.product.id) : undefined,
                _id: p.product._id ? sanitizeString(p.product._id) : undefined,
                name: p.product.name,
                slug: p.product.slug,
                image: p.product?.media?.thumbnail,
                price:
                  typeof p.product?.pricing?.current?.value === "number"
                    ? p.product.pricing.current.value
                    : undefined,
                oldPrice:
                  typeof p.product?.pricing?.original?.value === "number"
                    ? p.product.pricing.original.value
                    : undefined,
                category: p.product.category,
                description: p.product.description,
              }
            : undefined,
        }))
      : [],
    inventory: {
      totalStock: Number(offer?.inventory?.totalStock) || 0,
      soldCount: Number(offer?.inventory?.soldCount) || 0,
      status: inventoryStatus,
    },
    validity: {
      startDate: sanitizeString(validity?.startDate ?? ""),
      endDate: sanitizeString(validity?.endDate ?? ""),
      isActive: validityIsActive,
    },
    tags: Array.isArray(offer?.tags) ? offer.tags : [],
    features: Array.isArray(offer?.features) ? offer.features : [],
    createdAt: sanitizeString(offer?.createdAt ?? ""),
    updatedAt: sanitizeString(offer?.updatedAt ?? ""),
    delivery,
    deliveryCharge,
  };

  return mappedOffer;
};
