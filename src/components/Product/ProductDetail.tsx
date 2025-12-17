/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  Star,
  Share2,
  Heart,
  Shield,
  Truck,
  RotateCcw,
  Package,
  Zap,
  Percent,
  Gift,
  ZoomIn,
  Scale,
  Move,
} from "lucide-react";
import { useCommerce } from "@/context/CommerceContext";
import { useBuyNow } from "@/context/BuyNowContext";

// Extended Product interface for compatibility with API + existing UI needs
type DeliveryInfo = {
  isFree?: boolean;
  charge?: number | string;
  message?: string;
};

interface Product {
  // Core identifiers
  id: string; // maps to Mongo _id
  name: string;
  slug: string;

  // Backend fields (from Product model)
  brand?: string;
  category?: string; // slug
  subcategory?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  summary?: string;

  pricing?: {
    current: { currency: string; value: number; unit: string };
    original: { currency: string; value: number; unit: string };
    discountPercentage: number;
  };

  inventory?: {
    quantity: number;
    threshold: number;
    status: "in_stock" | "low_stock" | "out_of_stock" | string;
  };

  ratings?: {
    averageRating: number;
    totalReviews: number;
  };

  media?: {
    thumbnail: string;
    gallery: string[];
  };

  details?: {
    ingredients: string[];
    features: string[];
    usage: string;
    benefits: string[];
    warnings: string;
    certifications: string[];
  };

  createdAt?: string;
  updatedAt?: string;
  categoryName?: string; // added by API layer

  delivery?: DeliveryInfo;

  // UI-friendly / derived fields used by this component
  price: number; // usually pricing.current.value
  oldPrice?: number; // usually pricing.original.value
  image: string; // usually media.thumbnail
  imageAlt?: string;

  // Stock & rating shortcuts used in UI
  stock?: number; // usually inventory.quantity
  rating?: number; // usually ratings.averageRating
  reviewsCount?: number; // usually ratings.totalReviews

  // Additional UI fields used only on frontend
  unit?: string; // from pricing.current.unit
  shortDescription?: string;
  badge?: string;
  gallery?: { src: string; alt: string }[]; // UI gallery objects derived from media.gallery
  origin?: string;
  harvestWindow?: string;
  tasteNotes?: string[];
  tags?: string[];
  storage?: string;
  isCombo?: boolean;
  validity?: {
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  };
}

