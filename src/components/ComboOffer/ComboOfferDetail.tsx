/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPriceToBdt } from "@/lib/currency";
import { useCommerce } from "@/context/CommerceContext";
import { useBuyNow } from "@/context/BuyNowContext";
import {
  X,
  Heart,
  Star,
  Share2,
  Shield,
  Truck,
  RotateCcw,
  Gift,
  Layers,
  Percent,
  Calendar,
  Package,
  Zap,
  ZoomIn,
  Move,
} from "lucide-react";

interface DeliveryInfo {
  isFree?: boolean;
  charge?: number | string | null;
  message?: string | null;
}

type NormalizedDelivery = {
  isFree: boolean;
  charge: number;
  message: string;
};

export interface ComboGalleryItem {
  src: string;
  alt: string;
}

export interface ComboOffer {
  id: string;
  _id?: string;

  name: string;
  description: string;
  slug: string;

  thumbnail: string;
  gallery: ComboGalleryItem[];
  media?: {
    thumbnail: string;
    gallery: string[];
    alt?: string;
  };

  pricing: {
    originalTotal: number;
    discountedPrice: number;
    discountPercentage: number;
    currency: string;
  };

  products: Array<{
    productId: string;
    quantity: number;
    product?: {
      id?: string;
      _id?: string;
      name?: string;
      slug?: string;
      image?: string;
      price?: number;
      oldPrice?: number;
      category?: string;
      description?: string;
      [key: string]: unknown;
    };
  }>;

  inventory: {
    totalStock: number;
    soldCount: number;
    status: "active" | "inactive" | "sold_out";
  };

  validity: {
    startDate: string;
    endDate: string;
    isActive: boolean;
  };

  tags: string[];
  features: string[];
  category?: string;
  rating?: number;
  reviewsCount?: number;

  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };

  settings?: {
    isPublished: boolean;
    isFeatured: boolean;
    priority: number;
  };

  analytics?: {
    views: number;
    clicks: number;
    conversions: number;
  };

  createdAt: string;
  updatedAt: string;
  delivery?: DeliveryInfo;
  deliveryCharge?: number;
}

type ComboReview = {
  id: string;
  comboId: string;
  name: string;
  email?: string;
  rating: number;
  title?: string;
  comment: string;
  source?: string;
  createdAt: string;
};

// Normalize image paths
function getImagePath(imagePath?: string) {
  if (!imagePath) return "/images/combo-placeholder.jpg";
  if (imagePath.startsWith("http")) return imagePath;
  if (imagePath.startsWith("/")) return imagePath;
  return `/images/${imagePath}`;
}

// Format currency helper (BDT → ৳)
function formatCurrency(value: number) {
  const bdtValue = formatPriceToBdt(value, { from: "bdt" });

  if (typeof bdtValue === "string") {
    return bdtValue.replace("BDT", "৳").trim();
  }

  return `৳${(bdtValue as number).toLocaleString("en-US")}`;
}

// Calculate savings
const calculateSavings = (combo: ComboOffer) => {
  return combo.pricing.originalTotal - combo.pricing.discountedPrice;
};

// Badge styles (slightly richer but same logic)
const getStatusPill = (status: string, isActive: boolean) => {
  if (status === "sold_out") {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  }
  if (isActive && status === "active") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }
  return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
};

const getStatusText = (status: string, isActive: boolean) => {
  if (status === "sold_out") return "Sold Out";
  if (isActive && status === "active") return "Active";
  return "Inactive";
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const calculateDaysRemaining = (endDate: string) => {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

const parseDeliveryCharge = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
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
      delivery.message ??
      (delivery.isFree
        ? "Free Delivery"
        : `Delivery Charge: ${parsedCharge} ${currency}`),
  };
};

