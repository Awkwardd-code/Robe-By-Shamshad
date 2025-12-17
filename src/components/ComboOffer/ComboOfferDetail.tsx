/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPriceToBdt } from "@/lib/currency";
import { useCommerce } from "@/context/CommerceContext";
import { useBuyNow } from "@/context/BuyNowContext";
import {
  ChevronLeft,
  ChevronRight,
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
  Scale,
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

/**
 * UI shape for gallery items (we wrap backend string[] gallery into this)
 */
export interface ComboGalleryItem {
  src: string;
  alt: string;
}

/**
 * Combo offer interface including backend fields + UI fields
 */
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

// Get status badge color
const getStatusColor = (status: string, isActive: boolean) => {
  if (status === "sold_out") return "bg-red-100 text-red-800 border-red-200";
  if (isActive && status === "active")
    return "bg-green-100 text-green-800 border-green-200";
  return "bg-gray-100 text-gray-800 border-gray-200";
};

// Get status text
const getStatusText = (status: string, isActive: boolean) => {
  if (status === "sold_out") return "Sold Out";
  if (isActive && status === "active") return "Active";
  return "Inactive";
};

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Calculate days remaining
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

const resolveDeliveryCharge = (delivery?: NormalizedDelivery): number | undefined => {
  if (!delivery) return undefined;
  const chargeValue = delivery.charge ?? 0;
  return delivery.isFree ? 0 : chargeValue;
};

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
  const [showZoom, setShowZoom] = useState(false);
  const [showZoomPanel, setShowZoomPanel] = useState(false);
  const [isZoomActive, setIsZoomActive] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchDistance, setTouchDistance] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [zoomScale, setZoomScale] = useState(2);
  const [tab, setTab] = useState<"description" | "products" | "details">(
    "description"
  );
  const imageRef = useRef<HTMLDivElement>(null);
  const zoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cartProduct = useMemo(() => {
    const currency = comboOffer.pricing?.currency || "BDT";
    const normalizedDelivery = normalizeDeliveryData(comboOffer.delivery, currency);
    return {
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
  const comboButtonClass = `group cursor-pointer flex-1 flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
    comboButtonDisabled
      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
      : "bg-linear-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl"
  }`;

  // Safe settings + analytics defaults
  const settings = comboOffer.settings ?? {
    isPublished: true,
    isFeatured: false,
    priority: 0,
  };
  const analytics = comboOffer.analytics ?? {
    views: 0,
    clicks: 0,
    conversions: 0,
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
  const roundedRating = Math.round(ratingValue);
  const ratingLabel = ratingValue ? ratingValue.toFixed(1) : "0.0";
  const reviewsLabel = comboOffer.reviewsCount ?? 0;
  const savings = calculateSavings(comboOffer);
  const daysRemaining = calculateDaysRemaining(comboOffer.validity.endDate);
  const statusText = getStatusText(comboOffer.inventory.status, isActive);
  const statusColor = getStatusColor(comboOffer.inventory.status, isActive);
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

  // Fetch related combo offers
  useEffect(() => {
    const fetchRelatedCombos = async () => {
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
              const deliveryData = normalizeDeliveryData(
                combo.delivery,
                currency
              );
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
          setRelatedCombos(filtered);
        }
      } catch (error) {
        console.error("Error fetching related combos:", error);
      }
    };

    fetchRelatedCombos();
  }, [comboOffer.id]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setActiveIndex(0);
    });

    return () => cancelAnimationFrame(frame);
  }, [comboOffer.id]);

  useEffect(() => {
    if (activeIndex === safeIndex) return;

    const frame = requestAnimationFrame(() => {
      setActiveIndex(safeIndex);
    });

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
    const handleClickOutside = () => {
      setShowShareMenu(false);
    };

    if (showShareMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showShareMenu]);

  // Cleanup zoom timer on unmount
  useEffect(() => {
    return () => {
      if (zoomTimerRef.current) {
        clearTimeout(zoomTimerRef.current);
      }
    };
  }, []);

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

  // Mobile touch gesture handlers
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
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-700">
              Home
            </Link>
            <span>/</span>
            <Link href="/combo-offers" className="hover:text-gray-700">
              Combo Offers
            </Link>
            <span>/</span>
            <span className="text-gray-900">{comboOffer.name}</span>
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
                <div className="absolute top-4 right-4 z-10">
                  <span className="rounded-full bg-linear-to-r from-orange-500 to-red-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                    {comboOffer.pricing.discountPercentage}% OFF
                  </span>
                </div>

                <Image
                  src={currentImage?.src ?? comboOffer.thumbnail}
                  alt={currentImage?.alt ?? comboOffer.name}
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
                      backgroundImage: `url(${
                        currentImage?.src ?? comboOffer.thumbnail
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
                    onClick={() => setActiveIndex(i)}
                    className={`relative h-16 w-16 overflow-hidden rounded-md border-2 transition-all duration-200 ${
                      i === safeIndex
                        ? "border-orange-500"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
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
              /* Combo Details Content */
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
                        <Gift className="w-3 h-3 mr-1" />
                        Combo Offer
                      </span>
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        <Layers className="w-3 h-3 mr-1" />
                        {comboOffer.products.length} Products
                      </span>
                      {comboOffer.category && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          Category: {comboOffer.category}
                        </span>
                      )}
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {comboOffer.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < roundedRating
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
                        className={`text-sm font-medium ${
                          inStock ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {inStock
                          ? `${remainingStock} available`
                          : "Out of stock"}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">
                      {comboOffer.description}
                    </p>

                    {/* Validity */}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-4">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Valid from{" "}
                        {formatDate(comboOffer.validity.startDate)} to{" "}
                        {formatDate(comboOffer.validity.endDate)}
                      </span>
                      {daysRemaining > 0 && (
                        <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                          {daysRemaining} days left
                        </span>
                      )}
                    </div>

                    {/* Features */}
                    {comboOffer.features?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {comboOffer.features
                          .slice(0, 3)
                          .map((feature, index) => (
                            <span
                              key={index}
                              className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                            >
                              {feature}
                            </span>
                          ))}
                        {comboOffer.features.length > 3 && (
                          <span className="rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-500">
                            +{comboOffer.features.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Wishlist & Share */}
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => toggleWishlist(cartProduct)}
                      className={`group relative p-2 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-md hover:shadow-lg ${
                        isInWishlist(comboOffer.id)
                          ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                      title={
                        isInWishlist(comboOffer.id)
                          ? "Remove from wishlist"
                          : "Add to wishlist"
                      }
                    >
                      <Heart
                        className={`w-5 h-5 transition-all duration-300 ${
                          isInWishlist(comboOffer.id)
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
                        title="Share combo offer"
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
                                  `Check out this combo offer: ${
                                    comboOffer.name
                                  } - Save ${
                                    comboOffer.pricing.discountPercentage
                                  }%!`
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
                      {formatCurrency(comboOffer.pricing.discountedPrice)}
                    </div>
                    <div className="text-lg text-gray-500 line-through">
                      {formatCurrency(comboOffer.pricing.originalTotal)}
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-linear-to-r from-orange-100 to-red-100 text-orange-700 font-semibold">
                      <Percent className="w-4 h-4" />
                      Save {comboOffer.pricing.discountPercentage}%
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <Zap className="w-4 h-4" />
                    <span className="font-medium">
                      You save {formatCurrency(savings)} on this combo!
                    </span>
                  </div>
                </div>

                {/* Products summary */}
                <div className="bg-linear-to-r from-orange-50 to-red-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-orange-600" />
                    <h3 className="font-semibold text-gray-900">
                      This Combo Includes:
                    </h3>
                    <span className="ml-auto text-sm text-gray-600">
                      {comboOffer.products.length} items
                    </span>
                  </div>
                  <div className="flex -space-x-2">
                    {comboOffer.products.slice(0, 5).map((item, index) => (
                      <div
                        key={item.productId}
                        className="relative w-10 h-10 rounded-full border-2 border-white bg-white overflow-hidden shadow-sm"
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
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <Package className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        {item.quantity > 1 && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                            {item.quantity}
                          </div>
                        )}
                      </div>
                    ))}
                    {comboOffer.products.length > 5 && (
                      <div className="relative w-10 h-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
                        +{comboOffer.products.length - 5}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantity & actions (combo-level) */}
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <span className="text-base font-semibold text-gray-800">
                      Quantity:
                    </span>
                    <div className="flex items-center bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                      <button
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="h-12 w-12 flex items-center justify-center hover:bg-gray-50 transition-all duration-200 text-lg font-semibold text-gray-600 hover:text-gray-800 rounded-l-xl"
                      >
                        −
                      </button>
                      <div className="h-12 w-16 flex items-center justify-center bg-gray-50 border-x-2 border-gray-200 font-bold text-base text-gray-800">
                        {qty}
                      </div>
                      <button
                        onClick={() => setQty((q) => Math.min(q + 1, maxQty))}
                        className="h-12 w-12 flex items-center justify-center hover:bg-gray-50 transition-all duration-200 text-lg font-semibold text-gray-600 hover:text-gray-800 rounded-r-xl"
                      >
                        +
                      </button>
                    </div>
                    {inStock && (
                      <span className="text-xs text-gray-500">
                        Max {maxQty} per order
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => addToCart(cartProduct, displayQty)}
                      disabled={comboButtonDisabled}
                      className={comboButtonClass}
                      aria-label={`${comboButtonLabel} ${comboOffer.name} combo`}
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
                      <span>{comboButtonLabel}</span>
                    </button>

                    {/* BUY NOW -> creates superior context and routes to /checkout */}
                    <button
                      onClick={handleBuyNow}
                      disabled={!inStock || !isActive}
                      className={`flex-1 cursor-pointer rounded-full px-6 py-3 text-sm font-semibold border-2 transition-all duration-300 transform hover:scale-105 ${
                        inStock && isActive
                          ? "border-orange-500 text-orange-600 hover:bg-orange-50"
                          : "border-gray-300 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      Buy Now
                    </button>
                  </div>
                </div>

                {/* Trust badges */}
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
              className={`py-3 px-6 cursor-pointer rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-105 ${
                tab === "description"
                  ? "bg-white text-orange-600 shadow-lg border-2 border-orange-200"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setTab("products")}
              className={`py-3 px-6 cursor-pointer rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-105 ${
                tab === "products"
                  ? "bg-white text-orange-600 shadow-lg border-2 border-orange-200"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
              }`}
            >
              Products ({comboOffer.products.length})
            </button>
            <button
              onClick={() => setTab("details")}
              className={`py-3 px-6 cursor-pointer rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-105 ${
                tab === "details"
                  ? "bg-white text-orange-600 shadow-lg border-2 border-orange-200"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
              }`}
            >
              Details
            </button>
          </div>

          <div className="py-8 min-h-50">
            {tab === "description" && (
              <div className="prose prose-sm max-w-none text-gray-600 space-y-6">
                <p className="text-base leading-relaxed">
                  {comboOffer.description}
                </p>

                {comboOffer.features?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Combo Features
                    </h4>
                    <ul className="grid gap-3">
                      {comboOffer.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {comboOffer.tags?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {comboOffer.tags.map((tag) => (
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
              </div>
            )}

            {tab === "products" && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 mb-4">
                  Products in this Combo
                </h4>
                <div className="space-y-3">
                  {comboOffer.products.map((item, index) => (
                    <div
                      key={item.productId}
                      className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white">
                        {item.product?.image ? (
                          <Link
                            href={`/products/${item.product?.slug || "#"}`}
                          >
                            <Image
                              src={getImagePath(item.product.image)}
                              alt={item.product.name || "Product image"}
                              width={48}
                              height={48}
                              className="object-cover"
                            />
                          </Link>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">
                          <Link
                            href={`/products/${item.product?.slug || "#"}`}
                          >
                            {item.product?.name || `Product ${index + 1}`}
                          </Link>
                        </h5>
                        {item.product?.price != null && (
                          <p className="text-sm text-gray-600">
                            {formatCurrency(item.product.price)} each
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          × {item.quantity}
                        </div>
                        {item.product?.price != null && (
                          <div className="text-xs text-gray-500">
                            {formatCurrency(
                              (item.product.price || 0) * item.quantity
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "details" && (
              <div className="prose prose-sm max-w-none text-gray-600">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">
                      Offer Details
                    </h4>
                    <dl className="space-y-3 text-sm text-gray-700">
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-gray-900">
                          Offer Status
                        </dt>
                        <dd
                          className={`text-right px-2 py-1 rounded-full text-xs font-semibold ${statusColor}`}
                        >
                          {statusText}
                        </dd>
                      </div>
                      {comboOffer.category && (
                        <div className="flex justify-between gap-4">
                          <dt className="font-medium text-gray-900">
                            Category
                          </dt>
                          <dd className="text-right">
                            {comboOffer.category}
                          </dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-gray-900">
                          Start Date
                        </dt>
                        <dd className="text-right">
                          {formatDate(comboOffer.validity.startDate)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-gray-900">End Date</dt>
                        <dd className="text-right">
                          {formatDate(comboOffer.validity.endDate)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-gray-900">
                          Days Remaining
                        </dt>
                        <dd className="text-right font-semibold">
                          {daysRemaining}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-gray-900">
                          Total Products
                        </dt>
                        <dd className="text-right">
                          {comboOffer.products.length}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-gray-900">
                          Original Total
                        </dt>
                        <dd className="text-right">
                          {formatCurrency(comboOffer.pricing.originalTotal)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-gray-900">
                          Discount
                        </dt>
                        <dd className="text-right font-semibold text-green-600">
                          {comboOffer.pricing.discountPercentage}%
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-gray-900">
                          You Save
                        </dt>
                        <dd className="text-right font-semibold text-green-600">
                          {formatCurrency(savings)}
                        </dd>
                      </div>

                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-gray-900">
                          Published
                        </dt>
                        <dd className="text-right">
                          {settings.isPublished ? "Yes" : "No"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-gray-900">
                          Featured
                        </dt>
                        <dd className="text-right">
                          {settings.isFeatured ? "Yes" : "No"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-gray-900">Priority</dt>
                        <dd className="text-right">{settings.priority}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-gray-900">
                          Created At
                        </dt>
                        <dd className="text-right">
                          {formatDate(comboOffer.createdAt)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-gray-900">
                          Last Updated
                        </dt>
                        <dd className="text-right">
                          {formatDate(comboOffer.updatedAt)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">
                      Additional Information
                    </h4>
                    <p className="leading-relaxed">
                      This is a limited time combo offer. Products may be
                      substituted with similar items of equal or greater value
                      if out of stock.
                    </p>
                    {comboOffer.seo && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">
                          SEO Information
                        </h5>
                        <ul className="space-y-1 text-sm text-gray-600">
                          {comboOffer.seo.title && (
                            <li>
                              <span className="font-semibold">Title: </span>
                              {comboOffer.seo.title}
                            </li>
                          )}
                          {comboOffer.seo.description && (
                            <li>
                              <span className="font-semibold">
                                Description:{" "}
                              </span>
                              {comboOffer.seo.description}
                            </li>
                          )}
                          {comboOffer.seo.keywords &&
                            comboOffer.seo.keywords.length > 0 && (
                              <li>
                                <span className="font-semibold">
                                  Keywords:{" "}
                                </span>
                                {comboOffer.seo.keywords.join(", ")}
                              </li>
                            )}
                        </ul>
                      </div>
                    )}
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">
                        Terms & Conditions
                      </h5>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li className="flex items-start gap-2">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500 mt-1" />
                          <span>Offer valid while supplies last</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500 mt-1" />
                          <span>Cannot be combined with other offers</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500 mt-1" />
                          <span>Free shipping on all combo orders</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500 mt-1" />
                          <span>Normal return policy applies</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Combo Offers */}
        {relatedCombos.length > 0 && (
          <div className="mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                More Combo Offers
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Explore more amazing bundle deals and save even more on your
                favorite products
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedCombos.map((combo) => (
                <Link
                  key={combo.id}
                  href={`/combo-offers/${combo.slug}`}
                  className="group"
                >
                  <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-orange-100 to-red-100 mb-4 shadow-sm group-hover:shadow-lg transition-all duration-300">
                    <div className="aspect-square relative">
                      <Image
                        src={getImagePath(combo.thumbnail)}
                        alt={combo.name}
                        width={300}
                        height={300}
                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute top-3 right-3">
                        <span className="rounded-full bg-linear-to-r from-orange-500 to-red-500 px-2 py-1 text-xs font-bold text-white">
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
                          deliveryCharge: resolveDeliveryCharge(
                            normalizedDelivery
                          ),
                        });
                      }}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isInWishlist(combo.id)
                              ? "fill-red-500 text-red-500"
                              : "text-gray-600"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2">
                      {combo.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(combo.pricing.discountedPrice)}
                        </p>
                        <p className="text-xs text-gray-500 line-through">
                          {formatCurrency(combo.pricing.originalTotal)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          {combo.products.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