const currencyFormatter = new Intl.NumberFormat("bn-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

// Calculate savings percentage
const calculateDiscount = (price: number, oldPrice?: number) => {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
};

// Get status badge color
const getStatusColor = (stock?: number) => {
  if (!stock || stock <= 0)
    return "bg-red-100 text-red-800 border-red-200";
  if (stock < 10)
    return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-green-100 text-green-800 border-green-200";
};

// Get status text
const getStatusText = (stock?: number) => {
  if (!stock || stock <= 0) return "Sold Out";
  if (stock < 10) return "Low Stock";
  return "In Stock";
};

// Format date
const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Get price unit from product (with fallback)
const getPriceUnit = (product: Product): string => {
  // Try to get unit from pricing object first
  if (product.pricing?.current?.unit) {
    return product.pricing.current.unit;
  }
  if (product.pricing?.original?.unit) {
    return product.pricing.original.unit;
  }
  // Fallback to unit field
  if (product.unit) {
    return product.unit;
  }
  // Default fallback
  return '1 kg';
};

const parseDeliveryCharge = (value?: number | string): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeDelivery = (delivery?: DeliveryInfo) => {
  if (!delivery) return undefined;
  const parsedCharge = parseDeliveryCharge(delivery.charge);
  const isFree = Boolean(delivery.isFree);
  return {
    isFree,
    charge: parsedCharge,
    message:
      delivery.message ??
      (isFree ? "Free Delivery" : `Delivery Charge: ${parsedCharge}`),
  };
};

function ProductDetailContent({ product }: { product: Product }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [showZoom, setShowZoom] = useState(false);
  const [showZoomPanel, setShowZoomPanel] = useState(false);
  const [isZoomActive, setIsZoomActive] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchDistance, setTouchDistance] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [zoomScale, setZoomScale] = useState(2);
  const [tab, setTab] = useState<"description" | "details" | "reviews">(
    "description"
  );
  const imageRef = useRef<HTMLDivElement>(null);
  const zoomTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { startSuperiorCheckout, toggleWishlist, isInWishlist, isInCart } =
    useCommerce();
  const { registerProductSelection } = useBuyNow();

  // Category name resolved from:
  // 1. product.categoryName (if provided)
  // 2. /api/categories?slug=<product.category> (Mongo)
  // 3. fallback to the raw category slug
  const [resolvedCategoryName, setResolvedCategoryName] = useState<
    string | null
  >(product.categoryName ?? null);

  const gallery = useMemo(
    () =>
      product.gallery?.length
        ? product.gallery
        : [{ src: product.image, alt: product.imageAlt || product.name }],
    [product]
  );

  const categoryHref = product.category
    ? `/collections/${product.category}`
    : "/products";
  const categoryLabel =
    resolvedCategoryName ?? product.category ?? "Uncategorized";

  const safeIndex = useMemo(
    () => Math.min(activeIndex, Math.max(gallery.length - 1, 0)),
    [activeIndex, gallery.length]
  );
  const currentImage = gallery[safeIndex] ?? gallery[0];
  const clampIndex = (value: number) =>
    Math.max(0, Math.min(value, Math.max(gallery.length - 1, 0)));
  const ratingValue = Number(
    product.rating ?? product.ratings?.averageRating ?? 0
  );
  const roundedRating = Math.round(ratingValue);
  const ratingLabel = ratingValue ? ratingValue.toFixed(1) : "0.0";
  const reviewsLabel = product.reviewsCount ?? product.ratings?.totalReviews ?? 0;
  const inStock = (product.stock || product.inventory?.quantity || 0) > 0;
  const badgeLabelMap: Record<string, string> = {
    new: "New Arrival",
    bestseller: "Best Seller",
    limited: "Limited Edition",
    trending: "Trending Now",
    organic: "Organic Certified",
    premium: "Premium Quality",
  };
  const badgeText = product.badge
    ? badgeLabelMap[product.badge] ?? product.badge
    : null;
  const discountPercent = calculateDiscount(product.price, product.oldPrice);
  const maxQty = inStock
    ? product.stock || product.inventory?.quantity || 1
    : 1;
  const statusText = getStatusText(
    product.stock ?? product.inventory?.quantity
  );
  const statusColor = getStatusColor(
    product.stock ?? product.inventory?.quantity
  );
  const savings = product.oldPrice ? product.oldPrice - product.price : 0;
  // Get price unit
  const priceUnit = getPriceUnit(product);

  const cartProduct = useMemo(() => {
    const normalizedDelivery = normalizeDelivery(product.delivery);
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      slug: product.slug,
      oldPrice: product.oldPrice ?? product.price,
      description: product.summary ?? product.description,
      shortDescription: product.shortDescription ?? product.summary,
      category: product.category,
      delivery: normalizedDelivery,
      deliveryCharge: normalizedDelivery?.charge,
    };
  }, [product]);
  const isProductWishlisted = isInWishlist(cartProduct.id);
  const productIsInCart = isInCart(product.id);
  const canAddToCart = inStock && !productIsInCart;
  const addToCartButtonClass = `group cursor-pointer flex-1 flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
    canAddToCart
      ? "bg-linear-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl"
      : "bg-gray-100 text-gray-400 cursor-not-allowed"
  }`;
  const addToCartButtonLabel = productIsInCart
    ? "In Cart"
    : inStock
    ? "Add to Cart"
    : "Sold Out";
  const shareDiscountSuffix = discountPercent
    ? ` - Save ${discountPercent}%`
    : "";
  const shareProductMessage = `Check out ${product.name} on Robe By Shamshad${shareDiscountSuffix}!`;
  const displayQty = Math.min(qty, maxQty);
  const handleBuyNow = () => {
    if (!inStock) return;
    const quantity = displayQty;
    registerProductSelection(cartProduct, quantity);
    startSuperiorCheckout(cartProduct, quantity);
    router.push("/checkout");
  };
  const clampQty = (value: number) => Math.max(1, Math.min(value, maxQty));
  const adjustQty = (delta: number) =>
    setQty((prev) => clampQty(prev + delta));

  // Calculate days remaining if validity exists
  const daysRemaining = product.validity?.endDate
    ? Math.ceil(
      (new Date(product.validity.endDate).getTime() -
        new Date().getTime()) /
      (1000 * 60 * 60 * 24)
    )
    : null;

  // Fetch category name from API by slug if not provided on product
  useEffect(() => {
    let isCancelled = false;

    const fetchCategoryName = async () => {
      if (!product.category) return;
      if (product.categoryName) return; // already provided from API

      try {
        const res = await fetch(
          `/api/categories?slug=${encodeURIComponent(
            product.category
          )}&limit=1`
        );
        if (!res.ok) return;
        const data = await res.json();
        const apiName = data?.categories?.[0]?.name as string | undefined;
        if (!isCancelled && apiName) {
          setResolvedCategoryName(apiName);
        }
      } catch (err) {
        console.error("Error fetching category name:", err);
      }
    };

    fetchCategoryName();

    return () => {
      isCancelled = true;
    };
  }, [product.category, product.categoryName]);

  // Fetch related products from API
  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        const response = await fetch("/api/products?limit=8");
        if (response.ok) {
          const data = await response.json();

          // API Product interface aligned with backend Product model
          interface ApiProduct {
            _id: string;
            name: string;
            brand?: string;
            category: string;
            subcategory?: string;
            sku?: string;
            barcode?: string;
            description?: string;
            summary?: string;
            pricing?: {
              current: { currency: string; value: number; unit: string };
              original: { currency: string; value: number; unit: string };
              discountPercentage: number;
            };
            inventory?: {
              quantity: number;
              threshold: number;
              status: string;
            };
            ratings?: {
              averageRating: number;
              totalReviews: number;
            };
            media?: {
              thumbnail?: string;
              gallery?: string[];
            };
            details?: {
              ingredients: string[];
              features: string[];
              usage: string;
              benefits: string[];
              warnings: string;
              certifications: string[];
            };
            createdAt?: string;
            updatedAt?: string;
            categoryName?: string;
          }

          const transformedProducts: Product[] =
            data.products?.map((p: ApiProduct) => {
              // Get price unit for this product
              const productPriceUnit = p.pricing?.current?.unit ||
                p.pricing?.original?.unit ||
                '1 kg';

              return {
                id: p._id,
                name: p.name,
                slug: p.sku || p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),

                // Images
                image: p.media?.thumbnail || "/images/placeholder.jpg",
                imageAlt: `${p.name} image`,
                gallery:
                  p.media?.gallery?.map((src) => ({
                    src,
                    alt: `${p.name} image`,
                  })) || [],

                // Pricing with unit
                price: p.pricing?.current?.value || 0,
                oldPrice: p.pricing?.original?.value,
                unit: productPriceUnit,
                pricing: p.pricing,

                // Category / brand
                brand: p.brand,
                category: p.category,
                subcategory: p.subcategory,
                categoryName: p.categoryName,

                // Identification
                sku: p.sku,
                barcode: p.barcode,

                // Text fields
                description: p.description,
                summary: p.summary,
                shortDescription: p.summary,

                // Inventory
                stock: p.inventory?.quantity || 0,
                inventory: p.inventory,

                // Ratings
                rating: p.ratings?.averageRating ?? 4.5,
                reviewsCount: p.ratings?.totalReviews ?? 0,
                ratings: p.ratings,

                // Media / details
                media: p.media
                  ? {
                    thumbnail: p.media.thumbnail || "",
                    gallery: p.media.gallery || [],
                  }
                  : undefined,
                details: p.details,

                // Timestamps
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,

                // UI-only fields (may not come from API; leave undefined)
                badge: undefined,
                origin: undefined,
                harvestWindow: undefined,
                tasteNotes: undefined,
                tags: undefined,
                storage: undefined,
                isCombo: undefined,
                validity: undefined,
              };
            }) || [];

          // Filter out current product and take first 4
          const filtered = transformedProducts
            .filter((p) => p.id !== product.id)
            .slice(0, 4);
          setRelatedProducts(filtered);
        }
      } catch (error) {
        console.error("Error fetching related products:", error);
      }
    };

    fetchRelatedProducts();
  }, [product.id]);

  useEffect(() => {
    if (showShareMenu) {
      const handleClickOutside = () => {
        setShowShareMenu(false);
      };

      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
    return undefined;
  }, [showShareMenu]);

  const updateZoomPosition = (
    clientX: number,
    clientY: number,
    rect: DOMRect
  ) => {
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  // Handle mouse move for zoom effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showZoom || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    updateZoomPosition(e.clientX, e.clientY, rect);
  };

  // Handle mouse enter/leave for zoom
  const handleMouseEnter = () => {
    if (zoomTimerRef.current) {
      clearTimeout(zoomTimerRef.current);
    }
    setShowZoom(true);
  };

  const handleMouseLeave = () => {
    zoomTimerRef.current = setTimeout(() => {
      setShowZoom(false);
    }, 100);
  };

  const handleImageTap = () => {
    if (isZoomActive) {
      setShowZoomPanel(true);
      setIsZoomActive(true);
    } else {
      setIsZoomActive(true);
      setShowZoomPanel(true);
      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect();
        updateZoomPosition(rect.width / 2, rect.height / 2, rect);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;

    if (e.touches.length === 2) {
      setIsPinching(true);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      setTouchDistance(distance);
      setTouchStart({
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      });
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      setTouchStart({ x: touch.clientX, y: touch.clientY });

      if (isZoomActive) {
        const rect = imageRef.current.getBoundingClientRect();
        updateZoomPosition(touch.clientX, touch.clientY, rect);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isZoomActive || !imageRef.current || e.touches.length === 0) return;

    if (e.touches.length === 2 && isPinching) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const newDistance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );

      const scaleChange = newDistance / touchDistance;
      const newScale = Math.min(Math.max(1.5, zoomScale * scaleChange), 4);
      setZoomScale(newScale);
      setTouchDistance(newDistance);

      const midX = (touch1.clientX + touch2.clientX) / 2;
      const midY = (touch1.clientY + touch2.clientY) / 2;
      setTouchStart({ x: midX, y: midY });

      const rect = imageRef.current.getBoundingClientRect();
      updateZoomPosition(midX, midY, rect);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = imageRef.current.getBoundingClientRect();
      updateZoomPosition(touch.clientX, touch.clientY, rect);
    }
  };

  const handleTouchEnd = () => {
    setIsPinching(false);

    if (!isZoomActive) {
      handleImageTap();
    }
  };

  const toggleZoomPanel = () => {
    setShowZoomPanel((prev) => !prev);
    if (!showZoomPanel) {
      setIsZoomActive(true);
    }
  };

  const closeZoomPanel = () => {
    setShowZoomPanel(false);
    setIsZoomActive(false);
    setZoomScale(2);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-700">
              Home
            </Link>
            <span>/</span>
            <Link href={categoryHref} className="hover:text-gray-700">
              {categoryLabel}
            </Link>
            <span>/</span>
            <span className="text-gray-900">{product.name}</span>
          </div>
        </nav>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative">
              <div
                ref={imageRef}
                className="aspect-square overflow-hidden rounded-lg bg-linear-to-br from-orange-100 to-red-100 relative cursor-pointer"
                onClick={handleImageTap}
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
              >
                {/* Status Badge */}
                <div className="absolute top-4 left-4 z-10">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide border ${statusColor}`}
                  >
                    {statusText}
                  </span>
                </div>

                {/* Discount Badge */}
                {discountPercent && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="rounded-full bg-linear-to-r from-orange-500 to-red-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                      {discountPercent}% OFF
                    </span>
                  </div>
                )}

                {/* Product Badge */}
                {badgeText && (
                  <div className="absolute top-12 right-4 z-10">
                    <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                      {badgeText}
                    </span>
                  </div>
                )}

                <Image
                  src={currentImage?.src ?? product.image}
                  alt={currentImage?.alt ?? product.imageAlt ?? product.name}
                  width={600}
                  height={600}
                  className="h-full w-full object-cover"
                  priority
                />

                {/* Zoom Indicator */}
                  {isZoomActive && (
                    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs lg:hidden">
                      <ZoomIn className="w-3 h-3" />
                      <span>Zoom Active - Tap to adjust</span>
                    </div>
                  )}

                  {/* Zoom Toggle Button */}
                  <button
                    onClick={toggleZoomPanel}
                    className="absolute bottom-4 right-4 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-md hover:bg-white transition-colors lg:hidden"
                    title={showZoomPanel ? "Hide Zoom" : "Show Zoom"}
                  >
                    <ZoomIn className={`w-5 h-5 ${isZoomActive ? "text-orange-500" : "text-gray-700"}`} />
                </button>
              </div>

              {/* Zoom Preview Overlay */}
              {showZoom && !isZoomActive && (
                <div className="absolute left-[calc(100%+1rem)] top-0 w-full h-full bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200 z-20 hidden lg:block">
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: `url(${currentImage?.src ?? product.image
                        })`,
                      backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                      backgroundSize: `${zoomScale * 100}%`,
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={() =>
                        setZoomScale((prev) => Math.max(1.5, prev - 0.5))
                      }
                      className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-md text-sm font-medium hover:bg-white"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-md text-sm font-medium">
                      {zoomScale.toFixed(1)}x
                    </span>
                    <button
                      onClick={() =>
                        setZoomScale((prev) => Math.min(4, prev + 0.5))
                      }
                      className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-md text-sm font-medium hover:bg-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {gallery.map((g, i) => (
                  <button
                    key={g.src}
                    type="button"
                    onClick={() => setActiveIndex(clampIndex(i))}
                    className={`relative h-16 w-16 overflow-hidden rounded-md border-2 transition-all duration-200 ${i === safeIndex
                        ? "border-orange-500"
                        : "border-gray-200 hover:border-gray-400"
                      }`}
                  >
                    <Image
                      src={g.src}
                      alt={g.alt ?? `${product.name} gallery`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            )}
            {showZoomPanel && (
              <div className="mt-6 p-4 bg-linear-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm lg:hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ZoomIn className="w-5 h-5 text-orange-500" />
                    <h3 className="font-semibold text-gray-900">Image Zoom</h3>
                  </div>
                  <button
                    onClick={closeZoomPanel}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    title="Close Zoom"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden rounded-lg bg-gray-100">
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage: `url(${currentImage?.src ?? product.image})`,
                        backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                        backgroundSize: `${zoomScale * 100}%`,
                        backgroundRepeat: "no-repeat",
                        touchAction: "none",
                      }}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    />
                  </div>
                  <div className="mt-2 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                    <Move className="w-3 h-3" />
                    <span>Pinch to zoom - Drag to pan</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Zoom Level</span>
                    <span className="text-lg font-bold text-orange-600">{zoomScale.toFixed(1)}x</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setZoomScale(Math.min(zoomScale + 0.5, 4))}
                      className="px-3 py-1 rounded-full border border-gray-200 text-sm transition hover:bg-gray-100"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setZoomScale(Math.max(zoomScale - 0.5, 1))}
                      className="px-3 py-1 rounded-full border border-gray-200 text-sm transition hover:bg-gray-100"
                    >
                      -
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Product Details or Zoom View */}
          <div className="relative">
            {showZoom ? (
              /* Zoom View */
              <div className="space-y-3 flex flex-col items-center justify-center min-h-75">
                <div className="text-center max-w-sm">
                  <ZoomIn className="w-10 h-10 mx-auto text-orange-500 mb-3" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Image Zoom Active
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Move your cursor over the image to zoom. Use +/- buttons to
                    adjust zoom level.
                  </p>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">
                        {zoomScale.toFixed(1)}x
                      </div>
                      <div className="text-xs text-gray-500">Zoom Level</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowZoom(false)}
                    className="px-3 py-1.5 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 transition-colors text-sm"
                  >
                    Close Zoom
                  </button>
                </div>
              </div>
            ) : (
              /* Product Details Content */
              <div className="space-y-6">
                {/* Product Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div
                      className={`${showZoomPanel ? "hidden md:flex" : "flex"} items-center gap-3 mb-3`}
                    >
                      {badgeText && (
                        <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
                          <Gift className="w-3 h-3 mr-1" />
                          {badgeText}
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        <Package className="w-3 h-3 mr-1" />
                        {categoryLabel}
                      </span>
                    </div>
                    <div className={`${showZoomPanel ? "hidden md:block" : ""}`}>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {product.name}
                      </h1>
                    </div>
                    <div
                      className={`${showZoomPanel ? "hidden md:flex" : "flex"} flex-wrap items-center gap-3 mb-4`}
                    >
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${i < roundedRating
                                ? "fill-amber-400 text-amber-400"
                                : "text-gray-300"
                              }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {ratingLabel} ({reviewsLabel} reviews)
                      </span>
                      <span
                        className={`text-sm font-medium ${inStock ? "text-green-600" : "text-red-500"
                          }`}
                      >
                        {inStock
                          ? `${product.stock ??
                          product.inventory?.quantity ??
                          0
                          } available`
                          : "Out of stock"}
                      </span>
                    </div>
                    <div
                      className={`${showZoomPanel ? "hidden md:flex" : "flex"} items-center mb-4`}
                    >
                  
                    </div>
                    <p className="text-gray-600 mb-4">
                      {product.shortDescription ||
                        product.summary ||
                        product.description?.slice(0, 150)}
                      ...
                    </p>

                    {/* Product Meta with Price Unit */}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-4">
                      {/* Price Unit */}
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4" />
                        <span>Price Unit: {priceUnit}</span>
                      </div>

                      {categoryLabel && (
                        <div className="flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-gray-400" />
                          <span>Category: {categoryLabel}</span>
                        </div>
                      )}

                      {product.brand && (
                        <div className="flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-gray-400" />
                          <span>Brand: {product.brand}</span>
                        </div>
                      )}

                      {product.origin && (
                        <div className="flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-gray-400" />
                          <span>Origin: {product.origin}</span>
                        </div>
                      )}
                    </div>

                    {/* Features/Tags */}
                    {product.tags && product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {product.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                          >
                            {tag}
                          </span>
                        ))}
                        {product.tags.length > 3 && (
                          <span className="rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-500">
                            +{product.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                 {/* Wishlist & Share */}
                        <div className="flex items-center gap-2 ml-3">
                          <button
                            onClick={() => toggleWishlist(cartProduct)}
                            className={`group relative p-2 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-md hover:shadow-lg ${isProductWishlisted
                              ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                              }`}
                            title={
                              isProductWishlisted
                                ? "Remove from wishlist"
                                : "Add to wishlist"
                            }
                          >
                            <Heart
                              className={`w-5 h-5 transition-all duration-300 ${isProductWishlisted
                                ? "fill-current scale-110"
                                : "group-hover:scale-110"
                                }`}
                            />
                          </button>

                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowShareMenu(!showShareMenu);
                              }}
                              className="group relative p-2 rounded-xl border-2 bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-md hover:shadow-lg"
                              title="Share product"
                            >
                              <Share2 className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                            </button>

                            {showShareMenu && (
                              <div className="absolute right-0 top-12 bg-white border-2 border-gray-100 rounded-2xl shadow-2xl p-3 z-20 min-w-40 transform transition-all duration-200 scale-100 opacity-100">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(
                                      window.location.href
                                    );
                                    setShowShareMenu(false);
                                  }}
                                  className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-50 rounded-xl transition-colors duration-200 flex items-center gap-3"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                  </svg>
                                  Copy Link
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(
                                      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                                        shareProductMessage
                                      )}&url=${encodeURIComponent(
                                        window.location.href
                                      )}`
                                    );
                                    setShowShareMenu(false);
                                  }}
                                  className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-50 rounded-xl transition-colors duration-200 flex items-center gap-3"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                  </svg>
                                  Share on X
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                </div>

                {/* Pricing & Savings */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-3xl font-bold text-gray-900">
                      {formatCurrency(product.price)}
                      <span className="text-sm text-gray-500 ml-2">
                        / {priceUnit}
                      </span>
                    </div>
                    {product.oldPrice && product.oldPrice > product.price && (
                      <>
                        <div className="text-lg text-gray-500 line-through">
                          {formatCurrency(product.oldPrice)}
                          <span className="text-sm ml-1">
                            / {priceUnit}
                          </span>
                        </div>
                        {discountPercent && (
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-linear-to-r from-orange-100 to-red-100 text-orange-700 font-semibold">
                            <Percent className="w-4 h-4" />
                            Save {discountPercent}%
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {product.oldPrice && product.oldPrice > product.price && (
                    <div className="flex items-center gap-2 text-green-600">
                      <Zap className="w-4 h-4" />
                      <span className="font-medium">
                        You save {formatCurrency(savings)}!
                      </span>
                    </div>
                  )}
                </div>

                {/* Quantity & Actions */}
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <span className="text-base font-semibold text-gray-800">
                      Quantity:
                    </span>
                    <div className="flex items-center bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                      <button
                        onClick={() => adjustQty(-1)}
                        className="h-12 w-12 flex items-center justify-center hover:bg-gray-50 transition-all duration-200 text-lg font-semibold text-gray-600 hover:text-gray-800 rounded-l-xl"
                      >
                        −
                      </button>
                      <div className="h-12 w-16 flex items-center justify-center bg-gray-50 border-x-2 border-gray-200 font-bold text-base text-gray-800">
                        {displayQty}
                      </div>
                      <button
                        onClick={() => adjustQty(1)}
                        className="h-12 w-12 flex items-center justify-center hover:bg-gray-50 transition-all duration-200 text-lg font-semibold text-gray-600 hover:text-gray-800 rounded-r-xl"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {/* Add to Cart */}
                    <button
                      onClick={() => {
                        if (!canAddToCart) return;
                        router.push("/cart");
                      }}
                      disabled={!canAddToCart}
                      className={addToCartButtonClass}
                      aria-label={`${addToCartButtonLabel} ${displayQty} ${product.name}`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6"
                        />
                      </svg>
                      <span>{addToCartButtonLabel}</span>
                    </button>

                    {/* Buy Now */}
                    <button
                      onClick={handleBuyNow}
                      disabled={!inStock}
                      className={`flex-1 cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold border-2 transition-all duration-300 transform hover:scale-105 ${inStock
                          ? "border-orange-500 text-orange-600 hover:bg-orange-50"
                          : "border-gray-300  text-gray-400 cursor-not-allowed"
                        }`}
                    >
                      Buy Now
                    </button>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span>Secure Payment</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>Free Shipping</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <RotateCcw className="w-4 h-4 text-purple-600" />
                    <span>Easy Returns</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          <div className="flex border-b border-gray-100 bg-gray-50 rounded-t-2xl p-2">
            <button
              onClick={() => setTab("description")}
              className={`py-3 px-6 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-105 ${tab === "description"
                  ? "bg-white text-orange-600 shadow-lg border-2 border-orange-200"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
                }`}
            >
              Overview
            </button>
            <button
              onClick={() => setTab("details")}
              className={`py-3 px-6 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-105 ${tab === "details"
                  ? "bg-white text-orange-600 shadow-lg border-2 border-orange-200"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
                }`}
            >
              Product Details
            </button>
            <button
              onClick={() => setTab("reviews")}
              className={`py-3 px-6 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-105 ${tab === "reviews"
                  ? "bg-white text-orange-600 shadow-lg border-2 border-orange-200"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
                }`}
            >
              Reviews ({reviewsLabel})
            </button>
          </div>

          <div className="py-8 min-h-50">
            {tab === "description" && (
              <div className="prose prose-sm max-w-none text-gray-600 space-y-8">
                {/* Main description */}
                <div className={`${showZoomPanel ? "hidden md:block" : ""}`}>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Description
                  </h4>
                  <p className="text-base leading-relaxed">
                    {product.description ||
                      product.summary ||
                      "No description available."}
                  </p>
                </div>

                {/* At a Glance – core data dump including category + SKU */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    At a Glance
                  </h4>
                  <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                    {categoryLabel && (
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          Category
                        </dt>
                        <dd className="text-right">{categoryLabel}</dd>
                      </div>
                    )}
                    {product.categoryName &&
                      product.categoryName !== categoryLabel && (
                        <div className="flex justify-between gap-2">
                          <dt className="font-medium text-gray-900">
                            Category Name
                          </dt>
                          <dd className="text-right">
                            {product.categoryName}
                          </dd>
                        </div>
                      )}
                    {product.subcategory && (
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          Subcategory
                        </dt>
                        <dd className="text-right">{product.subcategory}</dd>
                      </div>
                    )}
                    {product.brand && (
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          Brand
                        </dt>
                        <dd className="text-right">{product.brand}</dd>
                      </div>
                    )}
                    {product.sku && (
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          SKU
                        </dt>
                        <dd className="text-right">{product.sku}</dd>
                      </div>
                    )}
                    {product.barcode && (
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          Barcode
                        </dt>
                        <dd className="text-right">{product.barcode}</dd>
                      </div>
                    )}
                    {priceUnit && (
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          Price Unit
                        </dt>
                        <dd className="text-right">{priceUnit}</dd>
                      </div>
                    )}
                    {product.origin && (
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          Origin
                        </dt>
                        <dd className="text-right">{product.origin}</dd>
                      </div>
                    )}
                    {product.harvestWindow && (
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          Harvest Window
                        </dt>
                        <dd className="text-right">
                          {product.harvestWindow}
                        </dd>
                      </div>
                    )}
                    {product.validity?.startDate && (
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          Offer Start
                        </dt>
                        <dd className="text-right">
                          {formatDate(product.validity.startDate)}
                        </dd>
                      </div>
                    )}
                    {product.validity?.endDate && (
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          Offer End
                        </dt>
                        <dd className="text-right">
                          {formatDate(product.validity.endDate)}
                          {daysRemaining !== null &&
                            daysRemaining > 0 && (
                              <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                                {daysRemaining} days left
                              </span>
                            )}
                        </dd>
                      </div>
                    )}
                    {product.validity?.isActive !== undefined && (
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          Offer Active
                        </dt>
                        <dd className="text-right">
                          {product.validity.isActive ? "Yes" : "No"}
                        </dd>
                      </div>
                    )}
                    {product.isCombo !== undefined && (
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          Is Combo
                        </dt>
                        <dd className="text-right">
                          {product.isCombo ? "Yes" : "No"}
                        </dd>
                      </div>
                    )}
                    {product.createdAt && (
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          Created At
                        </dt>
                        <dd className="text-right">
                          {formatDate(product.createdAt)}
                        </dd>
                      </div>
                    )}
                    {product.updatedAt && (
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          Last Updated
                        </dt>
                        <dd className="text-right">
                          {formatDate(product.updatedAt)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Pricing info with Unit */}
                {(product.price || product.oldPrice || product.pricing) && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Pricing
                    </h4>
                    <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          Current Price
                        </dt>
                        <dd className="text-right">
                          {formatCurrency(product.price)} / {priceUnit}
                        </dd>
                      </div>
                      {product.oldPrice && (
                        <div className="flex justify-between gap-2">
                          <dt className="font-medium text-gray-900">
                            Original Price
                          </dt>
                          <dd className="text-right">
                            {formatCurrency(product.oldPrice)} / {priceUnit}
                          </dd>
                        </div>
                      )}
                      {product.pricing?.discountPercentage && (
                        <div className="flex justify-between gap-2">
                          <dt className="font-medium text-gray-900">
                            Discount
                          </dt>
                          <dd className="text-right">
                            {product.pricing.discountPercentage}%
                          </dd>
                        </div>
                      )}
                      {product.pricing?.current?.currency && (
                        <div className="flex justify-between gap-2">
                          <dt className="font-medium text-gray-900">
                            Currency
                          </dt>
                          <dd className="text-right">
                            {product.pricing.current.currency}
                          </dd>
                        </div>
                      )}
                      {product.pricing?.current?.unit && (
                        <div className="flex justify-between gap-2">
                          <dt className="font-medium text-gray-900">
                            Price Unit
                          </dt>
                          <dd className="text-right">
                            {product.pricing.current.unit}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}

                {/* Inventory info */}
                {(product.stock !== undefined || product.inventory) && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Inventory
                    </h4>
                    <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          Status
                        </dt>
                        <dd className="text-right">
                          {getStatusText(
                            product.stock ?? product.inventory?.quantity
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          Available Quantity
                        </dt>
                        <dd className="text-right">
                          {product.stock ??
                            product.inventory?.quantity ??
                            0}
                        </dd>
                      </div>
                      {product.inventory?.threshold !== undefined && (
                        <div className="flex justify-between gap-2">
                          <dt className="font-medium text-gray-900">
                            Low Stock Threshold
                          </dt>
                          <dd className="text-right">
                            {product.inventory.threshold}
                          </dd>
                        </div>
                      )}
                      {product.inventory?.status && (
                        <div className="flex justify-between gap-2">
                          <dt className="font-medium text-gray-900">
                            Inventory Status
                          </dt>
                          <dd className="text-right capitalize">
                            {product.inventory.status.replace(/_/g, " ")}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}

                {/* Ratings info */}
                {(ratingValue || reviewsLabel) && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Ratings
                    </h4>
                    <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          Average Rating
                        </dt>
                        <dd className="text-right">{ratingLabel}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-gray-900">
                          Total Reviews
                        </dt>
                        <dd className="text-right">{reviewsLabel}</dd>
                      </div>
                    </dl>
                  </div>
                )}

                {/* Details from backend (ingredients, features, usage, etc.) */}
                {product.details && (
                  <div className="space-y-4">
                    {product.details.ingredients?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Ingredients
                        </h4>
                        <ul className="list-disc pl-4 space-y-1">
                          {product.details.ingredients.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {product.details.benefits?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Benefits
                        </h4>
                        <ul className="list-disc pl-4 space-y-1">
                          {product.details.benefits.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {product.details.features?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Key Features
                        </h4>
                        <ul className="list-disc pl-4 space-y-1">
                          {product.details.features.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {product.details.usage && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Usage
                        </h4>
                        <p>{product.details.usage}</p>
                      </div>
                    )}

                    {product.details.warnings && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Warnings
                        </h4>
                        <p>{product.details.warnings}</p>
                      </div>
                    )}

                    {product.details.certifications?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Certifications
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {product.details.certifications.map(
                            (cert, idx) => (
                              <span
                                key={idx}
                                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                              >
                                {cert}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Taste notes */}
                {product.tasteNotes && product.tasteNotes.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Signature Taste Notes
                    </h4>
                    <ul className="grid gap-3">
                      {product.tasteNotes.map((note, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-2"
                        >
                          <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tags / use cases */}
                {product.tags && product.tags.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Tags / Perfect For
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {product.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Storage info */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Storage & Handling
                  </h4>
                  <p className="leading-relaxed">
                    {product.storage ||
                      "Store in a cool, dry place away from direct sunlight."}
                  </p>
                </div>
              </div>
            )}

            {tab === "details" && (
              <div className="prose prose-sm max-w-none text-gray-600">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">
                      Product Details
                    </h4>
                    <dl className="space-y-3 text-sm text-gray-700">
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-gray-900">
                          Category
                        </dt>
                        <dd className="text-right">{categoryLabel}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-gray-900">
                          Origin
                        </dt>
                        <dd className="text-right">
                          {product.origin || "Bangladesh"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-gray-900">
                          SKU
                        </dt>
                        <dd className="text-right">
                          {product.sku || product.slug}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-gray-900">
                          Price Unit
                        </dt>
                        <dd className="text-right">{priceUnit}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-gray-900">
                          Availability
                        </dt>
                        <dd
                          className={`text-right px-2 py-1 rounded-full text-xs font-semibold ${statusColor}`}
                        >
                          {statusText}
                        </dd>
                      </div>
                      {product.harvestWindow && (
                        <div className="flex justify-between gap-4">
                          <dt className="font-medium text-gray-900">
                            Harvest Window
                          </dt>
                          <dd className="text-right">
                            {product.harvestWindow}
                          </dd>
                        </div>
                      )}
                      {product.validity?.endDate && (
                        <div className="flex justify-between gap-4">
                          <dt className="font-medium text-gray-900">
                            Offer Valid Until
                          </dt>
                          <dd className="text-right">
                            {formatDate(product.validity.endDate)}
                            {daysRemaining !== null &&
                              daysRemaining > 0 && (
                                <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                                  {daysRemaining} days left
                                </span>
                              )}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">
                      Storage & Serving
                    </h4>
                    <p className="leading-relaxed">
                      {product.storage ||
                        "Store in a cool, dry place away from direct sunlight."}
                    </p>
                    {product.tags && product.tags.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">
                          Tags
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {product.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {tab === "reviews" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900">
                        {ratingLabel}
                      </div>
                      <div className="flex items-center justify-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < roundedRating
                                ? "fill-amber-400 text-amber-400"
                                : "text-gray-300"
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Based on {reviewsLabel} review
                      {reviewsLabel !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                    Write a Review
                  </button>
                </div>

                {/* Reviews would be mapped here */}
                <div className="text-center py-12 text-gray-500">
                  <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No reviews yet. Be the first to review this product!</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                You Might Also Like
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Discover more delicious and healthy options from our carefully
                curated collection
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((p) => {
                const productPriceUnit = getPriceUnit(p);
                return (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug}`}
                    className="group"
                  >
                    <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-orange-100 to-red-100 mb-4 shadow-sm group-hover:shadow-lg transition-all duration-300">
                      <div className="aspect-square relative">
                        <Image
                          src={p.image}
                          alt={p.name}
                          width={300}
                          height={300}
                          className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        {p.oldPrice && p.oldPrice > p.price && (
                          <div className="absolute top-3 right-3">
                            <span className="rounded-full bg-linear-to-r from-orange-500 to-red-500 px-2 py-1 text-xs font-bold text-white">
                              {calculateDiscount(p.price, p.oldPrice)}% OFF
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2">
                        {p.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(p.price)}
                            <span className="text-xs text-gray-500 ml-1">
                              / {productPriceUnit}
                            </span>
                          </p>
                          {p.oldPrice && p.oldPrice > p.price && (
                            <p className="text-xs text-gray-500 line-through">
                              {formatCurrency(p.oldPrice)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs text-gray-600">
                            {(p.rating ?? 4.5).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductDetail({ product }: { product: Product }) {
  return <ProductDetailContent key={product.id} product={product} />;
}
