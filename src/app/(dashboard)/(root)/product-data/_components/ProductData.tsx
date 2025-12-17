"use client";

import { useMemo, useState, useEffect, ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Grid, List, ChevronRight, Star, Heart, ShoppingBag, Check } from "lucide-react";
import { useCommerce } from "@/context/CommerceContext";
import type { Product as CommerceProduct } from "@/context/CommerceContext";

type Gender = "men" | "women" | "unisex";
type Size = "XS" | "S" | "M" | "L" | "XL" | "XXL" | "One Size";
type SortOption = "featured" | "low" | "high" | "newest" | "popular";

type ProductListingPageProps = {
  collectionSlug?: string;
  collectionName?: string;
  initialProductData?: ProductDataResponse;
};

const VALID_SIZES: Size[] = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];

interface DeliveryInfo {
  isFree?: boolean;
  charge?: number | string;
  message?: string;
}

type ApiProduct = {
  _id?: string;
  slug?: string;
  name?: string;
  brand?: string;
  category?: string;
  gender?: Gender | string;
  summary?: string;
  description?: string;
  pricing?: {
    current?: { value?: number | string };
    original?: { value?: number | string };
  };
  media?: {
    thumbnail?: string;
    gallery?: string[];
  };
  details?: {
    colors?: string[];
    sizes?: string[];
  };
  ratings?: {
    averageRating?: number | string;
    totalReviews?: number | string;
  };
  isNew?: boolean;
  isBestseller?: boolean;
  delivery?: DeliveryInfo;
};

export type Product = {
  id: string;
  brand: string;
  name: string;
  slug: string;
  routeSlug: string;
  image: string;
  gender: Gender;
  price: number;
  salePrice?: number;
  sizes: Size[];
  colors: string[];
  rating: number;
  reviewCount: number;
  isNew?: boolean;
  isBestseller?: boolean;
  category?: string;
  delivery?: DeliveryInfo;
};

const robe = {
  cream: "#FBF3E8",
  maroon: "#944C35",
  sand: "#E2B188",
  blush: "#F1D6C1",
  text: "#3b2a22",
  maroonHover: "#7f3f2d",
};

const PRICE_RANGES = [
  { id: "u2000", label: "Under Tk. 2000", min: 0, max: 2000 },
  { id: "2000-4000", label: "Tk. 2000 - 4000", min: 2000, max: 4000 },
  { id: "4000-6000", label: "Tk. 4000 - 6000", min: 4000, max: 6000 },
  { id: "6000-8000", label: "Tk. 6000 - 8000", min: 6000, max: 8000 },
  { id: "8000-10000", label: "Tk. 8000 - 10000", min: 8000, max: 10000 },
  { id: "10000+", label: "Tk. 10000+", min: 10000, max: Infinity },
];

const SIZE_OPTIONS: Size[] = ["XS", "S", "M", "L", "XL", "XXL"];

const COLOR_OPTIONS = [
  { name: "Maroon", value: robe.maroon },
  { name: "Sand", value: robe.sand },
  { name: "Blush", value: robe.blush },
  { name: "Cream", value: robe.cream },
  { name: "Text Brown", value: robe.text },
  { name: "Navy", value: "#1e3a8a" },
  { name: "Olive", value: "#3f6212" },
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#111827" },
];

const CATEGORIES = [
  "Shirts", "Panjabis", "Sarees", "Blouses", "Dresses",
  "Kurtas", "Pants", "Blazers", "Accessories"
];

function formatTk(n: number) {
  return `Tk. ${n.toLocaleString("en-US")}`;
}

const mapProductToCommerce = (product: Product): CommerceProduct => {
  const price = product.salePrice ?? product.price;
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    image: product.image || "/placeholder-image.jpg",
    price,
    oldPrice: product.price,
    category: product.category,
    description: product.colors?.[0],
    shortDescription: product.sizes?.join(", "),
  };
};

export const titleizeSlug = (value?: string) =>
  value
    ? value
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "";

function hasToString(value: unknown): value is { toString: () => string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof (value as { toString?: unknown }).toString === "function"
  );
}

function safeNumber(value?: string | number, fallback = 0): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallback;
}

type CollectionItemEntry = {
  type: "product" | "combo";
  refId?: string | { toString: () => string };
  slug?: string;
  name?: string;
  price?: number | string;
  thumbnail?: string;
  category?: string;
  product?: ApiProduct;
  combo?: ApiProduct;
};

type CollectionMeta = {
  _id?: string;
  slug?: string;
  bannerTitle?: string;
  bannerDescription?: string;
  bannerImage?: string;
  brandImage?: string;
  collections?: CollectionItemEntry[];
  status?: string;
  featured?: boolean;
  visibility?: string;
};

