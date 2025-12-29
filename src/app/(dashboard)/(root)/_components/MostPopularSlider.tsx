"use client";

import { useState, useEffect, useCallback, useMemo, useLayoutEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Heart, ShoppingBag, Eye, Star } from "lucide-react";
import { useCommerce } from "@/context/CommerceContext";
import type { Product as CommerceProduct } from "@/context/CommerceContext";


type DeliveryInfo = {
  isFree?: boolean;
  charge?: number | string;
  message?: string;
};


interface PopularProduct {
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

  currentPrice: string;
  originalPrice: string;
  priceValue: number;
  originalPriceValue: number;
  discount?: string;
  isNew?: boolean;
  isBestseller?: boolean;

  price: number;
  oldPrice?: number;
  image: string;
  imageAlt?: string;

  stock?: number;
  rating: number;
  reviewCount: number;

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

const PRODUCT_ENDPOINT = "/api/products?limit=12";
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=900&h=1200&fit=crop";

// Modern color palette suitable for fashion
const TOKENS = {
  bg: "#FFFFFF",
  bgSecondary: "#FAF7F5",
  text: "#1A1A1A",
  textLight: "#666666",
  accent: "#D4A574", // Warm gold/beige accent
  accentDark: "#B08D57",
  sale: "#E74C3C",
  border: "#EAE5E0",
  success: "#27AE60",
  star: "#FFD700",
  overlay: "rgba(0, 0, 0, 0.03)",
  cardHover: "rgba(212, 165, 116, 0.08)",
};

const formatCurrencyValue = (value: number): string => 
  value.toLocaleString("en-US");

const safeNumber = (value?: string | number, fallback = 0): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const normalizeProductDoc = (doc: any): PopularProduct => {
  const base = doc && typeof doc === "object" ? doc : {};
  const slug = doc?.slug || doc?._id?.toString() || "product";
  const current = safeNumber(doc?.pricing?.current?.value, 0);
  const original = safeNumber(doc?.pricing?.original?.value, current);
  const discount =
    original > 0 && current < original
      ? Math.round(((original - current) / original) * 100).toString()
      : undefined;
  const tags = Array.isArray(doc?.tags) ? doc.tags : undefined;

  return {
    ...base,
    id: doc?._id?.toString() || slug,
    name: doc?.name || "Untitled Product",
    slug,
    image: doc?.media?.thumbnail || doc?.media?.gallery?.[0] || FALLBACK_IMAGE,
    price: current,
    oldPrice: Math.max(original, current),
    originalPrice: formatCurrencyValue(Math.max(original, current)),
    currentPrice: formatCurrencyValue(current),
    priceValue: current,
    originalPriceValue: Math.max(original, current),
    discount,
    rating: safeNumber(doc?.ratings?.averageRating, 4.5),
    reviewCount: safeNumber(doc?.ratings?.totalReviews, 0),
    category: doc?.category || doc?.categoryDetails?.name || "Fashion",
    ...(Array.isArray(tags) ? { tags } : {}),
    isNew: Boolean(doc?.isNew),
    isBestseller: Boolean(doc?.isBestseller),
    inventory: doc?.inventory || { quantity: 10, status: "in_stock" },
  };
};

const toCommerceProduct = (product: PopularProduct): CommerceProduct => ({
  ...product,
  price: product.priceValue,
  oldPrice: product.originalPriceValue,
  description: product.description ?? product.name,
  shortDescription: product.shortDescription ?? product.category,
});

function MostPopularSkeleton({
  count,
  itemsPerView,
}: {
  count: number;
  itemsPerView: number;
}) {
  const isMobile = itemsPerView <= 1;

  return (
    <div className={isMobile ? "overflow-hidden" : ""}>
      <div
        className={
          isMobile
            ? "flex gap-0"
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
        }
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-white rounded-2xl overflow-hidden border"
            style={{
              borderColor: TOKENS.border,
              minWidth: isMobile ? "100%" : undefined,
            }}
          >
            <div className="h-64 bg-linear-to-br from-gray-100 to-gray-200" />
            <div className="p-5">
              <div className="h-3 w-20 bg-gray-200 rounded-full mb-3" />
              <div className="h-4 w-full bg-gray-200 rounded-full mb-2" />
              <div className="h-4 w-3/4 bg-gray-200 rounded-full mb-4" />
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
                <div className="h-4 w-12 bg-gray-200 rounded-full" />
              </div>
              <div className="h-10 bg-gray-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MostPopularSliderProps {
  title?: string;
  subtitle?: string;
  autoScroll?: boolean;
  autoScrollInterval?: number;
}

export default function MostPopularSlider({
  title = "Most Popular This Season",
  subtitle = "Discover our best-selling collection, loved by fashion enthusiasts",
  autoScroll = true,
  autoScrollInterval = 5000,
}: MostPopularSliderProps) {
  const { wishlistItems, addToWishlist, removeFromWishlist, addToCart, isInCart } =
    useCommerce();

  const wishlistIds = useMemo(
    () => new Set(wishlistItems.map((item) => item.id)),
    [wishlistItems]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [itemsPerView, setItemsPerView] = useState(2);
  const [products, setProducts] = useState<PopularProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useLayoutEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 768) return 2;
      if (w < 1024) return 3;
      return 4;
    };
    setItemsPerView(update());
    const onResize = () => setItemsPerView(update());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(PRODUCT_ENDPOINT, { signal: controller.signal });
        if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
        const payload = await res.json();
        const fetched = Array.isArray(payload.products)
          ? payload.products
          : Array.isArray(payload.data)
          ? payload.data
          : [];

        const normalized = fetched.map(normalizeProductDoc);
        if (!active) return;
        setProducts(normalized);
      } catch (e) {
        if (!active) return;
        setProducts([]);
        setError(e instanceof Error ? e.message : "Failed to load products");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadKey]);

  const handleRetry = useCallback(() => setReloadKey((p) => p + 1), []);

  const maxIndex = useMemo(
    () => Math.max(products.length - itemsPerView, 0),
    [products.length, itemsPerView]
  );

  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  const safeIndex = Math.min(currentIndex, maxIndex);
  const slideWidthPercent = 100 / itemsPerView;
  const translatePercent = safeIndex * slideWidthPercent;

  const nextSlide = useCallback(() => {
    setCurrentIndex((p) => (p >= maxIndex ? 0 : p + 1));
  }, [maxIndex]);

  useEffect(() => {
    if (!autoScroll) return;
    if (isHovered) return;
    if (products.length <= itemsPerView) return;
    const t = setInterval(nextSlide, autoScrollInterval);
    return () => clearInterval(t);
  }, [autoScroll, isHovered, products.length, itemsPerView, nextSlide, autoScrollInterval]);

  const handleAddToCart = useCallback(
    (product: PopularProduct) => {
      const qty = product.inventory?.quantity ?? 0;
      if (qty <= 0) return;
      if (isInCart(product.id)) return;
      addToCart(toCommerceProduct(product));
    },
    [addToCart, isInCart]
  );

  const handleToggleWishlist = useCallback(
    (product: PopularProduct) => {
      const cp = toCommerceProduct(product);
      if (wishlistIds.has(product.id)) removeFromWishlist(product.id);
      else addToWishlist(cp);
    },
    [wishlistIds, addToWishlist, removeFromWishlist]
  );

  const showSkeletons = isLoading && products.length === 0;
  const showError = Boolean(error) && !isLoading;
  const skeletonCount = itemsPerView === 1 ? 1 : Math.min(Math.max(itemsPerView, 4), 8);

  const ProductCard = ({ product }: { product: PopularProduct }) => {
    const inCart = isInCart(product.id);
    const wish = wishlistIds.has(product.id);
    const out = (product.inventory?.quantity ?? 0) <= 0;
    const productHref = `/products/${product.slug}`;

    return (
      <div
        className="shrink-0 box-border px-2 sm:px-3 lg:px-4"
        style={{ flex: `0 0 ${slideWidthPercent}%`, maxWidth: `${slideWidthPercent}%` }}
      >
        <div
          className="group relative overflow-hidden rounded-2xl bg-white border transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
          style={{ 
            borderColor: TOKENS.border,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
          }}
        >
          {/* Badges Container */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            {product.isNew && (
              <div className="px-3 py-1 text-xs font-semibold text-white rounded-full bg-emerald-500">
                NEW
              </div>
            )}
            {product.isBestseller && (
              <div className="px-3 py-1 text-xs font-semibold text-white rounded-full bg-amber-600">
                BESTSELLER
              </div>
            )}
            {product.discount && (
              <div className="px-3 py-1 text-xs font-semibold text-white rounded-full"
                   style={{ backgroundColor: TOKENS.sale }}>
                -{product.discount}%
              </div>
            )}
          </div>

          {/* Quick Actions Overlay */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleToggleWishlist(product);
              }}
              className="w-9 h-9 flex items-center justify-center bg-white rounded-full shadow-md hover:shadow-lg transition-all hover:scale-110"
              style={{ color: wish ? TOKENS.sale : TOKENS.text }}
            >
              <Heart className={`w-4 h-4 ${wish ? "fill-current" : ""}`} />
            </button>
            <Link
              href={productHref}
              className="w-9 h-9 flex items-center justify-center bg-white rounded-full shadow-md hover:shadow-lg transition-all hover:scale-110"
              style={{ color: TOKENS.text }}
            >
              <Eye className="w-4 h-4" />
            </Link>
          </div>

          {/* Image Area */}
          <div className="relative h-64 bg-linear-to-b from-gray-50 to-gray-100 overflow-hidden">
            <Link href={productHref}>
              <Image
                src={product.image || FALLBACK_IMAGE}
                alt={product.name}
                fill
                className="object-contain p-4 transition-transform duration-500 lg:group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            </Link>
            
            {/* Quick Add to Cart on Image Hover */}
            <div className="absolute bottom-0 left-0 right-0 translate-y-0 lg:translate-y-full lg:group-hover:translate-y-0 transition-transform duration-300">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddToCart(product);
                }}
                disabled={out || inCart}
                className="w-full py-3 text-sm font-semibold text-white transition-opacity"
                style={{ 
                  backgroundColor: "#6B0F1A",
                  opacity: out || inCart ? 0.7 : 1,
                  cursor: out || inCart ? "not-allowed" : "pointer"
                }}
              >
                {out ? "Out of Stock" : inCart ? "✓ In Cart" : "+ Quick Add"}
              </button>
            </div>
          </div>

          {/* Product Details */}
          <div className="p-5">
            <Link href={productHref}>
              <div className="mb-2">
                <div className="text-xs font-medium uppercase tracking-wider mb-1"
                     style={{ color: TOKENS.textLight }}>
                  {product.category}
                </div>
                <h3 className="text-base font-semibold leading-tight line-clamp-2 mb-2 hover:underline"
                    style={{ color: TOKENS.text }}>
                  {product.name}
                </h3>
              </div>
            </Link>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${i < Math.floor(product.rating) ? "fill-current" : ""}`}
                    style={{ 
                      color: i < Math.floor(product.rating) ? TOKENS.star : TOKENS.border 
                    }}
                  />
                ))}
              </div>
              <span className="text-xs" style={{ color: TOKENS.textLight }}>
                ({product.reviewCount})
              </span>
            </div>

            {/* Pricing */}
            <div className="flex items-baseline justify-between mb-4">
              <div className="flex items-baseline gap-2">
                <div className="text-lg font-bold" style={{ color: TOKENS.text }}>
                  ৳{product.currentPrice}
                </div>
                {product.originalPriceValue > product.priceValue && (
                  <div className="text-sm line-through" style={{ color: TOKENS.textLight }}>
                    ৳{product.originalPrice}
                  </div>
                )}
              </div>
              {product.inventory?.quantity && product.inventory.quantity < 10 && (
                <div className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                  Only {product.inventory.quantity} left
                </div>
              )}
            </div>

            {/* Primary Action Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddToCart(product);
              }}
              disabled={out || inCart}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
              style={{ 
                backgroundColor: out ? TOKENS.border : inCart ? TOKENS.success : "#6B0F1A",
                color: "white"
              }}
            >
              <ShoppingBag className="w-4 h-4" />
              {out ? "Out of Stock" : inCart ? "In Cart" : "Add to Cart"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="w-full py-12 md:py-16 lg:py-20" style={{ backgroundColor: TOKENS.bgSecondary }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Navigation */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-10 lg:mb-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: TOKENS.text }}>
              {title}
            </h2>
            {subtitle && (
              <p className="text-base md:text-lg" style={{ color: TOKENS.textLight }}>
                {subtitle}
              </p>
            )}
          </div>

          {/* Navigation Controls removed to keep auto-sliding only */}
        </div>

        {/* Error State */}
        {showError && (
          <div className="mb-8 p-6 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4"
               style={{ 
                 backgroundColor: "#FEF2F2",
                 border: "1px solid #FECACA",
                 color: "#991B1B" 
               }}>
            <div className="flex-1">
              <p className="font-medium">Unable to load products</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={handleRetry}
              className="px-4 py-2 rounded-lg font-medium transition-colors"
              style={{ 
                backgroundColor: "#DC2626",
                color: "white"
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Content */}
        {showSkeletons ? (
          <MostPopularSkeleton count={skeletonCount} itemsPerView={itemsPerView} />
        ) : products.length ? (
          <div className="relative">
            {/* Navigation Dots for Mobile */}
            {products.length > itemsPerView && (
              <div className="lg:hidden flex justify-center gap-2 mt-6">
                {Array.from({ length: Math.ceil(products.length / itemsPerView) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === Math.floor(currentIndex / itemsPerView) ? "scale-125" : ""
                    }`}
                    style={{
                      backgroundColor: i === Math.floor(currentIndex / itemsPerView) 
                        ? TOKENS.accent 
                        : TOKENS.border
                    }}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Products Slider */}
            <div
              className="overflow-hidden"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <motion.div
                className="flex gap-0 will-change-transform"
                animate={{ x: `-${translatePercent}%` }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 30, 
                  mass: 1 
                }}
              >
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </motion.div>
            </div>
          </div>
        ) : !isLoading && !error && (
          <div className="text-center py-12 rounded-2xl border"
               style={{ 
                 borderColor: TOKENS.border,
                 backgroundColor: TOKENS.bg 
               }}>
            <div className="max-w-md mx-auto">
              <div className="text-4xl mb-4" style={{ color: TOKENS.textLight }}>👗</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: TOKENS.text }}>
                No Popular Products Available
              </h3>
              <p className="mb-6" style={{ color: TOKENS.textLight }}>
                Check back soon for our latest collection
              </p>
              <button
                onClick={handleRetry}
                className="px-6 py-3 rounded-lg font-medium transition-colors"
                style={{ 
                  backgroundColor: TOKENS.accent,
                  color: "white"
                }}
              >
                Refresh Collection
              </button>
            </div>
          </div>
        )}

        {/* View All Link */}
        {products.length > 0 && (
          <div className="flex justify-center mt-10 lg:mt-12">
            <Link
              href="/products"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all hover:gap-3"
              style={{ 
                backgroundColor: TOKENS.bg,
                border: `1px solid ${TOKENS.border}`,
                color: TOKENS.text
              }}
            >
              View All Popular Products
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

