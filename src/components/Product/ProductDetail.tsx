/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useCallback, useMemo, useEffect, useRef, useState } from "react";
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

/**
 * ✅ DESIGN UPDATE ONLY
 * - Kept ALL your existing logic + handlers intact
 * - Replaced orange gradients / random colors with ROBE palette
 * - Unified typography: serif headers, tight tracking, robe text colors
 * - Unified buttons: maroon primary, sand secondary, robe borders
 * - Improved badge + pill styling
 * - Kept zoom, touch, fetch, wishlist, share, tabs, related products functional
 */

// Extended Product interface for compatibility with API + existing UI needs
type DeliveryInfo = {
  isFree?: boolean;
  charge?: number | string;
  message?: string;
};

interface Product {
  id: string;
  name: string;
  slug: string;
  
  brand?: string;
  category?: string;
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
  categoryName?: string;

  delivery?: DeliveryInfo;

  price: number;
  oldPrice?: number;
  image: string;
  imageAlt?: string;

  stock?: number;
  rating?: number;
  reviewsCount?: number;

  unit?: string;
  shortDescription?: string;
  badge?: string;
  gallery?: { src: string; alt: string }[];
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

type ProductReview = {
  id: string;
  productId: string;
  name: string;
  email?: string;
  rating: number;
  title?: string;
  comment: string;
  source?: string;
  createdAt: string;
};

/* -------------------- ROBE THEME TOKENS -------------------- */
const robe = {
  cream: "#FBF3E8",
  maroon: "#944C35",
  sand: "#E2B188",
  blush: "#F1D6C1",
  text: "#3b2a22",
  maroonHover: "#7f3f2d",
};

const currencyFormatter = new Intl.NumberFormat("bn-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

const calculateDiscount = (price: number, oldPrice?: number) => {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
};

/**
 * NOTE: These status colors were using green/amber/red.
 * Keeping the meaning, but shifting to robe-ish tinted versions.
 */
const getStatusColor = (stock?: number) => {
  if (!stock || stock <= 0) return "bg-red-50 text-red-700 border-red-200";
  if (stock < 10) return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-emerald-50 text-emerald-800 border-emerald-200";
};

const getStatusText = (stock?: number) => {
  if (!stock || stock <= 0) return "Sold Out";
  if (stock < 10) return "Low Stock";
  return "In Stock";
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatReviewDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getPriceUnit = (product: Product): string => {
  if (product.pricing?.current?.unit) return product.pricing.current.unit;
  if (product.pricing?.original?.unit) return product.pricing.original.unit;
  if (product.unit) return product.unit;
  return "1 kg";
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
    message: delivery.message ?? (isFree ? "Free Delivery" : `Delivery Charge: ${parsedCharge}`),
  };
};

/* -------------------- Small UI helpers (ROBE styles) -------------------- */
function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "category";
}) {
  const cls =
    tone === "brand"
      ? "bg-[--robe-cream] text-[--robe-maroon] border-[--robe-blush]"
      : tone === "category"
      ? "bg-white text-[--robe-text] border-[--robe-blush]"
      : "bg-white text-[--robe-text] border-gray-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] border ${cls}`}
    >
      {children}
    </span>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
  className = "",
  type = "button",
  ariaLabel,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  ariaLabel?: string;
}) {
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={[
        "group flex items-center  justify-center gap-2 rounded-none px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] transition-all duration-200 whitespace-nowrap",
        "shadow-sm hover:shadow-md",
        disabled
          ? "bg-gray-100  cursor-not-allowed shadow-none"
          : "bg-[--robe-maroon] text-[#944C35] hover:bg-[--robe-maroonHover]",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  disabled,
  onClick,
  className = "",
  ariaLabel,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex items-center justify-center gap-2 rounded-none px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] transition-all duration-200 whitespace-nowrap",
        "border",
        disabled
          ? "border-gray-200 text-gray-400 cursor-not-allowed"
          : "border-[--robe-maroon] text-[--robe-maroon] hover:bg-[--robe-cream]",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function RelatedProductsSkeleton() {
  return (
    <div className="mt-20 animate-pulse">
      <div className="text-center mb-12">
        <div className="h-8 w-64 bg-gray-200 rounded mx-auto" />
        <div className="h-4 w-80 bg-gray-200 rounded mx-auto mt-4" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`related-skel-${index}`} className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl border bg-gray-100">
              <div className="aspect-square flex items-center justify-center">
                <div className="h-24 w-24 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="h-3 w-4/5 bg-gray-200 rounded" />
            <div className="h-3 w-1/2 bg-gray-200 rounded" />
            <div className="h-3 w-1/3 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------- Component -------------------- */
function ProductDetailContent({ product }: { product: Product }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(true);
  const [showZoom, setShowZoom] = useState(false);
  const [showZoomPanel, setShowZoomPanel] = useState(false);
  const [isZoomActive, setIsZoomActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchDistance, setTouchDistance] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [zoomScale, setZoomScale] = useState(2);
  const [tab, setTab] = useState<"description" | "details" | "reviews">("description");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    name: "",
    email: "",
    rating: 5,
    title: "",
    comment: "",
  });
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewStats, setReviewStats] = useState({
    averageRating: 0,
    totalReviews: 0,
  });
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const zoomTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { addToCart, startSuperiorCheckout, toggleWishlist, isInWishlist, isInCart } = useCommerce();
  const { registerProductSelection } = useBuyNow();

  const [resolvedCategoryName, setResolvedCategoryName] = useState<string | null>(
    product.categoryName ?? null
  );

  const gallery = useMemo(
    () =>
      product.gallery?.length
        ? product.gallery
        : [{ src: product.image, alt: product.imageAlt || product.name }],
    [product]
  );

  const categoryHref = product.category ? `/collections/${product.category}` : "/products";
  const categoryLabel = resolvedCategoryName ?? product.category ?? "Uncategorized";

  const safeIndex = useMemo(() => Math.min(activeIndex, Math.max(gallery.length - 1, 0)), [
    activeIndex,
    gallery.length,
  ]);
  const currentImage = gallery[safeIndex] ?? gallery[0];
  const clampIndex = (value: number) => Math.max(0, Math.min(value, Math.max(gallery.length - 1, 0)));

  const ratingValue = Number(product.rating ?? product.ratings?.averageRating ?? 0);
  const reviewsLabel = product.reviewsCount ?? product.ratings?.totalReviews ?? 0;
  const displayReviewAverage =
    reviewStats.totalReviews > 0 ? reviewStats.averageRating : ratingValue;
  const displayReviewCount =
    reviewStats.totalReviews > 0 ? reviewStats.totalReviews : reviewsLabel;
  const displayReviewLabel = displayReviewAverage
    ? displayReviewAverage.toFixed(1)
    : "0.0";
  const displayReviewRounded = Math.round(displayReviewAverage);

  const inStock = (product.stock || product.inventory?.quantity || 0) > 0;
  const badgeLabelMap: Record<string, string> = {
    new: "New Arrival",
    bestseller: "Best Seller",
    limited: "Limited Edition",
    trending: "Trending Now",
    organic: "Organic Certified",
    premium: "Premium Quality",
  };
  const badgeText = product.badge ? badgeLabelMap[product.badge] ?? product.badge : null;

  const discountPercent = calculateDiscount(product.price, product.oldPrice);
  const maxQty = inStock ? product.stock || product.inventory?.quantity || 1 : 1;

  const statusText = getStatusText(product.stock ?? product.inventory?.quantity);
  const statusColor = getStatusColor(product.stock ?? product.inventory?.quantity);

  const savings = product.oldPrice ? product.oldPrice - product.price : 0;
  const priceUnit = getPriceUnit(product);

  const cartProduct = useMemo(() => {
    const normalizedDelivery = normalizeDelivery(product.delivery);
    return {
      ...product,
      price: product.price,
      oldPrice: product.oldPrice ?? product.price,
      description: product.summary ?? product.description,
      shortDescription: product.shortDescription ?? product.summary,
      delivery: normalizedDelivery,
      deliveryCharge: normalizedDelivery?.charge,
    };
  }, [product]);

  const isProductWishlisted = isInWishlist(cartProduct.id);
  const productIsInCart = isInCart(product.id);
  const canAddToCart = inStock && !productIsInCart;

  const shareDiscountSuffix = discountPercent ? ` - Save ${discountPercent}%` : "";
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
  const adjustQty = (delta: number) => setQty((prev) => clampQty(prev + delta));

  const daysRemaining = product.validity?.endDate
    ? Math.ceil(
        (new Date(product.validity.endDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const fetchReviews = useCallback(async () => {
    if (!product.id) return;
    setIsLoadingReviews(true);
    setReviewError(null);
    try {
      const res = await fetch(
        `/api/reviews?productId=${encodeURIComponent(product.id)}`
      );
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to load reviews");
      }
      const incomingReviews = Array.isArray(payload?.reviews)
        ? payload.reviews
        : [];
      const stats = payload?.stats ?? {};

      setReviews(incomingReviews);
      setReviewStats({
        averageRating: Number(stats.averageRating ?? 0),
        totalReviews: Number(stats.totalReviews ?? incomingReviews.length ?? 0),
      });
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Failed to load reviews"
      );
    } finally {
      setIsLoadingReviews(false);
    }
  }, [product.id]);

  useEffect(() => {
    let isCancelled = false;

    const fetchCategoryName = async () => {
      if (!product.category) return;
      if (product.categoryName) return;

      try {
        const res = await fetch(`/api/categories?slug=${encodeURIComponent(product.category)}&limit=1`);
        if (!res.ok) return;
        const data = await res.json();
        const apiName = data?.categories?.[0]?.name as string | undefined;
        if (!isCancelled && apiName) setResolvedCategoryName(apiName);
      } catch (err) {
        console.error("Error fetching category name:", err);
      }
    };

    fetchCategoryName();
    return () => {
      isCancelled = true;
    };
  }, [product.category, product.categoryName]);

  useEffect(() => {
    let isMounted = true;
    const fetchRelatedProducts = async () => {
      setIsLoadingRelated(true);
      setRelatedProducts([]);
      try {
        const response = await fetch("/api/products?limit=8");
        if (response.ok) {
          const data = await response.json();

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
              const productPriceUnit =
                p.pricing?.current?.unit || p.pricing?.original?.unit || "1 kg";

              return {
                id: p._id,
                name: p.name,
                slug: p.sku || p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                image: p.media?.thumbnail || "/images/placeholder.jpg",
                imageAlt: `${p.name} image`,
                gallery: p.media?.gallery?.map((src) => ({ src, alt: `${p.name} image` })) || [],
                price: p.pricing?.current?.value || 0,
                oldPrice: p.pricing?.original?.value,
                unit: productPriceUnit,
                pricing: p.pricing,
                brand: p.brand,
                category: p.category,
                subcategory: p.subcategory,
                categoryName: p.categoryName,
                sku: p.sku,
                barcode: p.barcode,
                description: p.description,
                summary: p.summary,
                shortDescription: p.summary,
                stock: p.inventory?.quantity || 0,
                inventory: p.inventory,
                rating: p.ratings?.averageRating ?? 4.5,
                reviewsCount: p.ratings?.totalReviews ?? 0,
                ratings: p.ratings,
                media: p.media
                  ? { thumbnail: p.media.thumbnail || "", gallery: p.media.gallery || [] }
                  : undefined,
                details: p.details,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
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

          const filtered = transformedProducts.filter((p) => p.id !== product.id).slice(0, 4);
          if (isMounted) setRelatedProducts(filtered);
        }
      } catch (error) {
        console.error("Error fetching related products:", error);
      } finally {
        if (isMounted) setIsLoadingRelated(false);
      }
    };

    fetchRelatedProducts();
    return () => {
      isMounted = false;
    };
  }, [product.id]);

  useEffect(() => {
    if (showShareMenu) {
      const handleClickOutside = () => setShowShareMenu(false);
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
    return undefined;
  }, [showShareMenu]);

  useEffect(() => {
    if (tab !== "reviews") return;
    void fetchReviews();
  }, [tab, fetchReviews]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(media.matches);
    update();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    setShowZoom(false);
    setShowZoomPanel(false);
    setIsZoomActive(false);
    setZoomScale(2);
  }, [isMobile]);

  const updateZoomPosition = (clientX: number, clientY: number, rect: DOMRect) => {
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showZoom || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    updateZoomPosition(e.clientX, e.clientY, rect);
  };

  const handleMouseEnter = () => {
    if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    setShowZoom(true);
  };

  const handleMouseLeave = () => {
    zoomTimerRef.current = setTimeout(() => setShowZoom(false), 100);
  };

  const handleImageTap = () => {
    if (isMobile) return;
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
    if (isMobile) return;
    if (!imageRef.current) return;

    if (e.touches.length === 2) {
      setIsPinching(true);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
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
    if (isMobile) return;
    if (!isZoomActive || !imageRef.current || e.touches.length === 0) return;

    if (e.touches.length === 2 && isPinching) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const newDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);

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
    if (isMobile) return;
    setIsPinching(false);
    if (!isZoomActive) handleImageTap();
  };

  const toggleZoomPanel = () => {
    if (isMobile) return;
    setShowZoomPanel((prev) => !prev);
    if (!showZoomPanel) setIsZoomActive(true);
  };

  const closeZoomPanel = () => {
    setShowZoomPanel(false);
    setIsZoomActive(false);
    setZoomScale(2);
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${robe.cream}, #ffffff)`,
      }}
    >
      {/* CSS vars so your Tailwind can reference robe colors */}
      <div
        style={
          {
            ["--robe-cream" as any]: robe.cream,
            ["--robe-maroon" as any]: robe.maroon,
            ["--robe-sand" as any]: robe.sand,
            ["--robe-blush" as any]: robe.blush,
            ["--robe-text" as any]: robe.text,
            ["--robe-maroonHover" as any]: robe.maroonHover,
          } as React.CSSProperties
        }
      >
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-6" aria-label="Breadcrumb">
            <div className="flex items-center space-x-2 text-sm" style={{ color: robe.text }}>
              <Link href="/" className="hover:opacity-80 transition-opacity">
                Home
              </Link>
              <span style={{ color: robe.sand }}>/</span>
              <Link href={categoryHref} className="hover:opacity-80 transition-opacity">
                {categoryLabel}
              </Link>
              <span style={{ color: robe.sand }}>/</span>
              <span className="font-semibold" style={{ color: robe.maroon }}>
                {product.name}
              </span>
            </div>
          </nav>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="relative">
                <div
                  ref={imageRef}
                  className="aspect-square overflow-hidden rounded-2xl relative cursor-pointer border shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${robe.blush}, ${robe.cream})`,
                    borderColor: robe.blush,
                  }}
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
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] border ${statusColor}`}
                    >
                      {statusText}
                    </span>
                  </div>

                  {/* Discount Badge */}
                  {discountPercent && (
                    <div className="absolute top-4 right-4 z-10">
                      <span
                        className="rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm uppercase tracking-[0.16em]"
                        style={{ backgroundColor: robe.maroon }}
                      >
                        {discountPercent}% OFF
                      </span>
                    </div>
                  )}

                  {/* Product Badge */}
                  {badgeText && (
                    <div className="absolute top-12 right-4 z-10">
                      <span
                        className="rounded-full px-3 py-1 text-xs font-bold shadow-sm uppercase tracking-[0.16em] border"
                        style={{ backgroundColor: robe.cream, color: robe.maroon, borderColor: robe.blush }}
                      >
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
                  {!isMobile && isZoomActive && (
                    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs lg:hidden"
                      style={{ backgroundColor: "rgba(59,42,34,0.75)", color: "white" }}
                    >
                      <ZoomIn className="w-3 h-3" />
                      <span>Zoom Active - Tap to adjust</span>
                    </div>
                  )}

                  {/* Zoom Toggle Button */}
                  {!isMobile && (
                    <button
                      onClick={toggleZoomPanel}
                      className="absolute bottom-4 right-4 z-10 p-2 rounded-xl shadow-md transition-colors lg:hidden border"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.85)",
                        borderColor: robe.blush,
                        color: isZoomActive ? robe.maroon : robe.text,
                      }}
                      title={showZoomPanel ? "Hide Zoom" : "Show Zoom"}
                    >
                      <ZoomIn className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Zoom Preview Overlay (desktop) */}
                {showZoom && !isZoomActive && (
                  <div className="absolute left-[calc(100%+1rem)] top-0 w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden border z-20 hidden lg:block"
                    style={{ borderColor: robe.blush }}
                  >
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage: `url(${currentImage?.src ?? product.image})`,
                        backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                        backgroundSize: `${zoomScale * 100}%`,
                        backgroundRepeat: "no-repeat",
                      }}
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={() => setZoomScale((prev) => Math.max(1.5, prev - 0.5))}
                        className="px-3 py-1 rounded-md text-sm font-semibold border"
                        style={{ backgroundColor: "rgba(255,255,255,0.9)", borderColor: robe.blush, color: robe.text }}
                      >
                        -
                      </button>
                      <span
                        className="px-3 py-1 rounded-md text-sm font-semibold border"
                        style={{ backgroundColor: "rgba(255,255,255,0.9)", borderColor: robe.blush, color: robe.text }}
                      >
                        {zoomScale.toFixed(1)}x
                      </span>
                      <button
                        onClick={() => setZoomScale((prev) => Math.min(4, prev + 0.5))}
                        className="px-3 py-1 rounded-md text-sm font-semibold border"
                        style={{ backgroundColor: "rgba(255,255,255,0.9)", borderColor: robe.blush, color: robe.text }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Thumbs */}
              {gallery.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {gallery.map((g, i) => (
                    <button
                      key={g.src}
                      type="button"
                      onClick={() => setActiveIndex(clampIndex(i))}
                      className="relative h-16 w-16 overflow-hidden rounded-xl border-2 transition-all duration-200"
                      style={{
                        borderColor: i === safeIndex ? robe.maroon : robe.blush,
                      }}
                    >
                      <Image src={g.src} alt={g.alt ?? `${product.name} gallery`} fill className="object-cover" sizes="64px" />
                    </button>
                  ))}
                </div>
              )}

              {/* Mobile zoom panel */}
              {!isMobile && showZoomPanel && (
                <div className="mt-6 p-4 rounded-2xl border shadow-sm lg:hidden"
                  style={{
                    background: `linear-gradient(135deg, #ffffff, ${robe.cream})`,
                    borderColor: robe.blush,
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ZoomIn className="w-5 h-5" style={{ color: robe.maroon }} />
                      <h3 className="font-semibold" style={{ color: robe.maroon }}>
                        Image Zoom
                      </h3>
                    </div>
                    <button
                      onClick={closeZoomPanel}
                      className="p-2 rounded-full transition-colors border"
                      style={{ borderColor: robe.blush, color: robe.text, backgroundColor: "white" }}
                      title="Close Zoom"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden rounded-xl border"
                      style={{ borderColor: robe.blush, backgroundColor: "#fff" }}
                    >
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
                    <div className="mt-2 text-center text-xs flex items-center justify-center gap-2"
                      style={{ color: robe.text }}
                    >
                      <Move className="w-3 h-3" />
                      <span>Pinch to zoom - Drag to pan</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ color: robe.text }}>
                        Zoom Level
                      </span>
                      <span className="text-lg font-bold" style={{ color: robe.maroon }}>
                        {zoomScale.toFixed(1)}x
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setZoomScale(Math.min(zoomScale + 0.5, 4))}
                        className="px-4 py-2 rounded-full border text-sm font-semibold transition"
                        style={{ borderColor: robe.blush, color: robe.text, backgroundColor: "white" }}
                      >
                        +
                      </button>
                      <button
                        onClick={() => setZoomScale(Math.max(zoomScale - 0.5, 1))}
                        className="px-4 py-2 rounded-full border text-sm font-semibold transition"
                        style={{ borderColor: robe.blush, color: robe.text, backgroundColor: "white" }}
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="relative">
              {showZoom && !isMobile ? (
                <div className="space-y-3 flex flex-col items-center justify-center min-h-75">
                  <div className="text-center max-w-sm">
                    <ZoomIn className="w-10 h-10 mx-auto mb-3" style={{ color: robe.maroon }} />
                    <h3 className="text-lg font-bold" style={{ color: robe.maroon }}>
                      Image Zoom Active
                    </h3>
                    <p className="text-sm mb-4" style={{ color: robe.text }}>
                      Move your cursor over the image to zoom. Use +/- buttons to adjust zoom level.
                    </p>
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold" style={{ color: robe.maroon }}>
                          {zoomScale.toFixed(1)}x
                        </div>
                        <div className="text-xs" style={{ color: robe.text }}>
                          Zoom Level
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowZoom(false)}
                      className="px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-[0.15em] border"
                      style={{ backgroundColor: robe.maroon, color: "white", borderColor: robe.maroon }}
                    >
                      Close Zoom
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className={`${showZoomPanel ? "hidden md:flex" : "flex"} items-center gap-3 mb-3`}>
                        {badgeText && (
                          <Pill tone="brand">
                            <Gift className="w-3 h-3 mr-2" />
                            {badgeText}
                          </Pill>
                        )}
                        <Pill tone="category">
                          <Package className="w-3 h-3 mr-2" />
                          {categoryLabel}
                        </Pill>
                      </div>

                      <div className={`${showZoomPanel ? "hidden md:block" : ""}`}>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2"
                          style={{ color: robe.maroon }}
                        >
                          {product.name}
                        </h1>
                      </div>

                      <div className={`${showZoomPanel ? "hidden md:flex" : "flex"} flex-wrap items-center gap-3 mb-4`}>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-5 h-5 ${i < displayReviewRounded ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm" style={{ color: robe.text }}>
                          {displayReviewLabel} ({displayReviewCount} reviews)
                        </span>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: inStock ? "#0F766E" : "#B91C1C" }}
                        >
                          {inStock
                            ? `${product.stock ?? product.inventory?.quantity ?? 0} available`
                            : "Out of stock"}
                        </span>
                      </div>

                      <p className="mb-4 leading-relaxed" style={{ color: robe.text }}>
                        {product.shortDescription || product.summary || product.description?.slice(0, 150)}...
                      </p>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-3 text-sm mb-4" style={{ color: robe.text }}>
                        <div className="flex items-center gap-2">
                          <Scale className="w-4 h-4" style={{ color: robe.sand }} />
                          <span className="font-medium">Price Unit:</span> {priceUnit}
                        </div>

                        {categoryLabel && (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: robe.sand }} />
                            <span>
                              <span className="font-medium">Category:</span> {categoryLabel}
                            </span>
                          </>
                        )}

                        {product.brand && (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: robe.sand }} />
                            <span>
                              <span className="font-medium">Brand:</span> {product.brand}
                            </span>
                          </>
                        )}

                        {product.origin && (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: robe.sand }} />
                            <span>
                              <span className="font-medium">Origin:</span> {product.origin}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Tags */}
                      {product.tags && product.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {product.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] border"
                              style={{
                                backgroundColor: robe.cream,
                                borderColor: robe.blush,
                                color: robe.text,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                          {product.tags.length > 3 && (
                            <span
                              className="rounded-full px-3 py-1 text-xs font-semibold border"
                              style={{
                                backgroundColor: "white",
                                borderColor: robe.blush,
                                color: robe.text,
                              }}
                            >
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
                        className="group relative p-2 rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md"
                        style={{
                          backgroundColor: isProductWishlisted ? "#FEF2F2" : "white",
                          borderColor: isProductWishlisted ? "#FECACA" : robe.blush,
                          color: isProductWishlisted ? "#DC2626" : robe.text,
                        }}
                        title={isProductWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                      >
                        <Heart
                          className={`w-5 h-5 transition-transform duration-200 ${isProductWishlisted ? "fill-current" : ""}`}
                        />
                      </button>

                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowShareMenu(!showShareMenu);
                          }}
                          className="group relative p-2 rounded-xl border bg-white transition-all duration-200 shadow-sm hover:shadow-md"
                          style={{ borderColor: robe.blush, color: robe.text }}
                          title="Share product"
                        >
                          <Share2 className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                        </button>

                        {showShareMenu && (
                          <div
                            className="absolute right-0 top-12 bg-white rounded-2xl shadow-2xl p-3 z-20 min-w-48 border"
                            style={{ borderColor: robe.blush }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(window.location.href);
                                setShowShareMenu(false);
                              }}
                              className="w-full text-left px-4 py-3 text-sm font-semibold rounded-xl transition-colors duration-200 flex items-center gap-3"
                              style={{ color: robe.text }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareProductMessage)}&url=${encodeURIComponent(window.location.href)}`
                                );
                                setShowShareMenu(false);
                              }}
                              className="w-full text-left px-4 py-3 text-sm font-semibold rounded-xl transition-colors duration-200 flex items-center gap-3"
                              style={{ color: robe.text }}
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                              </svg>
                              Share on X
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-3xl font-bold" style={{ color: robe.maroon }}>
                        {formatCurrency(product.price)}
                        <span className="text-sm ml-2 font-semibold" style={{ color: robe.text }}>
                          / {priceUnit}
                        </span>
                      </div>

                      {product.oldPrice && product.oldPrice > product.price && (
                        <>
                          <div className="text-lg line-through" style={{ color: robe.sand }}>
                            {formatCurrency(product.oldPrice)}
                            <span className="text-sm ml-1">/ {priceUnit}</span>
                          </div>

                          {discountPercent && (
                            <div
                              className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-semibold border uppercase tracking-[0.14em] text-xs"
                              style={{
                                backgroundColor: robe.cream,
                                borderColor: robe.blush,
                                color: robe.maroon,
                              }}
                            >
                              <Percent className="w-4 h-4" />
                              Save {discountPercent}%
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {product.oldPrice && product.oldPrice > product.price && (
                      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: robe.text }}>
                        <Zap className="w-4 h-4" style={{ color: robe.maroon }} />
                        <span>
                          You save <span style={{ color: robe.maroon }}>{formatCurrency(savings)}</span>!
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quantity & Actions */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-6">
                      <span className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: robe.text }}>
                        Quantity
                      </span>

                      <div className="flex items-center rounded-none border bg-white overflow-hidden shadow-sm"
                        style={{ borderColor: robe.blush }}
                      >
                        <button
                          onClick={() => adjustQty(-1)}
                          className="h-11 w-11 flex bg-[#6B0F1A] items-center justify-center text-lg text-white font-semibold transition"
                          // style={{ color: robe.text }}
                          type="button"
                        >
                          -
                        </button>

                        <div
                          className="h-11 w-14 flex items-center justify-center font-bold"
                          style={{ backgroundColor: robe.cream, color: robe.text, borderLeft: `1px solid ${robe.blush}`, borderRight: `1px solid ${robe.blush}` }}
                        >
                          {displayQty}
                        </div>

                        <button
                          onClick={() => adjustQty(1)}
                          className="h-11 w-11 bg-[#2F5D50] flex items-center justify-center text-white text-lg font-semibold transition"
                          // style={{ color: robe.text }}
                          type="button"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {/* Add to Cart (kept your original behavior: navigates to cart if canAddToCart) */}
                      <PrimaryButton
                        disabled={!canAddToCart}
                        onClick={() => {
                          if (!canAddToCart) return;
                          addToCart(cartProduct, displayQty);
                        }}
                        ariaLabel={`${productIsInCart ? "In Cart" : inStock ? "Add to Cart" : "Sold Out"} ${displayQty} ${product.name}`}
                        className="flex-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6"
                          />
                        </svg>
                        <span>{productIsInCart ? "In Cart" : inStock ? "Add to Cart" : "Sold Out"}</span>
                      </PrimaryButton>

                      {/* Buy Now */}
                      <SecondaryButton disabled={!inStock} onClick={handleBuyNow} className="flex-1">
                        Buy Now
                      </SecondaryButton>
                    </div>
                  </div>

                  {/* Trust Badges */}
                  <div className="grid grid-cols-3 gap-4 py-4 border-y"
                    style={{ borderColor: robe.blush }}
                  >
                    <div className="flex items-center gap-2 text-sm" style={{ color: robe.text }}>
                      <Shield className="w-4 h-4" style={{ color: robe.maroon }} />
                      <span className="font-medium">Secure Payment</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: robe.text }}>
                      <Truck className="w-4 h-4" style={{ color: robe.sand }} />
                      <span className="font-medium">Fast Delivery</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: robe.text }}>
                      <RotateCcw className="w-4 h-4" style={{ color: robe.maroon }} />
                      <span className="font-medium">Easy Returns</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-12 pt-8">
            <div className="border rounded-2xl overflow-hidden bg-white"
              style={{ borderColor: robe.blush }}
            >
              <div className="flex gap-2 p-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                style={{ backgroundColor: robe.cream }}
              >
                {(
                  [
                    { key: "description", label: "Overview" },
                    { key: "details", label: "Product Details" },
                    { key: "reviews", label: `Reviews (${displayReviewCount})` },
                  ] as const
                ).map((t) => {
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className="py-3 px-6 rounded-xl text-sm font-semibold uppercase tracking-[0.16em] transition-all"
                      style={{
                        backgroundColor: active ? "white" : "transparent",
                        color: active ? robe.maroon : robe.text,
                        border: active ? `1px solid ${robe.blush}` : "1px solid transparent",
                        boxShadow: active ? "0 10px 20px rgba(0,0,0,0.06)" : "none",
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="p-6 md:p-8">
                {tab === "description" && (
                  <div className="max-w-none space-y-8" style={{ color: robe.text }}>
                    <div className={`${showZoomPanel ? "hidden md:block" : ""}`}>
                      <h4 className="font-serif font-bold mb-2" style={{ color: robe.maroon }}>
                        Description
                      </h4>
                      <p className="text-base leading-relaxed">
                        {product.description || product.summary || "No description available."}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-serif font-bold mb-3" style={{ color: robe.maroon }}>
                        At a Glance
                      </h4>
                      <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                        {categoryLabel && (
                          <div className="flex justify-between gap-2 border-b pb-2"
                            style={{ borderColor: robe.blush }}
                          >
                            <dt className="font-semibold" style={{ color: robe.text }}>
                              Category
                            </dt>
                            <dd className="text-right">{categoryLabel}</dd>
                          </div>
                        )}
                        {product.subcategory && (
                          <div className="flex justify-between gap-2 border-b pb-2"
                            style={{ borderColor: robe.blush }}
                          >
                            <dt className="font-semibold" style={{ color: robe.text }}>
                              Subcategory
                            </dt>
                            <dd className="text-right">{product.subcategory}</dd>
                          </div>
                        )}
                        {product.brand && (
                          <div className="flex justify-between gap-2 border-b pb-2"
                            style={{ borderColor: robe.blush }}
                          >
                            <dt className="font-semibold" style={{ color: robe.text }}>
                              Brand
                            </dt>
                            <dd className="text-right">{product.brand}</dd>
                          </div>
                        )}
                        {product.sku && (
                          <div className="flex justify-between gap-2 border-b pb-2"
                            style={{ borderColor: robe.blush }}
                          >
                            <dt className="font-semibold" style={{ color: robe.text }}>
                              SKU
                            </dt>
                            <dd className="text-right">{product.sku}</dd>
                          </div>
                        )}
                        {product.barcode && (
                          <div className="flex justify-between gap-2 border-b pb-2"
                            style={{ borderColor: robe.blush }}
                          >
                            <dt className="font-semibold" style={{ color: robe.text }}>
                              Barcode
                            </dt>
                            <dd className="text-right">{product.barcode}</dd>
                          </div>
                        )}
                        {priceUnit && (
                          <div className="flex justify-between gap-2 border-b pb-2"
                            style={{ borderColor: robe.blush }}
                          >
                            <dt className="font-semibold" style={{ color: robe.text }}>
                              Price Unit
                            </dt>
                            <dd className="text-right">{priceUnit}</dd>
                          </div>
                        )}
                        {product.origin && (
                          <div className="flex justify-between gap-2 border-b pb-2"
                            style={{ borderColor: robe.blush }}
                          >
                            <dt className="font-semibold" style={{ color: robe.text }}>
                              Origin
                            </dt>
                            <dd className="text-right">{product.origin}</dd>
                          </div>
                        )}
                        {product.harvestWindow && (
                          <div className="flex justify-between gap-2 border-b pb-2"
                            style={{ borderColor: robe.blush }}
                          >
                            <dt className="font-semibold" style={{ color: robe.text }}>
                              Harvest Window
                            </dt>
                            <dd className="text-right">{product.harvestWindow}</dd>
                          </div>
                        )}
                        {product.validity?.endDate && (
                          <div className="flex justify-between gap-2 border-b pb-2"
                            style={{ borderColor: robe.blush }}
                          >
                            <dt className="font-semibold" style={{ color: robe.text }}>
                              Offer End
                            </dt>
                            <dd className="text-right">
                              {formatDate(product.validity.endDate)}
                              {daysRemaining !== null && daysRemaining > 0 && (
                                <span
                                  className="ml-2 px-2 py-1 text-xs rounded-full font-semibold"
                                  style={{ backgroundColor: robe.cream, color: robe.maroon }}
                                >
                                  {daysRemaining} days left
                                </span>
                              )}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    {product.details && (
                      <div className="space-y-6">
                        {product.details.ingredients?.length > 0 && (
                          <div>
                            <h4 className="font-serif font-bold mb-2" style={{ color: robe.maroon }}>
                              Ingredients
                            </h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {product.details.ingredients.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {product.details.benefits?.length > 0 && (
                          <div>
                            <h4 className="font-serif font-bold mb-2" style={{ color: robe.maroon }}>
                              Benefits
                            </h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {product.details.benefits.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {product.details.features?.length > 0 && (
                          <div>
                            <h4 className="font-serif font-bold mb-2" style={{ color: robe.maroon }}>
                              Key Features
                            </h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {product.details.features.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {product.details.usage && (
                          <div>
                            <h4 className="font-serif font-bold mb-2" style={{ color: robe.maroon }}>
                              Usage
                            </h4>
                            <p>{product.details.usage}</p>
                          </div>
                        )}

                        {product.details.warnings && (
                          <div>
                            <h4 className="font-serif font-bold mb-2" style={{ color: robe.maroon }}>
                              Warnings
                            </h4>
                            <p>{product.details.warnings}</p>
                          </div>
                        )}

                        {product.details.certifications?.length > 0 && (
                          <div>
                            <h4 className="font-serif font-bold mb-2" style={{ color: robe.maroon }}>
                              Certifications
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {product.details.certifications.map((cert, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] border"
                                  style={{ backgroundColor: robe.cream, borderColor: robe.blush, color: robe.text }}
                                >
                                  {cert}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {product.storage && (
                      <div>
                        <h4 className="font-serif font-bold mb-2" style={{ color: robe.maroon }}>
                          Storage & Handling
                        </h4>
                        <p className="leading-relaxed">{product.storage}</p>
                      </div>
                    )}
                  </div>
                )}

                {tab === "details" && (
                  <div className="grid md:grid-cols-2 gap-8" style={{ color: robe.text }}>
                    <div>
                      <h4 className="font-serif font-bold mb-4" style={{ color: robe.maroon }}>
                        Product Details
                      </h4>
                      <dl className="space-y-3 text-sm">
                        <div className="flex justify-between gap-4 border-b pb-2" style={{ borderColor: robe.blush }}>
                          <dt className="font-semibold" style={{ color: robe.text }}>
                            Category
                          </dt>
                          <dd className="text-right">{categoryLabel}</dd>
                        </div>

                        <div className="flex justify-between gap-4 border-b pb-2" style={{ borderColor: robe.blush }}>
                          <dt className="font-semibold" style={{ color: robe.text }}>
                            Origin
                          </dt>
                          <dd className="text-right">{product.origin || "Bangladesh"}</dd>
                        </div>

                        <div className="flex justify-between gap-4 border-b pb-2" style={{ borderColor: robe.blush }}>
                          <dt className="font-semibold" style={{ color: robe.text }}>
                            SKU
                          </dt>
                          <dd className="text-right">{product.sku || product.slug}</dd>
                        </div>

                        <div className="flex justify-between gap-4 border-b pb-2" style={{ borderColor: robe.blush }}>
                          <dt className="font-semibold" style={{ color: robe.text }}>
                            Price Unit
                          </dt>
                          <dd className="text-right">{priceUnit}</dd>
                        </div>

                        <div className="flex justify-between gap-4 border-b pb-2" style={{ borderColor: robe.blush }}>
                          <dt className="font-semibold" style={{ color: robe.text }}>
                            Availability
                          </dt>
                          <dd className={`text-right px-2 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
                            {statusText}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div>
                      <h4 className="font-serif font-bold mb-4" style={{ color: robe.maroon }}>
                        Storage & Serving
                      </h4>
                      <p className="leading-relaxed">
                        {product.storage || "Store in a cool, dry place away from direct sunlight."}
                      </p>

                      {product.tags && product.tags.length > 0 && (
                        <div className="mt-6">
                          <h5 className="font-semibold mb-2" style={{ color: robe.text }}>
                            Tags
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {product.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] border"
                                style={{ backgroundColor: "white", borderColor: robe.blush, color: robe.text }}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {tab === "reviews" && (
                  <div className="space-y-6" style={{ color: robe.text }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-4xl font-bold" style={{ color: robe.maroon }}>
                            {displayReviewLabel}
                          </div>
                          <div className="flex items-center justify-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < displayReviewRounded ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="text-sm" style={{ color: robe.text }}>
                          Based on {displayReviewCount} review{displayReviewCount !== 1 ? "s" : ""}
                        </div>
                      </div>

                      <PrimaryButton
                        onClick={() => setShowReviewForm((prev) => !prev)}
                        ariaLabel="Write a Review"
                      >
                        Write a Review
                      </PrimaryButton>
                    </div>

                    {showReviewForm && (
                      <form
                        onSubmit={async (event) => {
                          event.preventDefault();
                          setReviewError(null);
                          setReviewSuccess(null);

                          const nameValue = reviewForm.name.trim();
                          const commentValue = reviewForm.comment.trim();

                          if (!nameValue || !commentValue) {
                            setReviewError("Please add your name and review.");
                            return;
                          }

                          setIsSubmittingReview(true);

                          try {
                            const res = await fetch("/api/reviews", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                productId: product.id,
                                name: nameValue,
                                email: reviewForm.email.trim() || undefined,
                                rating: reviewForm.rating,
                                title: reviewForm.title.trim() || undefined,
                                comment: commentValue,
                                source: "product_detail",
                              }),
                            });

                            const payload = await res.json();
                            if (!res.ok) {
                              throw new Error(payload?.error || "Failed to submit review");
                            }

                            setReviewForm({
                              name: "",
                              email: "",
                              rating: 5,
                              title: "",
                              comment: "",
                            });
                            setReviewStats({
                              averageRating: Number(payload?.stats?.averageRating ?? 0),
                              totalReviews: Number(payload?.stats?.totalReviews ?? 0),
                            });
                            await fetchReviews();
                            setReviewSuccess("Thanks for your review! It is saved.");
                          } catch (error) {
                            setReviewError(
                              error instanceof Error
                                ? error.message
                                : "Failed to submit review"
                            );
                          } finally {
                            setIsSubmittingReview(false);
                          }
                        }}
                        className="mt-6 rounded-2xl border p-5 space-y-4"
                        style={{ borderColor: robe.blush }}
                      >
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="space-y-2 text-sm font-semibold" style={{ color: robe.text }}>
                            Name
                            <input
                              value={reviewForm.name}
                              onChange={(event) =>
                                setReviewForm((prev) => ({
                                  ...prev,
                                  name: event.target.value,
                                }))
                              }
                              className="w-full rounded-xl border px-3 py-2 text-sm font-semibold"
                              style={{
                                borderColor: robe.blush,
                                color: robe.text,
                                backgroundColor: "white",
                              }}
                              placeholder="Your name"
                              required
                            />
                          </label>
                          <label className="space-y-2 text-sm font-semibold" style={{ color: robe.text }}>
                            Email (optional)
                            <input
                              type="email"
                              value={reviewForm.email}
                              onChange={(event) =>
                                setReviewForm((prev) => ({
                                  ...prev,
                                  email: event.target.value,
                                }))
                              }
                              className="w-full rounded-xl border px-3 py-2 text-sm font-semibold"
                              style={{
                                borderColor: robe.blush,
                                color: robe.text,
                                backgroundColor: "white",
                              }}
                              placeholder="you@example.com"
                            />
                          </label>
                        </div>

                        <label className="space-y-2 text-sm font-semibold" style={{ color: robe.text }}>
                          Review title (optional)
                          <input
                            value={reviewForm.title}
                            onChange={(event) =>
                              setReviewForm((prev) => ({
                                ...prev,
                                title: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border px-3 py-2 text-sm font-semibold"
                            style={{
                              borderColor: robe.blush,
                              color: robe.text,
                              backgroundColor: "white",
                            }}
                            placeholder="Short headline"
                          />
                        </label>

                        <label className="space-y-2 text-sm font-semibold" style={{ color: robe.text }}>
                          Rating
                          <div className="flex items-center gap-2">
                            {Array.from({ length: 5 }).map((_, i) => {
                              const ratingValue = i + 1;
                              const active = ratingValue <= reviewForm.rating;
                              return (
                                <button
                                  key={`review-rate-${ratingValue}`}
                                  type="button"
                                  onClick={() =>
                                    setReviewForm((prev) => ({
                                      ...prev,
                                      rating: ratingValue,
                                    }))
                                  }
                                  className="rounded-full p-1"
                                  aria-label={`Rate ${ratingValue} star`}
                                >
                                  <Star
                                    className={`h-5 w-5 ${
                                      active
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-gray-300"
                                    }`}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </label>

                        <label className="space-y-2 text-sm font-semibold" style={{ color: robe.text }}>
                          Your review
                          <textarea
                            value={reviewForm.comment}
                            onChange={(event) =>
                              setReviewForm((prev) => ({
                                ...prev,
                                comment: event.target.value,
                              }))
                            }
                            className="min-h-30 w-full rounded-xl border px-3 py-2 text-sm font-semibold"
                            style={{
                              borderColor: robe.blush,
                              color: robe.text,
                              backgroundColor: "white",
                            }}
                            placeholder="Share what you loved..."
                            required
                          />
                        </label>

                        {reviewError && (
                          <p className="rounded-xl border px-3 py-2 text-sm font-semibold"
                             style={{ borderColor: "#f5b5b5", color: "#b42318", backgroundColor: "#fef2f2" }}>
                            {reviewError}
                          </p>
                        )}
                        {reviewSuccess && (
                          <p className="rounded-xl border px-3 py-2 text-sm font-semibold"
                             style={{ borderColor: "#bbf7d0", color: "#166534", backgroundColor: "#f0fdf4" }}>
                            {reviewSuccess}
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={isSubmittingReview}
                          className="inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] transition-all"
                          style={{
                            backgroundColor: isSubmittingReview ? robe.blush : robe.maroon,
                            color: isSubmittingReview ? robe.text : "white",
                          }}
                        >
                          {isSubmittingReview ? "Submitting..." : "Submit review"}
                        </button>
                      </form>
                    )}

                    {isLoadingReviews ? (
                      <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <div
                            key={`review-skeleton-${index}`}
                            className="rounded-2xl border p-4"
                            style={{ borderColor: robe.blush, backgroundColor: "white" }}
                          >
                            <div className="h-4 w-1/2 rounded bg-gray-100" />
                            <div className="mt-3 h-3 w-1/3 rounded bg-gray-100" />
                            <div className="mt-4 h-3 w-full rounded bg-gray-100" />
                            <div className="mt-2 h-3 w-4/5 rounded bg-gray-100" />
                          </div>
                        ))}
                      </div>
                    ) : reviews.length > 0 ? (
                      <div className="space-y-4">
                        {reviews.map((review) => (
                          <div
                            key={review.id}
                            className="rounded-2xl border p-4"
                            style={{ borderColor: robe.blush, backgroundColor: "white" }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold" style={{ color: robe.text }}>
                                  {review.name}
                                </p>
                                <div className="mt-2 flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={`${review.id}-star-${i}`}
                                      className={`h-4 w-4 ${
                                        i < review.rating
                                          ? "fill-amber-400 text-amber-400"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-gray-500">
                                {formatReviewDate(review.createdAt)}
                              </span>
                            </div>

                            {review.title && (
                              <p className="mt-3 text-sm font-semibold" style={{ color: robe.text }}>
                                {review.title}
                              </p>
                            )}
                            <p className="mt-2 text-sm text-gray-600">{review.comment}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12" style={{ color: robe.text }}>
                        <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No reviews yet. Be the first to review this product!</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Related Products */}
          {isLoadingRelated ? (
            <RelatedProductsSkeleton />
          ) : relatedProducts.length > 0 ? (
            <div className="mt-20">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4" style={{ color: robe.maroon }}>
                  You Might Also Like
                </h2>
                <p className="max-w-2xl mx-auto" style={{ color: robe.text }}>
                  Discover more pieces from our curated selection
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {relatedProducts.map((p) => {
                  const productPriceUnit = getPriceUnit(p);
                  return (
                    <Link key={p.id} href={`/products/${p.slug}`} className="group">
                      <div
                        className="relative overflow-hidden rounded-2xl mb-4 border shadow-sm group-hover:shadow-md transition-all duration-200"
                        style={{
                          background: `linear-gradient(135deg, ${robe.blush}, ${robe.cream})`,
                          borderColor: robe.blush,
                        }}
                      >
                        <div className="aspect-square relative">
                          <Image
                            src={p.image}
                            alt={p.name}
                            width={300}
                            height={300}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {p.oldPrice && p.oldPrice > p.price && (
                            <div className="absolute top-3 right-3">
                              <span
                                className="rounded-full px-2 py-1 text-xs font-bold text-white uppercase tracking-[0.14em]"
                                style={{ backgroundColor: robe.maroon }}
                              >
                                {calculateDiscount(p.price, p.oldPrice)}% OFF
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3
                          className="font-semibold group-hover:opacity-80 transition-opacity line-clamp-2"
                          style={{ color: robe.text }}
                        >
                          {p.name}
                        </h3>

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="font-bold" style={{ color: robe.maroon }}>
                              {formatCurrency(p.price)}
                              <span className="text-xs ml-1 font-semibold" style={{ color: robe.text }}>
                                / {productPriceUnit}
                              </span>
                            </p>
                            {p.oldPrice && p.oldPrice > p.price && (
                              <p className="text-xs line-through" style={{ color: robe.sand }}>
                                {formatCurrency(p.oldPrice)}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-semibold" style={{ color: robe.text }}>
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
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ProductDetail({ product }: { product: Product }) {
  return <ProductDetailContent key={product.id} product={product} />;
}