const resolveDeliveryCharge = (
  delivery?: NormalizedDelivery
): number | undefined => {
  if (!delivery) return undefined;
  const chargeValue = delivery.charge ?? 0;
  return delivery.isFree ? 0 : chargeValue;
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

function RelatedCombosSkeleton() {
  return (
    <div className="mt-20 animate-pulse">
      <div className="text-center mb-12">
        <div className="h-8 w-64 bg-slate-200 rounded mx-auto" />
        <div className="h-4 w-96 bg-slate-200 rounded mx-auto mt-4" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`related-combo-skel-${index}`} className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 shadow-sm">
              <div className="aspect-square flex items-center justify-center">
                <div className="h-24 w-24 bg-slate-200 rounded" />
              </div>
            </div>
            <div className="h-4 w-4/5 bg-slate-200 rounded" />
            <div className="h-3 w-2/3 bg-slate-200 rounded" />
            <div className="h-3 w-1/3 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ComboOfferDetail({
  comboOffer,
}: {
  comboOffer: ComboOffer;
}) {
  const {
    addToCart,
    toggleWishlist,
    isInWishlist,
    startSuperiorCheckout,
    isInCart,
  } = useCommerce();
  const { registerComboSelection } = useBuyNow();
  const router = useRouter();

  const [qty, setQty] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [relatedCombos, setRelatedCombos] = useState<ComboOffer[]>([]);
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
  const [tab, setTab] = useState<"description" | "products" | "details" | "reviews">(
    "description"
  );
  const [reviewForm, setReviewForm] = useState({
    name: "",
    email: "",
    rating: 5,
    title: "",
    comment: "",
  });
  const [reviews, setReviews] = useState<ComboReview[]>([]);
  const [reviewStats, setReviewStats] = useState({
    averageRating: 0,
    totalReviews: 0,
  });
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const imageRef = useRef<HTMLDivElement>(null);
  const zoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cartProduct = useMemo(() => {
    const currency = comboOffer.pricing?.currency || "BDT";
    const normalizedDelivery = normalizeDeliveryData(comboOffer.delivery, currency);
    return {
      ...comboOffer,
      id: comboOffer.id,
      name: comboOffer.name,
      price: comboOffer.pricing.discountedPrice,
      image: comboOffer.thumbnail,
      slug:
        comboOffer.slug ||
        comboOffer.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      oldPrice: comboOffer.pricing.originalTotal,
      description: comboOffer.description,
      isCombo: true,
      delivery: normalizedDelivery,
      deliveryCharge: normalizedDelivery?.charge,
    };
  }, [comboOffer]);

  const remainingStock =
    comboOffer.inventory.totalStock - comboOffer.inventory.soldCount;
  const inStock =
    remainingStock > 0 && comboOffer.inventory.status === "active";
  const isActive = comboOffer.validity.isActive;
  const maxQty = inStock ? remainingStock : 1;

  const comboIsInCart = isInCart(cartProduct.id);
  const comboButtonDisabled = !inStock || !isActive || comboIsInCart;

  const comboButtonLabel = !isActive
    ? "Offer Expired"
    : !inStock
    ? "Sold Out"
    : comboIsInCart
    ? "In Cart"
    : "Add Combo to Cart";

  const handleAddToCart = () => {
    if (comboButtonDisabled) return;
    addToCart(cartProduct, displayQty);
  };

  // Safe settings + analytics defaults
  const settings = comboOffer.settings ?? {
    isPublished: true,
    isFeatured: false,
    priority: 0,
  };

  const gallery = useMemo(
    () =>
      comboOffer.gallery?.length
        ? comboOffer.gallery
        : [
            {
              src: comboOffer.thumbnail,
              alt: `${comboOffer.name} combo`,
            },
          ],
    [comboOffer]
  );

  const safeIndex = useMemo(
    () => Math.min(activeIndex, Math.max(gallery.length - 1, 0)),
    [activeIndex, gallery.length]
  );

  const currentImage = gallery[safeIndex] ?? gallery[0];
  const ratingValue = Number(comboOffer.rating ?? 0);
  const reviewsLabel = comboOffer.reviewsCount ?? 0;
  const displayReviewAverage =
    reviewStats.totalReviews > 0 ? reviewStats.averageRating : ratingValue;
  const displayReviewCount =
    reviewStats.totalReviews > 0 ? reviewStats.totalReviews : reviewsLabel;
  const displayReviewLabel = displayReviewAverage
    ? displayReviewAverage.toFixed(1)
    : "0.0";
  const displayReviewRounded = Math.round(displayReviewAverage);
  const savings = calculateSavings(comboOffer);
  const daysRemaining = calculateDaysRemaining(comboOffer.validity.endDate);
  const statusText = getStatusText(comboOffer.inventory.status, isActive);
  const statusPill = getStatusPill(comboOffer.inventory.status, isActive);

  const displayQty = Math.min(qty, maxQty);

  const handleBuyNow = () => {
    if (!inStock || !isActive) return;
    registerComboSelection(
      {
        comboOffer,
        cartProduct,
      },
      displayQty
    );
    startSuperiorCheckout(cartProduct, displayQty);
    router.push("/checkout");
  };

  const fetchReviews = useCallback(async () => {
    if (!comboOffer.id) return;
    setIsLoadingReviews(true);
    setReviewError(null);
    try {
      const res = await fetch(
        `/api/reviews?comboId=${encodeURIComponent(comboOffer.id)}`
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
  }, [comboOffer.id]);

  const handleReviewSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!comboOffer.id) return;

    const nameValue = reviewForm.name.trim();
    const commentValue = reviewForm.comment.trim();

    if (!nameValue || !commentValue) {
      setReviewError("Please add your name and review.");
      return;
    }

    setIsSubmittingReview(true);
    setReviewError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comboId: comboOffer.id,
          name: nameValue,
          email: reviewForm.email.trim() || undefined,
          rating: reviewForm.rating,
          title: reviewForm.title.trim() || undefined,
          comment: commentValue,
          source: "combo_offer",
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

      const stats = payload?.stats ?? {};
      setReviewStats({
        averageRating: Number(stats.averageRating ?? 0),
        totalReviews: Number(stats.totalReviews ?? 0),
      });

      await fetchReviews();
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Failed to submit review"
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  useEffect(() => {
    if (tab !== "reviews") return;
    if (!comboOffer.id) return;
    void fetchReviews();
  }, [tab, comboOffer.id, fetchReviews]);

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

  // Fetch related combo offers
  useEffect(() => {
    let isMounted = true;
    const fetchRelatedCombos = async () => {
      setIsLoadingRelated(true);
      setRelatedCombos([]);
      try {
        const response = await fetch("/api/combo-offers?limit=8");
        if (response.ok) {
          const data = await response.json();

          const transformedCombos: ComboOffer[] =
            data.offers?.map((combo: any) => {
              const uiGallery =
                Array.isArray(combo.gallery) && combo.gallery.length > 0
                  ? combo.gallery.map((src: string) => ({
                      src: getImagePath(src),
                      alt: `${combo.name} combo`,
                    }))
                  : [
                      {
                        src: getImagePath(combo.thumbnail),
                        alt: `${combo.name} combo`,
                      },
                    ];

              const currency = combo.pricing?.currency || "BDT";
              const deliveryData = normalizeDeliveryData(combo.delivery, currency);
              const deliveryCharge = resolveDeliveryCharge(deliveryData);

              return {
                id: combo._id,
                _id: combo._id,
                name: combo.name,
                description: combo.description,
                slug: combo.slug,
                thumbnail: getImagePath(combo.thumbnail),
                gallery: uiGallery,
                pricing: combo.pricing,
                products: combo.products || [],
                inventory: combo.inventory,
                validity: combo.validity,
                tags: combo.tags || [],
                features: combo.features || [],
                category: combo.category,
                rating: combo.rating ?? 4.5,
                reviewsCount: combo.reviewsCount ?? 0,
                media: combo.media,
                seo: combo.seo,
                settings: combo.settings ?? {
                  isPublished: true,
                  isFeatured: false,
                  priority: 0,
                },
                analytics: combo.analytics ?? {
                  views: 0,
                  clicks: 0,
                  conversions: 0,
                },
                createdAt: combo.createdAt,
                updatedAt: combo.updatedAt,
                delivery: deliveryData,
                deliveryCharge,
              };
            }) || [];

          const filtered = transformedCombos
            .filter((c) => c.id !== comboOffer.id)
            .slice(0, 4);

          if (isMounted) setRelatedCombos(filtered);
        }
      } catch (error) {
        console.error("Error fetching related combos:", error);
      } finally {
        if (isMounted) setIsLoadingRelated(false);
      }
    };

    fetchRelatedCombos();
    return () => {
      isMounted = false;
    };
  }, [comboOffer.id]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setActiveIndex(0));
    return () => cancelAnimationFrame(frame);
  }, [comboOffer.id]);

  useEffect(() => {
    if (activeIndex === safeIndex) return;
    const frame = requestAnimationFrame(() => setActiveIndex(safeIndex));
    return () => cancelAnimationFrame(frame);
  }, [activeIndex, safeIndex]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setQty((q) => {
        if (!inStock) return 1;
        return Math.min(Math.max(q, 1), maxQty);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [inStock, maxQty]);

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowShareMenu(false);

    if (showShareMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showShareMenu]);

  // Cleanup zoom timer on unmount
  useEffect(() => {
    return () => {
      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    };
  }, []);

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
    if (isMobile) return;
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

  // -----------------------------
  // Style tokens (Tailwind only)
  // -----------------------------
  const pageBg =
    "min-h-screen bg-gradient-to-br from-amber-50 via-white to-rose-50 text-slate-900";
  const container = "mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8";
  const card =
    "rounded-2xl bg-white/80 backdrop-blur-md ring-1 ring-slate-200/70 shadow-[0_10px_30px_-18px_rgba(2,6,23,0.35)]";
  const softCard =
    "rounded-2xl bg-linear-to-br from-white to-slate-50 ring-1 ring-slate-200/70 shadow-sm";
  const subtleText = "text-slate-600";
  const heading = "font-extrabold tracking-tight text-slate-900";
  const pillBase =
    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold";
  const brandPill =
    "bg-linear-to-r from-amber-100 to-rose-100 text-rose-800 ring-1 ring-rose-200/70";
  const infoPill =
    "bg-sky-50 text-sky-700 ring-1 ring-sky-200/70";
  const neutralPill =
    "bg-slate-50 text-slate-700 ring-1 ring-slate-200/70";

  const iconBtnBase =
    "group relative grid place-items-center h-10 w-10 rounded-xl ring-1 transition-all duration-200 active:scale-95";
  const iconBtn =
    "bg-white/90 ring-slate-200 text-slate-700 hover:bg-white hover:shadow-md";
  const iconBtnOn =
    "bg-rose-50 ring-rose-200 text-rose-700 hover:bg-rose-100 hover:shadow-md";

  const primaryBtnBase =
    "group  inline-flex items-center justify-center gap-2 rounded-none px-6 py-3 text-sm font-bold tracking-wide transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
  const primaryBtn =
    "bg-slate-100 text-[#944C35] shadow-sm hover:bg-slate-200";
  const primaryBtnDisabled =
    "bg-slate-200 text-slate-400 shadow-none";

  const secondaryBtn =
    "bg-[#6B0F1A] text-white hover:bg-[#6B0F1A]";

  const tabBase =
    "cursor-pointer rounded-none px-6 py-3 text-sm font-extrabold text-[#944C35] transition-all duration-200";
  const tabOn =
    "bg-white shadow-md";
  const tabOff =
    "text-[#944C35] hover:bg-white/60";

  return (
    <div className={pageBg}>
      <div className={container}>
        {/* Breadcrumb */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-900 transition-colors">
              Home
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/combo-offers" className="hover:text-slate-900 transition-colors">
              Combo Offers
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold">{comboOffer.name}</span>
          </div>
        </nav>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative">
              <div
                ref={imageRef}
                className={[
                  "aspect-square overflow-hidden rounded-2xl relative cursor-pointer",
                  "bg-linear-to-br from-amber-100 via-orange-100 to-rose-100",
                  "ring-1 ring-slate-200 shadow-lg shadow-orange-100/60",
                ].join(" ")}
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
                  <span className={`${pillBase} ${statusPill}`}>
                    {statusText}
                  </span>
                </div>

                {/* Discount Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <span
                    className={`${pillBase} bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-sm`}
                  >
                    {comboOffer.pricing.discountPercentage}% OFF
                  </span>
                </div>

                <Image
                  src={currentImage?.src ?? comboOffer.thumbnail}
                  alt={currentImage?.alt ?? comboOffer.name}
                  width={900}
                  height={900}
                  className="h-full w-full object-cover"
                  priority
                />

                {/* Zoom Indicator */}
                {!isMobile && isZoomActive && (
                  <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 bg-slate-900/75 text-white px-3 py-1.5 rounded-full text-xs lg:hidden">
                    <ZoomIn className="w-3 h-3" />
                    <span className="font-semibold">Zoom Active • Tap to adjust</span>
                  </div>
                )}

                {/* Zoom Toggle Button */}
                {!isMobile && (
                  <button
                    onClick={toggleZoomPanel}
                    className="absolute bottom-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-xl ring-1 ring-slate-200 shadow-md hover:shadow-lg hover:bg-white transition-all lg:hidden active:scale-95"
                    title={showZoomPanel ? "Hide Zoom" : "Show Zoom"}
                  >
                    <ZoomIn
                      className={`w-5 h-5 ${
                        isZoomActive ? "text-orange-600" : "text-slate-700"
                      }`}
                    />
                  </button>
                )}
              </div>

              {/* Zoom Preview Overlay */}
              {showZoom && !isZoomActive && (
                <div className="absolute left-[calc(100%+1rem)] top-0 w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-slate-200 z-20 hidden lg:block">
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: `url(${currentImage?.src ?? comboOffer.thumbnail})`,
                      backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                      backgroundSize: `${zoomScale * 100}%`,
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={() => setZoomScale((prev) => Math.max(1.5, prev - 0.5))}
                      className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-sm font-bold ring-1 ring-slate-200 hover:bg-white active:scale-95"
                    >
                      −
                    </button>
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-sm font-extrabold ring-1 ring-slate-200">
                      {zoomScale.toFixed(1)}x
                    </span>
                    <button
                      onClick={() => setZoomScale((prev) => Math.min(4, prev + 0.5))}
                      className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-sm font-bold ring-1 ring-slate-200 hover:bg-white active:scale-95"
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
                    onClick={() => setActiveIndex(i)}
                    className={[
                      "relative h-16 w-16 overflow-hidden rounded-xl border-2 transition-all duration-200",
                      i === safeIndex
                        ? "border-orange-500 shadow-md"
                        : "border-slate-200 hover:border-slate-400",
                    ].join(" ")}
                  >
                    <Image
                      src={g.src}
                      alt={g.alt ?? `${comboOffer.name} gallery`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Zoom Panel for Mobile */}
            {!isMobile && showZoomPanel && (
              <div className={`${softCard} mt-6 p-4 lg:hidden`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ZoomIn className="w-5 h-5 text-orange-600" />
                    <h3 className="font-extrabold text-slate-900">Image Zoom</h3>
                  </div>
                  <button
                    onClick={closeZoomPanel}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
                    title="Close Zoom"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage: `url(${currentImage?.src ?? comboOffer.thumbnail})`,
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
                  <div className="mt-2 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Move className="w-3 h-3" />
                    <span className="font-semibold">Pinch to zoom • Drag to pan</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Zoom Level</span>
                    <span className="text-lg font-extrabold text-orange-700">
                      {zoomScale.toFixed(1)}x
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setZoomScale(Math.min(zoomScale + 0.5, 4))}
                      className="px-4 py-2 rounded-full ring-1 ring-slate-200 text-sm font-extrabold hover:bg-slate-100 active:scale-95"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setZoomScale(Math.max(zoomScale - 0.5, 1))}
                      className="px-4 py-2 rounded-full ring-1 ring-slate-200 text-sm font-extrabold hover:bg-slate-100 active:scale-95"
                    >
                      −
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Details / Zoom Info */}
          <div className="relative">
            {showZoom && !isMobile ? (
              <div className={`${card} p-8 space-y-4 flex flex-col items-center justify-center min-h-75`}>
                <div className="text-center max-w-sm">
                  <ZoomIn className="w-10 h-10 mx-auto text-orange-600 mb-3" />
                  <h3 className="text-xl font-extrabold text-slate-900 mb-2">
                    Image Zoom Active
                  </h3>
                  <p className="text-slate-600 text-sm mb-4">
                    Move your cursor over the image to zoom. Use +/- buttons to
                    adjust zoom level.
                  </p>
                  <div className="flex items-center justify-center gap-3 mb-5">
                    <div className="text-center">
                      <div className="text-lg font-extrabold text-orange-700">
                        {zoomScale.toFixed(1)}x
                      </div>
                      <div className="text-xs text-slate-500 font-semibold">Zoom Level</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowZoom(false)}
                    className="px-4 py-2 bg-orange-600 text-white font-extrabold rounded-xl hover:bg-orange-700 transition-colors active:scale-95"
                  >
                    Close Zoom
                  </button>
                </div>
              </div>
            ) : (
              <div className={`${card} p-6 sm:p-8 space-y-6`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`${pillBase} ${brandPill}`}>
                        <Gift className="w-3 h-3" />
                        Combo Offer
                      </span>
                      <span className={`${pillBase} ${infoPill}`}>
                        <Layers className="w-3 h-3" />
                        {comboOffer.products.length} Products
                      </span>
                      {comboOffer.category && (
                        <span className={`${pillBase} ${neutralPill}`}>
                          Category: <span className="font-extrabold">{comboOffer.category}</span>
                        </span>
                      )}
                    </div>

                    <h1 className={`text-3xl sm:text-4xl ${heading} mb-2`}>
                      {comboOffer.name}
                    </h1>

                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < displayReviewRounded
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-slate-600 font-semibold">
                        {displayReviewLabel} ({displayReviewCount} reviews)
                      </span>
                      <span
                        className={`text-sm font-extrabold ${
                          inStock ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {inStock ? `${remainingStock} available` : "Out of stock"}
                      </span>
                    </div>

                    <p className="text-slate-600 leading-relaxed">
                      {comboOffer.description}
                    </p>

                    {/* Validity */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span className="font-semibold">
                        Valid from {formatDate(comboOffer.validity.startDate)} to{" "}
                        {formatDate(comboOffer.validity.endDate)}
                      </span>
                      {daysRemaining > 0 && (
                        <span className={`${pillBase} bg-orange-50 text-orange-700 ring-1 ring-orange-200/70`}>
                          {daysRemaining} days left
                        </span>
                      )}
                    </div>

                    {/* Features */}
                    {comboOffer.features?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {comboOffer.features.slice(0, 3).map((feature, index) => (
                          <span
                            key={index}
                            className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                          >
                            {feature}
                          </span>
                        ))}
                        {comboOffer.features.length > 3 && (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                            +{comboOffer.features.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Wishlist & Share */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleWishlist(cartProduct)}
                      className={`${iconBtnBase} ${
                        isInWishlist(comboOffer.id) ? iconBtnOn : iconBtn
                      }`}
                      title={
                        isInWishlist(comboOffer.id)
                          ? "Remove from wishlist"
                          : "Add to wishlist"
                      }
                    >
                      <Heart
                        className={`w-5 h-5 transition-transform duration-200 ${
                          isInWishlist(comboOffer.id)
                            ? "fill-current"
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
                        className={`${iconBtnBase} ${iconBtn}`}
                        title="Share combo offer"
                      >
                        <Share2 className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                      </button>

                      {showShareMenu && (
                        <div className="absolute right-0 top-12 bg-white rounded-2xl shadow-2xl p-2 z-20 min-w-44 ring-1 ring-slate-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(window.location.href);
                              setShowShareMenu(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 rounded-xl transition-colors duration-200 flex items-center gap-3"
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
                                `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                                  `Check out this combo offer: ${comboOffer.name} - Save ${comboOffer.pricing.discountPercentage}%!`
                                )}&url=${encodeURIComponent(window.location.href)}`
                              );
                              setShowShareMenu(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 rounded-xl transition-colors duration-200 flex items-center gap-3"
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

                {/* Pricing & Savings */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="text-3xl font-extrabold text-slate-900">
                      {formatCurrency(comboOffer.pricing.discountedPrice)}
                    </div>
                    <div className="text-lg font-bold text-slate-400 line-through">
                      {formatCurrency(comboOffer.pricing.originalTotal)}
                    </div>
                    <div className={`${pillBase} bg-linear-to-r from-amber-100 to-rose-100 text-rose-800 ring-1 ring-rose-200/70`}>
                      <Percent className="w-4 h-4" />
                      Save {comboOffer.pricing.discountPercentage}%
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-emerald-700">
                    <Zap className="w-4 h-4" />
                    <span className="font-bold">
                      You save {formatCurrency(savings)} on this combo!
                    </span>
                  </div>
                </div>

                {/* Products summary */}
                <div className="rounded-2xl p-4 bg-linear-to-r from-amber-50 to-rose-50 ring-1 ring-orange-200/60">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-orange-700" />
                    <h3 className="font-extrabold text-slate-900">
                      This Combo Includes
                    </h3>
                    <span className="ml-auto text-sm text-slate-600 font-bold">
                      {comboOffer.products.length} items
                    </span>
                  </div>

                  <div className="flex -space-x-2">
                    {comboOffer.products.slice(0, 5).map((item, index) => (
                      <div
                        key={item.productId}
                        className="relative w-10 h-10 rounded-full ring-2 ring-white bg-white overflow-hidden shadow-sm"
                        title={item.product?.name || `Product ${index + 1}`}
                      >
                        {item.product?.image ? (
                          <Image
                            src={getImagePath(item.product.image)}
                            alt={item.product.name || "Product image"}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100">
                            <Package className="w-4 h-4 text-slate-400" />
                          </div>
                        )}

                        {item.quantity > 1 && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange-600 text-white text-xs rounded-full flex items-center justify-center font-extrabold shadow-sm">
                            {item.quantity}
                          </div>
                        )}
                      </div>
                    ))}

                    {comboOffer.products.length > 5 && (
                      <div className="relative w-10 h-10 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-xs font-extrabold text-slate-700">
                        +{comboOffer.products.length - 5}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantity & actions */}
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-base font-extrabold text-slate-900">
                      Quantity
                    </span>

                    <div className="flex items-center bg-white ring-1 ring-slate-200 rounded-none shadow-sm overflow-hidden">
                      <button
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="h-12 w-12 grid bg-[#6B0F1A] place-items-center hover:bg-slate-50 transition-all text-lg font-extrabold text-white hover:text-slate-900 active:scale-95"
                      >
                        −
                      </button>
                      <div className="h-12 w-16 grid place-items-center bg-slate-50 ring-1 ring-slate-200/60 font-extrabold text-base text-slate-900">
                        {qty}
                      </div>
                      <button
                        onClick={() => setQty((q) => Math.min(q + 1, maxQty))}
                        className="h-12 w-12 bg-[#2F5D50] text-white grid place-items-center hover:bg-slate-50 transition-all text-lg font-extrabold hover:text-slate-900 active:scale-95"
                      >
                        +
                      </button>
                    </div>

                    {inStock && (
                      <span className="text-xs font-semibold text-slate-500">
                        Max {maxQty} per order
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {/* Add to Cart */}
                    <button
                      onClick={handleAddToCart}
                      disabled={comboButtonDisabled}
                      className={[
                        primaryBtnBase,
                        comboButtonDisabled ? primaryBtnDisabled : primaryBtn,
                        "flex-1",
                      ].join(" ")}
                      aria-label={`${comboButtonLabel} ${comboOffer.name} combo`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6"
                        />
                      </svg>
                      <span>{comboButtonLabel}</span>
                    </button>

                    {/* Buy Now */}
                    <button
                      onClick={handleBuyNow}
                      disabled={!inStock || !isActive}
                      className={[
                        primaryBtnBase,
                        "flex-1 bg-[#6B0F1A]",
                        inStock && isActive
                          ? secondaryBtn
                          : "border-2 border-slate-200 bg-[#6B0F1A] text-slate-400",
                      ].join(" ")}
                    >
                      Buy Now
                    </button>
                  </div>
                </div>

                {/* Trust badges */}
                <div className="grid grid-cols-3 gap-3 py-4 border-y border-slate-200/70">
                  <div className="flex items-center gap-2 text-sm text-slate-600 font-semibold">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span>Secure Payment</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 font-semibold">
                    <Truck className="w-4 h-4 text-sky-600" />
                    <span>Free Shipping</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 font-semibold">
                    <RotateCcw className="w-4 h-4 text-violet-600" />
                    <span>Easy Returns</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-12 pt-2">
          <div className={`${card} p-2`}>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setTab("description")}
                className={`${tabBase} ${tab === "description" ? tabOn : tabOff}`}
              >
                Overview
              </button>
              <button
                onClick={() => setTab("products")}
                className={`${tabBase} ${tab === "products" ? tabOn : tabOff}`}
              >
                Products ({comboOffer.products.length})
              </button>
              <button
                onClick={() => setTab("details")}
                className={`${tabBase} ${tab === "details" ? tabOn : tabOff}`}
              >
                Details
              </button>
              <button
                onClick={() => setTab("reviews")}
                className={`${tabBase} ${tab === "reviews" ? tabOn : tabOff}`}
              >
                Reviews ({displayReviewCount})
              </button>
            </div>
          </div>

          <div className={`${card} mt-4 p-6 sm:p-8`}>
            {tab === "description" && (
              <div className="prose prose-sm max-w-none text-slate-700 space-y-6">
                <p className="text-base leading-relaxed font-medium">
                  {comboOffer.description}
                </p>

                {comboOffer.features?.length > 0 && (
                  <div>
                    <h4 className="font-extrabold text-slate-900 mb-3">
                      Combo Features
                    </h4>
                    <ul className="grid gap-3">
                      {comboOffer.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
                          <span className="font-medium">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {comboOffer.tags?.length > 0 && (
                  <div>
                    <h4 className="font-extrabold text-slate-900 mb-3">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {comboOffer.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-orange-50 px-3 py-1 text-xs font-extrabold text-orange-700 ring-1 ring-orange-200/70"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "products" && (
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-900 mb-4">
                  Products in this Combo
                </h4>
                <div className="space-y-3">
                  {comboOffer.products.map((item, index) => (
                    <div
                      key={item.productId}
                      className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 ring-1 ring-slate-200/70"
                    >
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white ring-1 ring-slate-200">
                        {item.product?.image ? (
                          <Link href={`/products/${item.product?.slug || "#"}`}>
                            <Image
                              src={getImagePath(item.product.image)}
                              alt={item.product.name || "Product image"}
                              width={48}
                              height={48}
                              className="object-cover"
                            />
                          </Link>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100">
                            <Package className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h5 className="font-extrabold text-slate-900 truncate">
                          <Link href={`/products/${item.product?.slug || "#"}`}>
                            {item.product?.name || `Product ${index + 1}`}
                          </Link>
                        </h5>
                        {item.product?.price != null && (
                          <p className="text-sm text-slate-600 font-semibold">
                            {formatCurrency(item.product.price)} each
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-extrabold text-slate-900">
                          × {item.quantity}
                        </div>
                        {item.product?.price != null && (
                          <div className="text-xs text-slate-500 font-semibold">
                            {formatCurrency((item.product.price || 0) * item.quantity)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "details" && (
              <div className="prose prose-sm max-w-none text-slate-700">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-extrabold text-slate-900 mb-4">
                      Offer Details
                    </h4>

                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="font-bold text-slate-900">Offer Status</dt>
                        <dd className={`${pillBase} ${statusPill}`}>{statusText}</dd>
                      </div>

                      {comboOffer.category && (
                        <div className="flex justify-between gap-4">
                          <dt className="font-bold text-slate-900">Category</dt>
                          <dd className="text-right font-semibold">{comboOffer.category}</dd>
                        </div>
                      )}

                      <div className="flex justify-between gap-4">
                        <dt className="font-bold text-slate-900">Start Date</dt>
                        <dd className="text-right font-semibold">
                          {formatDate(comboOffer.validity.startDate)}
                        </dd>
                      </div>

                      <div className="flex justify-between gap-4">
                        <dt className="font-bold text-slate-900">End Date</dt>
                        <dd className="text-right font-semibold">
                          {formatDate(comboOffer.validity.endDate)}
                        </dd>
                      </div>

                      <div className="flex justify-between gap-4">
                        <dt className="font-bold text-slate-900">Days Remaining</dt>
                        <dd className="text-right font-extrabold text-orange-700">
                          {daysRemaining}
                        </dd>
                      </div>

                      <div className="flex justify-between gap-4">
                        <dt className="font-bold text-slate-900">Total Products</dt>
                        <dd className="text-right font-semibold">{comboOffer.products.length}</dd>
                      </div>

                      <div className="flex justify-between gap-4">
                        <dt className="font-bold text-slate-900">Original Total</dt>
                        <dd className="text-right font-semibold">
                          {formatCurrency(comboOffer.pricing.originalTotal)}
                        </dd>
                      </div>

                      <div className="flex justify-between gap-4">
                        <dt className="font-bold text-slate-900">Discount</dt>
                        <dd className="text-right font-extrabold text-emerald-700">
                          {comboOffer.pricing.discountPercentage}%
                        </dd>
                      </div>

                      <div className="flex justify-between gap-4">
                        <dt className="font-bold text-slate-900">You Save</dt>
                        <dd className="text-right font-extrabold text-emerald-700">
                          {formatCurrency(savings)}
                        </dd>
                      </div>

                      <div className="flex justify-between gap-4">
                        <dt className="font-bold text-slate-900">Published</dt>
                        <dd className="text-right font-semibold">
                          {settings.isPublished ? "Yes" : "No"}
                        </dd>
                      </div>

                      <div className="flex justify-between gap-4">
                        <dt className="font-bold text-slate-900">Featured</dt>
                        <dd className="text-right font-semibold">
                          {settings.isFeatured ? "Yes" : "No"}
                        </dd>
                      </div>

                      <div className="flex justify-between gap-4">
                        <dt className="font-bold text-slate-900">Priority</dt>
                        <dd className="text-right font-semibold">{settings.priority}</dd>
                      </div>

                      <div className="flex justify-between gap-4">
                        <dt className="font-bold text-slate-900">Created At</dt>
                        <dd className="text-right font-semibold">
                          {formatDate(comboOffer.createdAt)}
                        </dd>
                      </div>

                      <div className="flex justify-between gap-4">
                        <dt className="font-bold text-slate-900">Last Updated</dt>
                        <dd className="text-right font-semibold">
                          {formatDate(comboOffer.updatedAt)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-extrabold text-slate-900">
                      Additional Information
                    </h4>
                    <p className="leading-relaxed font-medium text-slate-700">
                      This is a limited time combo offer. Products may be substituted with
                      similar items of equal or greater value if out of stock.
                    </p>

                    {comboOffer.seo && (
                      <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 p-4">
                        <h5 className="font-extrabold text-slate-900 mb-2">
                          SEO Information
                        </h5>
                        <ul className="space-y-1 text-sm text-slate-600 font-semibold">
                          {comboOffer.seo.title && (
                            <li>
                              <span className="font-extrabold text-slate-900">Title: </span>
                              {comboOffer.seo.title}
                            </li>
                          )}
                          {comboOffer.seo.description && (
                            <li>
                              <span className="font-extrabold text-slate-900">Description: </span>
                              {comboOffer.seo.description}
                            </li>
                          )}
                          {comboOffer.seo.keywords && comboOffer.seo.keywords.length > 0 && (
                            <li>
                              <span className="font-extrabold text-slate-900">Keywords: </span>
                              {comboOffer.seo.keywords.join(", ")}
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                  <div className="rounded-2xl bg-linear-to-br from-amber-50 to-rose-50 ring-1 ring-orange-200/60 p-4">
                      <h5 className="font-extrabold text-slate-900 mb-2">
                        Terms & Conditions
                      </h5>
                      <ul className="space-y-2 text-sm text-slate-700 font-semibold">
                        {[
                          "Offer valid while supplies last",
                          "Cannot be combined with other offers",
                          "Free shipping on all combo orders",
                          "Normal return policy applies",
                        ].map((t) => (
                          <li key={t} className="flex items-start gap-2">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500 mt-2" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "reviews" && (
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-6">
                  <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 p-5">
                    <div className="flex items-center justify-between gap-6">
                      <div>
                        <div className="text-3xl font-extrabold text-slate-900">
                          {displayReviewLabel}
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={`review-summary-${i}`}
                              className={`h-4 w-4 ${
                                i < displayReviewRounded
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-300"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-600">
                          Based on {displayReviewCount} review
                          {displayReviewCount !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-600">
                        Verified feedback
                      </div>
                    </div>
                  </div>

                  <form
                    onSubmit={handleReviewSubmit}
                    className="space-y-5 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm"
                  >
                    <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-500">
                      Reviewing {comboOffer.name}
                    </p>

                    <div className="space-y-2">
                      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-500">
                        Your rating
                      </p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => {
                          const ratingValue = i + 1;
                          const isActive = ratingValue <= reviewForm.rating;
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
                              className="rounded-full p-1 transition-transform hover:scale-105"
                              aria-label={`Rate ${ratingValue} star`}
                            >
                              <Star
                                className={`h-5 w-5 ${
                                  isActive
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-300"
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2 text-sm font-semibold text-slate-700">
                        Name
                        <input
                          value={reviewForm.name}
                          onChange={(event) =>
                            setReviewForm((prev) => ({
                              ...prev,
                              name: event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
                          placeholder="Your name"
                          required
                        />
                      </label>
                      <label className="space-y-2 text-sm font-semibold text-slate-700">
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
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
                          placeholder="you@example.com"
                        />
                      </label>
                    </div>

                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      Review title (optional)
                      <input
                        value={reviewForm.title}
                        onChange={(event) =>
                          setReviewForm((prev) => ({
                            ...prev,
                            title: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        placeholder="Short headline"
                      />
                    </label>

                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      Your review
                      <textarea
                        value={reviewForm.comment}
                        onChange={(event) =>
                          setReviewForm((prev) => ({
                            ...prev,
                            comment: event.target.value,
                          }))
                        }
                        className="min-h-30 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        placeholder="Share what you loved..."
                        required
                      />
                    </label>

                    {reviewError && (
                      <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                        {reviewError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingReview || !comboOffer.id}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-orange-600 px-4 py-3 text-sm font-extrabold uppercase tracking-[0.18em] text-white transition-all hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-200"
                    >
                      {isSubmittingReview ? "Submitting..." : "Submit review"}
                    </button>
                  </form>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-extrabold text-slate-900">
                      Recent reviews
                    </h4>
                    <span className="text-xs font-semibold text-slate-500">
                      {comboOffer.name}
                    </span>
                  </div>

                  {isLoadingReviews ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div
                          key={`review-skeleton-${index}`}
                          className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm"
                        >
                          <div className="h-4 w-1/2 rounded bg-slate-100" />
                          <div className="mt-3 h-3 w-1/3 rounded bg-slate-100" />
                          <div className="mt-4 h-3 w-full rounded bg-slate-100" />
                          <div className="mt-2 h-3 w-4/5 rounded bg-slate-100" />
                        </div>
                      ))}
                    </div>
                  ) : reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div
                          key={review.id}
                          className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-extrabold text-slate-900">
                                {review.name}
                              </p>
                              <div className="mt-2 flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={`${review.id}-star-${i}`}
                                    className={`h-4 w-4 ${
                                      i < review.rating
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-slate-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-slate-500">
                              {formatReviewDate(review.createdAt)}
                            </span>
                          </div>

                          {review.title && (
                            <p className="mt-3 text-sm font-bold text-slate-900">
                              {review.title}
                            </p>
                          )}
                          <p className="mt-2 text-sm text-slate-600">
                            {review.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
                      No reviews yet. Be the first to share your thoughts.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Combo Offers */}
        {isLoadingRelated ? (
          <RelatedCombosSkeleton />
        ) : relatedCombos.length > 0 ? (
          <div className="mt-20">
            <div className="text-center mb-12">
              <h2 className={`text-3xl sm:text-4xl ${heading} mb-3`}>
                More Combo Offers
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto font-medium">
                Explore more amazing bundle deals and save even more on your favorite products.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedCombos.map((combo) => (
                <Link
                  key={combo.id}
                  href={`/combo-offers/${combo.slug}`}
                  className="group"
                >
                  <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-amber-100 via-orange-100 to-rose-100 mb-4 shadow-sm ring-1 ring-slate-200 group-hover:shadow-lg transition-all duration-300">
                    <div className="aspect-square relative">
                      <Image
                        src={getImagePath(combo.thumbnail)}
                        alt={combo.name}
                        width={400}
                        height={400}
                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute top-3 right-3">
                        <span className={`${pillBase} bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-sm`}>
                          {combo.pricing.discountPercentage}% OFF
                        </span>
                      </div>
                    </div>

                    <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const normalizedDelivery = normalizeDeliveryData(
                            combo.delivery,
                            combo.pricing.currency
                          );
                          toggleWishlist({
                            id: combo.id,
                            name: combo.name,
                            price: combo.pricing.discountedPrice,
                            image: combo.thumbnail,
                            slug: combo.slug,
                            oldPrice: combo.pricing.originalTotal,
                            isCombo: true,
                            delivery: normalizedDelivery,
                            deliveryCharge: resolveDeliveryCharge(normalizedDelivery),
                          });
                        }}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors active:scale-95 ring-1 ring-slate-200"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isInWishlist(combo.id)
                              ? "fill-rose-600 text-rose-600"
                              : "text-slate-700"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-extrabold text-slate-900 group-hover:text-orange-700 transition-colors line-clamp-2">
                      {combo.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-extrabold text-slate-900">
                          {formatCurrency(combo.pricing.discountedPrice)}
                        </p>
                        <p className="text-xs text-slate-500 line-through font-bold">
                          {formatCurrency(combo.pricing.originalTotal)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-600 font-bold">
                          {combo.products.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