type CategoryMeta = {
  _id?: string;
  slug?: string;
  name?: string;
  description?: string;
  image?: string;
  productCount?: number;
};

export type ProductDataResponse =
  | { type: "collection"; data: CollectionMeta }
  | {
      type: "category";
      data: {
        category: CategoryMeta;
        products: ApiProduct[];
      };
    }
  | { type: "not_found"; message?: string };

// -------------------------------
// SLUG NORMALIZATION UTILITIES
// -------------------------------
function normalizeSlug(input?: string): string {
  if (!input) return "unknown-product";
  
  // Convert to string
  const str = String(input);
  
  // Remove any file extensions
  const withoutExt = str.replace(/\.[^/.]+$/, "");
  
  // Convert to URL-safe format
  return withoutExt
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Remove duplicate hyphens
    .replace(/^-+|-+$/g, '')      // Trim leading/trailing hyphens
    .substring(0, 100);           // Limit length
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length > 0;
}

function generateSlug(name: string, id: string): string {
  const nameSlug = normalizeSlug(name);
  const shortId = id.replace(/[^a-z0-9]/gi, '').slice(-6).toLowerCase();
  
  // If nameSlug is valid, use it with ID suffix for uniqueness
  if (nameSlug && nameSlug !== "unknown-product") {
    return `${nameSlug}-${shortId}`;
  }
  
  // Fallback to just ID
  return `product-${shortId}`;
}

function ensureValidSlug(
  rawSlug?: string, 
  name?: string, 
  id?: string
): string {
  // Try the raw slug first
  if (rawSlug) {
    const normalized = normalizeSlug(rawSlug);
    if (isValidSlug(normalized)) {
      return normalized;
    }
  }
  
  // Generate from name and ID
  if (name && id) {
    const generated = generateSlug(name, id);
    if (isValidSlug(generated)) {
      return generated;
    }
  }
  
  // Use ID only
  if (id) {
    const idSlug = `product-${id.replace(/[^a-z0-9]/gi, '').slice(-8).toLowerCase()}`;
    return idSlug;
  }
  
  // Ultimate fallback
  return `product-${Date.now().toString(36)}`;
}
// -------------------------------

function normalizeCollectionItem(entry: CollectionItemEntry): Product | null {
  const detail = entry.product ?? entry.combo;
  const refIdString =
    typeof entry.refId === "string"
      ? entry.refId
      : hasToString(entry.refId)
      ? entry.refId.toString()
      : undefined;
  
  // Get essential data
  const rawSlug = detail?.slug ?? entry.slug;
  const rawName = detail?.name ?? entry.name;
  const rawId = detail?._id?.toString() ?? refIdString ?? rawName;
  
  // Ensure we have a valid slug
  const slug = ensureValidSlug(rawSlug, rawName, rawId);
  const slugCandidate =
    typeof rawSlug === "string"
      ? rawSlug.trim()
      : rawSlug
        ? String(rawSlug).trim()
        : "";
  const routeSlug = slugCandidate || rawId || slug;
  
  if (!slug) return null;

  const originalPrice = safeNumber(
    detail?.pricing?.original?.value,
    safeNumber(detail?.pricing?.current?.value, safeNumber(entry.price, 0))
  );
  const currentPrice = safeNumber(
    detail?.pricing?.current?.value,
    safeNumber(entry.price, originalPrice)
  );

  const colors =
    Array.isArray(detail?.details?.colors) && detail.details.colors.length
      ? detail.details.colors
      : [robe.maroon, robe.text, robe.cream];
  const sizes =
    Array.isArray(detail?.details?.sizes)
      ? detail.details.sizes.filter(
          (size): size is Size =>
            typeof size === "string" && VALID_SIZES.includes(size as Size)
        )
      : [];
  const image =
    detail?.media?.thumbnail ||
    (Array.isArray(detail?.media?.gallery) ? detail.media.gallery[0] : undefined) ||
    entry.thumbnail ||
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=600&fit=crop";
  const gender =
    ["men", "women", "unisex"].includes(detail?.gender ?? "")
      ? (detail?.gender as Gender)
      : "unisex";
  const rating = Math.min(
    5,
    Math.max(0, safeNumber(detail?.ratings?.averageRating, 4.5))
  );
  const reviewCount = safeNumber(detail?.ratings?.totalReviews, 0);
  const category = detail?.category ?? entry.category ?? "Collection";
  
  // Ensure ID is not empty
  const id = rawId || slug;

  return {
    id,
    brand: detail?.brand ?? "ROBE",
    name: rawName ?? slug.replace(/-/g, ' '),
    slug,
    routeSlug,
    image,
    gender,
    price: originalPrice,
    salePrice: currentPrice < originalPrice ? currentPrice : undefined,
    sizes: sizes.length ? sizes : ["One Size"],
    colors: colors.length ? colors : [robe.maroon],
    rating,
    reviewCount,
    isNew: Boolean(detail?.isNew),
    isBestseller: Boolean(detail?.isBestseller),
    category,
  };
}

const normalizeProductList = (items: ApiProduct[]): Product[] =>
  items
    .map((product) =>
      normalizeCollectionItem({
        type: "product",
        product,
      })
    )
    .filter(Boolean) as Product[];

const getProductsFromPayload = (payload: ProductDataResponse): Product[] => {
  if (payload.type === "collection") {
    const collectionProducts = payload.data.collections ?? [];
    return collectionProducts
      .map(normalizeCollectionItem)
      .filter(Boolean) as Product[];
  }
  if (payload.type === "category") {
    return normalizeProductList(payload.data.products);
  }
  return [];
};

export default function ProductListingPage({ collectionSlug, collectionName, initialProductData }: ProductListingPageProps) {
  const [remoteProducts, setRemoteProducts] = useState<Product[]>(
    initialProductData ? getProductsFromPayload(initialProductData) : []
  );
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [collectionMeta, setCollectionMeta] = useState<CollectionMeta | null>(
    initialProductData?.type === "collection" ? initialProductData.data : null
  );
  const [categoryMeta, setCategoryMeta] = useState<CategoryMeta | null>(
    initialProductData?.type === "category" ? initialProductData.data.category : null
  );
  const [heroSource, setHeroSource] = useState<"collection" | "category" | null>(
    initialProductData?.type === "collection"
      ? "collection"
      : initialProductData?.type === "category"
        ? "category"
        : null
  );

  const [gender, setGender] = useState<Gender | "all">("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [priceIds, setPriceIds] = useState<string[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>("featured");
  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSort(event.target.value as SortOption);
  };
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const {
    wishlistItems,
    addToWishlist,
    removeFromWishlist,
    addToCart,
    isInCart,
  } = useCommerce();
  const wishlistIds = useMemo(() => new Set(wishlistItems.map((item) => item.id)), [wishlistItems]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  
  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const fetchProductPayload = async (params: URLSearchParams) => {
      const response = await fetch(`/api/products?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to load products");
      }
      const payload = await response.json();
      const list = Array.isArray(payload?.products)
        ? (payload.products as ApiProduct[])
        : [];
      return normalizeProductList(list);
    };

    const loadDefaultProducts = async () => {
      setRemoteError(null);
      setRemoteProducts([]);
      setIsRemoteLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", "24");
        const normalized = await fetchProductPayload(params);
        if (!isActive) return;
        setCollectionMeta(null);
        setCategoryMeta(null);
        setHeroSource(null);
        setRemoteProducts(normalized);
      } catch (error) {
        if (!isActive) return;
        setRemoteProducts([]);
        setRemoteError(error instanceof Error ? error.message : "Failed to load products");
      } finally {
        if (!isActive) return;
        setIsRemoteLoading(false);
      }
    };

    const applyInitialProductData = (payload: ProductDataResponse) => {
      if (!isActive) return;
      setRemoteProducts(getProductsFromPayload(payload));
      setCollectionMeta(payload.type === "collection" ? payload.data : null);
      setCategoryMeta(payload.type === "category" ? payload.data.category : null);
      setHeroSource(
        payload.type === "collection"
          ? "collection"
          : payload.type === "category"
            ? "category"
            : null
      );
      setRemoteError(null);
      setIsRemoteLoading(false);
    };

    const loadCollectionProducts = async () => {
      if (!collectionSlug) return;

      setRemoteError(null);
      setIsRemoteLoading(true);
      try {
        const response = await fetch(`/api/product-data/${collectionSlug}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || payload?.message || "Failed to load collection data");
        }

        const payload = (await response.json()) as ProductDataResponse;

        if (payload.type === "collection") {
          const normalized = getProductsFromPayload(payload);
          if (!isActive) return;
          setCollectionMeta(payload.data);
          setCategoryMeta(null);
          setHeroSource("collection");
          setRemoteProducts(normalized);
          return;
        }

        if (payload.type === "category" && payload.data) {
          const normalized = getProductsFromPayload(payload);
          if (!isActive) return;
          setCollectionMeta(null);
          setCategoryMeta(payload.data.category);
          setHeroSource("category");
          setRemoteProducts(normalized);
          return;
        }

        const fallbackMessage =
          payload.type === "not_found"
            ? payload.message || "No matching collection or category"
            : "Failed to load collection products";
        throw new Error(fallbackMessage);
      } catch (error) {
        if (!isActive) return;
        setCollectionMeta(null);
        setCategoryMeta(null);
        setHeroSource(null);
        setRemoteProducts([]);
        setRemoteError(
          error instanceof Error ? error.message : "Failed to load collection products"
        );
      } finally {
        if (!isActive) return;
        setIsRemoteLoading(false);
      }
    };

    if (!collectionSlug) {
      void loadDefaultProducts();
    } else if (initialProductData) {
      applyInitialProductData(initialProductData);
    } else {
      void loadCollectionProducts();
    }

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [collectionSlug, initialProductData]);

  const fallbackTitle = collectionSlug
    ? titleizeSlug(collectionSlug)
    : "All Products";

  const heroTitle =
    heroSource === "collection"
      ? collectionMeta?.bannerTitle ?? collectionName ?? fallbackTitle
      : heroSource === "category"
        ? categoryMeta?.name ?? collectionName ?? fallbackTitle
        : collectionName ?? fallbackTitle;

  const heroBadge =
    heroSource === "category"
      ? "Category"
      : heroSource === "collection"
        ? "Collection"
        : "Products";

  const heroDescription =
    heroSource === "category"
      ? categoryMeta?.description
      : heroSource === "collection"
        ? collectionMeta?.bannerDescription
        : undefined;

  const filtered = useMemo(() => {
    let list = [...remoteProducts];

    // gender filter
    if (gender !== "all") {
      list = list.filter(p => p.gender === gender);
    }

    // category filter
    if (categories.length > 0) {
      list = list.filter(p => categories.includes(p.category!));
    }

    // price filter
    if (priceIds.length > 0) {
      const activeRanges = PRICE_RANGES.filter(r => priceIds.includes(r.id));
      list = list.filter(p => {
        const price = p.salePrice ?? p.price;
        return activeRanges.some(r => price >= r.min && price <= r.max);
      });
    }

    // size filter
    if (sizes.length > 0) {
      list = list.filter(p => sizes.some(s => p.sizes.includes(s)));
    }

    // color filter
    if (colors.length > 0) {
      list = list.filter(p => colors.some(c => p.colors.includes(c)));
    }

    // sort
    switch (sort) {
      case "low":
        list.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
        break;
      case "high":
        list.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
        break;
      case "newest":
        list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
      case "popular":
        list.sort((a, b) => b.rating - a.rating);
        break;
      default:
        list.sort((a, b) => {
          const aScore = (a.isBestseller ? 2 : 0) + (a.isNew ? 1 : 0) + a.rating;
          const bScore = (b.isBestseller ? 2 : 0) + (b.isNew ? 1 : 0) + b.rating;
          return bScore - aScore;
        });
    }

    return list;
  }, [remoteProducts, gender, categories, priceIds, sizes, colors, sort]);

  const clearAll = () => {
    setGender("all");
    setCategories([]);
    setPriceIds([]);
    setSizes([]);
    setColors([]);
    setSort("featured");
  };

  const handleToggleWishlist = (product: Product) => {
    const commerceProduct = mapProductToCommerce(product);
    if (wishlistIds.has(commerceProduct.id)) {
      removeFromWishlist(commerceProduct.id);
      return;
    }
    addToWishlist(commerceProduct);
  };

  const isProductInCart = (product: Product) => isInCart(product.id);

  const handleAddToCart = (product: Product) => {
    if (isProductInCart(product)) return;
    addToCart(mapProductToCommerce(product));
  };

  const isProductWishlisted = (product: Product) => wishlistIds.has(product.id);

  const activeFiltersCount = [
    gender !== "all",
    categories.length,
    priceIds.length,
    sizes.length,
    colors.length,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${robe.cream}, #ffffff)` }}>
      <style jsx>{`
        button {
          cursor: pointer;
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm mb-8" style={{ color: robe.text }}>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            Home
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" style={{ color: robe.sand }} />
          <Link href="/collections" className="hover:opacity-80 transition-opacity">
            Collections
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" style={{ color: robe.sand }} />
          <span className="font-medium" style={{ color: robe.maroon }}>All Products</span>
        </nav>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Mobile Filter Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl w-full justify-between border transition-all hover:shadow-sm"
              style={{ borderColor: robe.blush, color: robe.maroon }}
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span className="font-medium">Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-6 h-6 text-xs rounded-full flex items-center justify-center"
                    style={{ backgroundColor: robe.maroon, color: "white" }}>
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {/* Sidebar Filters */}
          <AnimatePresence>
            {(showFilters || !isMobile) && (
              <motion.aside
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="lg:w-72 shrink-0"
              >
                <div className="bg-white rounded-xl p-6 sticky top-8 border"
                  style={{ borderColor: robe.blush }}>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-serif font-semibold" style={{ color: robe.maroon }}>Filters</h2>
                    <button
                      onClick={clearAll}
                      className="text-sm font-medium hover:opacity-80 transition-opacity"
                      style={{ color: robe.sand }}
                    >
                      Clear all
                    </button>
                  </div>

                  {/* Gender */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold mb-3" style={{ color: robe.maroon }}>Gender</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {["all", "men", "women", "unisex"].map((g) => (
                        <button
                          key={g}
                          onClick={() => setGender(g as Gender | "all")}
                          className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                            gender === g
                              ? "text-white border-(--robe-maroon)"
                              : "border-(--robe-blush) text-(--robe-text) hover:border-(--robe-sand)"
                          }`}
                          style={{
                            backgroundColor: gender === g ? robe.maroon : robe.cream,
                            color: gender === g ? 'white' : robe.text,
                          }}
                        >
                          {g === "all" ? "All" : g.charAt(0).toUpperCase() + g.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold mb-3" style={{ color: robe.maroon }}>Category</h3>
                    <div className="space-y-2">
                      {CATEGORIES.map((category) => (
                        <label key={category} className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={categories.includes(category)}
                              onChange={(e) => {
                                setCategories(prev =>
                                  e.target.checked
                                    ? [...prev, category]
                                    : prev.filter(c => c !== category)
                                );
                              }}
                              className="peer sr-only"
                            />
                            <div className="w-4 h-4 rounded border transition-all peer-checked:border-(--robe-maroon) peer-checked:bg-(--robe-maroon)"
                              style={{ borderColor: robe.blush }}
                            >
                              <Check className="w-3 h-3 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                            </div>
                          </div>
                          <span className="text-sm group-hover:opacity-80 transition-opacity" style={{ color: robe.text }}>
                            {category}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold mb-3" style={{ color: robe.maroon }}>Price Range</h3>
                    <div className="space-y-2">
                      {PRICE_RANGES.map((range) => (
                        <label key={range.id} className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={priceIds.includes(range.id)}
                              onChange={(e) => {
                                setPriceIds(prev =>
                                  e.target.checked
                                    ? [...prev, range.id]
                                    : prev.filter(id => id !== range.id)
                                );
                              }}
                              className="peer sr-only"
                            />
                            <div className="w-4 h-4 rounded border transition-all peer-checked:border-(--robe-maroon) peer-checked:bg-(--robe-maroon)"
                              style={{ borderColor: robe.blush }}
                            >
                              <Check className="w-3 h-3 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                            </div>
                          </div>
                          <span className="text-sm group-hover:opacity-80 transition-opacity" style={{ color: robe.text }}>
                            {range.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Size */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold mb-3" style={{ color: robe.maroon }}>Size</h3>
                    <div className="flex flex-wrap gap-2">
                      {SIZE_OPTIONS.map((size) => (
                        <button
                          key={size}
                          onClick={() =>
                            setSizes(prev =>
                              prev.includes(size)
                                ? prev.filter(s => s !== size)
                                : [...prev, size]
                            )
                          }
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                            sizes.includes(size)
                              ? "text-white"
                              : "text-(--robe-text)"
                          }`}
                          style={{
                            backgroundColor: sizes.includes(size) ? robe.maroon : robe.cream,
                            borderColor: sizes.includes(size) ? robe.maroon : robe.blush,
                            color: sizes.includes(size) ? 'white' : robe.text,
                          }}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold mb-3" style={{ color: robe.maroon }}>Color</h3>
                    <div className="grid grid-cols-4 gap-3">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() =>
                            setColors(prev =>
                              prev.includes(color.value)
                                ? prev.filter(c => c !== color.value)
                                : [...prev, color.value]
                            )
                          }
                          className="group flex flex-col items-center gap-1"
                          title={color.name}
                        >
                          <div
                            className={`w-8 h-8 rounded-full border-2 transition-all group-hover:scale-110 ${
                              colors.includes(color.value)
                                ? "border-(--robe-maroon)"
                                : "border-transparent group-hover:border-(--robe-blush)"
                            }`}
                            style={{ backgroundColor: color.value }}
                          >
                            {colors.includes(color.value) && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-center" style={{ color: robe.text }}>
                            {color.name.split(' ')[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <div className="bg-white rounded-xl p-6 mb-6 border"
              style={{ borderColor: robe.blush }}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.2em]"
                      style={{ backgroundColor: robe.cream, color: robe.maroon }}
                    >
                      <span>{heroBadge}</span>
                    </div>
                    {activeFiltersCount > 0 && (
                      <span className="text-xs font-medium px-2 py-1 rounded"
                        style={{ backgroundColor: robe.sand, color: robe.text }}>
                        {activeFiltersCount} active filter{activeFiltersCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl md:text-3xl font-serif font-bold mb-2" style={{ color: robe.maroon }}>
                    {heroTitle}
                  </h1>
                  <p className="text-sm" style={{ color: robe.text }}>
                    {filtered.length > 0
                      ? `${filtered.length} curated pieces celebrating ${heroTitle}`
                      : `We are updating our ${heroBadge.toLowerCase()} selection. Check back soon.`}
                  </p>
                  {heroDescription && (
                    <p
                      className="mt-2 text-sm leading-relaxed"
                      style={{ color: "#3B2A22", maxWidth: "40rem" }}
                    >
                      {heroDescription}
                    </p>
                  )}
                  {isRemoteLoading && (
                    <p className="text-xs text-[#6B0F1A] mt-2">
                      Loading {heroTitle} products…
                    </p>
                  )}
                  {remoteError && (
                    <p className="text-xs text-[#B91C1C] mt-2">
                      {remoteError}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* View Mode Toggle */}
                  <div className="flex items-center rounded-lg border" style={{ borderColor: robe.blush }}>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-l-lg transition-all ${
                        viewMode === "grid"
                          ? "text-white"
                          : "text-(--robe-text) hover:bg-(--robe-cream)"
                      }`}
                      style={{ backgroundColor: viewMode === "grid" ? robe.maroon : "transparent" }}
                    >
                      <Grid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-r-lg transition-all ${
                        viewMode === "list"
                          ? "text-white"
                          : "text-(--robe-text) hover:bg-(--robe-cream)"
                      }`}
                      style={{ backgroundColor: viewMode === "list" ? robe.maroon : "transparent" }}
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Sort */}
                  <select
                    value={sort}
                    onChange={handleSortChange}
                    className="px-4 py-2 rounded-lg border text-sm font-medium outline-none transition-all hover:border-(--robe-sand) focus:border-(--robe-maroon) focus:ring-1 focus:ring-(--robe-blush)"
                    style={{ 
                      borderColor: robe.blush, 
                      color: robe.text, 
                      backgroundColor: "white" 
                    }}
                  >
                    <option value="featured">Featured</option>
                    <option value="newest">New Arrivals</option>
                    <option value="popular">Most Popular</option>
                    <option value="low">Price: Low to High</option>
                    <option value="high">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Products Grid/List */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isWishlisted={isProductWishlisted(product)}
                    isInCart={isProductInCart(product)}
                    onToggleWishlist={() => handleToggleWishlist(product)}
                    onAddToCart={() => handleAddToCart(product)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((product) => (
                  <ProductListItem
                    key={product.id}
                    product={product}
                    isWishlisted={isProductWishlisted(product)}
                    isInCart={isProductInCart(product)}
                    onToggleWishlist={() => handleToggleWishlist(product)}
                    onAddToCart={() => handleAddToCart(product)}
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <div className="mb-6">
                  <div className="w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-4"
                    style={{ backgroundColor: robe.cream }}>
                    <Filter className="w-12 h-12" style={{ color: robe.sand }} />
                  </div>
                  <h3 className="text-xl font-serif font-semibold mb-2" style={{ color: robe.maroon }}>
                    No products found
                  </h3>
                  <p className="text-sm mb-6" style={{ color: robe.text }}>
                    Try adjusting your filters or browse our full collection
                  </p>
                  <button
                    onClick={clearAll}
                    className="px-6 py-3 rounded-lg text-sm font-semibold uppercase tracking-[0.15em] transition-all hover:shadow-lg"
                    style={{ backgroundColor: robe.maroon, color: "white" }}
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            )}

            {/* Pagination */}
            {filtered.length > 0 && (
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm" style={{ color: robe.text }}>
                  Showing 1-{Math.min(filtered.length, 12)} of {filtered.length} products
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, "...", 7].map((page, i) => (
                    <button
                      key={i}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg border text-sm font-medium transition-all ${
                        page === 1
                          ? "text-white"
                          : "text-(--robe-text) hover:border-(--robe-sand)"
                      } ${page === "..." ? "pointer-events-none" : ""}`}
                      style={{
                        backgroundColor: page === 1 ? robe.maroon : "transparent",
                        borderColor: page === 1 ? robe.maroon : robe.blush,
                        color: page === 1 ? 'white' : robe.text,
                      }}
                    >
                      {page}
                    </button>
                  ))}
                  <button className="px-4 py-2 rounded-lg border text-sm font-medium transition-all hover:border-(--robe-sand)"
                    style={{ borderColor: robe.blush, color: robe.text }}>
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal Close */}
      {showFilters && isMobile && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
      )}
    </div>
  );
}

function ProductCard({
  product,
  isWishlisted,
  isInCart,
  onToggleWishlist,
  onAddToCart,
}: {
  product: Product;
  isWishlisted: boolean;
  isInCart: boolean;
  onToggleWishlist: () => void;
  onAddToCart: () => void;
}) {
  const isOnSale = product.salePrice && product.salePrice < product.price;
  const discountPercent = isOnSale
    ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
    : 0;

  // Ensure we have a valid slug for the link
  const productSlug = product.slug || product.id;
  const addButtonDisabled = isInCart;
  const addButtonClass = `w-full py-2.5 text-white font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
    addButtonDisabled
      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
      : "bg-linear-to-r from-blue-600 to-purple-600 hover:shadow-lg"
  }`;
  const addButtonLabel = isInCart ? "In Cart" : "Add to Cart";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-white rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-xl"
      style={{ borderColor: robe.blush }}
    >
      <Link href={`/product-data/${productSlug}`} prefetch={false}>
        {/* Image Container */}
        <div className="relative h-80 overflow-hidden bg-linear-to-br from-(--robe-cream) to-white">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.isNew && (
              <span className="px-3 py-1 text-xs font-bold rounded-full shadow-sm"
                style={{ backgroundColor: robe.maroon, color: "white" }}>
                NEW
              </span>
            )}
            {product.isBestseller && (
              <span className="px-3 py-1 text-xs font-bold rounded-full shadow-sm"
                style={{ backgroundColor: robe.sand, color: robe.text }}>
                BESTSELLER
              </span>
            )}
          </div>
          
          {isOnSale && (
            <span className="absolute top-3 right-3 px-3 py-1 text-xs font-bold rounded-full shadow-sm"
              style={{ backgroundColor: robe.maroon, color: "white" }}>
              -{discountPercent}%
            </span>
          )}
          
          {/* Quick Actions Overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
            <button className="w-full py-2.5 text-white font-medium text-sm rounded-lg transition-all hover:shadow-lg"
              style={{ backgroundColor: robe.maroon }}>
              Quick View
            </button>
          </div>
        </div>
      </Link>

      {/* Wishlist Button */}
      <button
        onClick={onToggleWishlist}
        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm z-10 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.9)" }}
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart className={`w-4 h-4 ${isWishlisted ? "fill-(--robe-maroon) text-(--robe-maroon)" : ""}`}
          style={{ color: isWishlisted ? robe.maroon : robe.text }} />
      </button>

      {/* Product Info */}
      <div className="p-5">
        <div className="mb-2">
          <span className="text-xs font-medium uppercase tracking-wider"
            style={{ color: robe.sand }}>
            {product.brand} • {product.category}
          </span>
        </div>

        <Link href={`/product-data/${productSlug}`} prefetch={false}>
          <h3 className="text-base font-semibold mb-2 hover:opacity-80 transition-opacity line-clamp-1"
            style={{ color: robe.text }}>
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'text-amber-400' : 'text-gray-300'}`}
                fill={i < Math.floor(product.rating) ? "currentColor" : "none"}
              />
            ))}
          </div>
          <span className="text-sm font-medium" style={{ color: robe.text }}>{product.rating}</span>
          <span className="text-sm" style={{ color: robe.sand }}>({product.reviewCount})</span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold" style={{ color: robe.maroon }}>
              {formatTk(isOnSale ? product.salePrice! : product.price)}
            </span>
            {isOnSale && (
              <span className="text-sm line-through" style={{ color: robe.sand }}>
                {formatTk(product.price)}
              </span>
            )}
          </div>
          
          {/* Color Swatches */}
          <div className="flex gap-1">
            {product.colors.slice(0, 3).map((color, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full border"
                style={{ backgroundColor: color, borderColor: robe.blush }}
              />
            ))}
            {product.colors.length > 3 && (
              <div className="w-4 h-4 rounded-full text-xs flex items-center justify-center"
                style={{ backgroundColor: robe.cream, borderColor: robe.blush, color: robe.text }}>
                +{product.colors.length - 3}
              </div>
            )}
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          className={addButtonClass}
          type="button"
          onClick={onAddToCart}
          disabled={addButtonDisabled}
        >
          <ShoppingBag className="w-4 h-4" />
          {addButtonLabel}
        </button>
      </div>
    </motion.div>
  );
}

function ProductListItem({
  product,
  isWishlisted,
  isInCart,
  onToggleWishlist,
  onAddToCart,
}: {
  product: Product;
  isWishlisted: boolean;
  isInCart: boolean;
  onToggleWishlist: () => void;
  onAddToCart: () => void;
}) {
  const isOnSale = product.salePrice && product.salePrice < product.price;
  // Ensure we have a valid slug for the link
  const productSlug = product.slug || product.id;
  const addButtonDisabled = isInCart;
  const addButtonClass = `px-6 py-2.5 flex items-center gap-2 font-medium rounded-lg transition-all duration-300 ${
    addButtonDisabled
      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
      : "bg-linear-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg"
  }`;
  const addButtonLabel = isInCart ? "In Cart" : "Add to Cart";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-md"
      style={{ borderColor: robe.blush }}
    >
      <div className="flex flex-col md:flex-row">
        {/* Image */}
        <Link href={`/product-data/${productSlug}`} className="md:w-64 shrink-0" prefetch={false}>
          <div className="relative h-64 md:h-full overflow-hidden bg-linear-to-br from-(--robe-cream) to-white">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 256px"
            />
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {product.isNew && (
                <span className="px-3 py-1 text-xs font-bold rounded-full shadow-sm"
                  style={{ backgroundColor: robe.maroon, color: "white" }}>
                  NEW
                </span>
              )}
              {product.isBestseller && (
                <span className="px-3 py-1 text-xs font-bold rounded-full shadow-sm"
                  style={{ backgroundColor: robe.sand, color: robe.text }}>
                  BESTSELLER
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Details */}
        <div className="flex-1 p-6">
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider mb-2 block"
                    style={{ color: robe.sand }}>
                    {product.brand} • {product.category}
                  </span>
                  <Link href={`/product-data/${productSlug}`} prefetch={false}>
                    <h3 className="text-xl font-serif font-semibold mt-1 hover:opacity-80 transition-opacity"
                      style={{ color: robe.text }}>
                      {product.name}
                    </h3>
                  </Link>
                </div>
                <button
                  onClick={onToggleWishlist}
                  className="transition-colors hover:opacity-80"
                  aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? "fill-(--robe-maroon) text-(--robe-maroon)" : ""}`}
                    style={{ color: isWishlisted ? robe.maroon : robe.text }} />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'text-amber-400' : 'text-gray-300'}`}
                        fill={i < Math.floor(product.rating) ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium" style={{ color: robe.text }}>
                    {product.rating} ({product.reviewCount} reviews)
                  </span>
                </div>
              </div>

              <p className="mb-6 line-clamp-2" style={{ color: robe.text }}>
                Premium quality {product.category?.toLowerCase()} crafted with attention to detail and sustainable materials.
              </p>

              <div className="flex flex-wrap gap-6 mb-6">
                <div>
                  <div className="text-sm mb-2" style={{ color: robe.sand }}>Available Sizes</div>
                  <div className="flex gap-2">
                    {product.sizes.map(size => (
                      <span key={size} className="px-3 py-1 text-sm rounded"
                        style={{ backgroundColor: robe.cream, color: robe.text }}>
                        {size}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm mb-2" style={{ color: robe.sand }}>Available Colors</div>
                  <div className="flex gap-2">
                    {product.colors.slice(0, 4).map((color, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: color, borderColor: robe.blush }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t" style={{ borderColor: robe.blush }}>
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold" style={{ color: robe.maroon }}>
                    {formatTk(isOnSale ? product.salePrice! : product.price)}
                  </span>
                  {isOnSale && (
                    <>
                      <span className="text-lg line-through" style={{ color: robe.sand }}>
                        {formatTk(product.price)}
                      </span>
                      <span className="px-2 py-1 text-sm font-bold rounded"
                        style={{ backgroundColor: robe.cream, color: robe.maroon }}>
                        SAVE {Math.round(((product.price - product.salePrice!) / product.price) * 100)}%
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  className={addButtonClass}
                  type="button"
                  onClick={onAddToCart}
                  disabled={addButtonDisabled}
                >
                  <ShoppingBag className="w-4 h-4" />
                  {addButtonLabel}
                </button>
                <Link
                  href={`/product-data/${productSlug}`}
                  className="px-6 py-2.5 font-medium rounded-lg transition-colors border"
                  prefetch={false}
                  style={{ 
                    borderColor: robe.blush, 
                    color: robe.text,
                    backgroundColor: "white"
                  }}
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
