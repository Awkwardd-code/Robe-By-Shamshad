"use client";

import { useMemo, useState, useEffect, ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter,
  Grid,
  List,
  ChevronRight,
  ChevronLeft,
  Star,
  Heart,
  Eye,
  ShoppingBag,
  Check,
  Search,
  X,
} from "lucide-react";
import { useCommerce } from "@/context/CommerceContext";
import type { Product as CommerceProduct } from "@/context/CommerceContext";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

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
  itemType: "product" | "combo";
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
  "Shirts",
  "Panjabis",
  "Sarees",
  "Blouses",
  "Dresses",
  "Kurtas",
  "Pants",
  "Blazers",
  "Accessories",
];

function formatTk(n: number) {
  return `Tk. ${n.toLocaleString("en-US")}`;
}

const mapProductToCommerce = (product: Product): CommerceProduct => {
  const price = product.salePrice ?? product.price;
  return {
    ...product,
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

const getDetailHref = (product: Product) => {
  const slug = product.routeSlug || product.slug || product.id;
  return product.itemType === "combo" ? `/product-data/${slug}` : `/products/${slug}`;
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
  if (Number.isFinite(parsed)) return parsed;
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
  const str = String(input);
  const withoutExt = str.replace(/\.[^/.]+$/, "");
  return withoutExt
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length > 0;
}

function generateSlug(name: string, id: string): string {
  const nameSlug = normalizeSlug(name);
  const shortId = id.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase();
  if (nameSlug && nameSlug !== "unknown-product") return `${nameSlug}-${shortId}`;
  return `product-${shortId}`;
}

function ensureValidSlug(rawSlug?: string, name?: string, id?: string): string {
  if (rawSlug) {
    const normalized = normalizeSlug(rawSlug);
    if (isValidSlug(normalized)) return normalized;
  }
  if (name && id) {
    const generated = generateSlug(name, id);
    if (isValidSlug(generated)) return generated;
  }
  if (id) {
    return `product-${id.replace(/[^a-z0-9]/gi, "").slice(-8).toLowerCase()}`;
  }
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

  const rawSlug = detail?.slug ?? entry.slug;
  const rawName = detail?.name ?? entry.name;
  const rawId = detail?._id?.toString() ?? refIdString ?? rawName;

  const slug = ensureValidSlug(rawSlug, rawName, rawId);
  const slugCandidate =
    typeof rawSlug === "string" ? rawSlug.trim() : rawSlug ? String(rawSlug).trim() : "";
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

  const rating = Math.min(5, Math.max(0, safeNumber(detail?.ratings?.averageRating, 4.5)));
  const reviewCount = safeNumber(detail?.ratings?.totalReviews, 0);
  const category = detail?.category ?? entry.category ?? "Collection";
  const id = rawId || slug;

  return {
    id,
    itemType: entry.type,
    brand: detail?.brand ?? "ROBE",
    name: rawName ?? slug.replace(/-/g, " "),
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
    delivery: detail?.delivery,
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
    return collectionProducts.map(normalizeCollectionItem).filter(Boolean) as Product[];
  }
  if (payload.type === "category") {
    return normalizeProductList(payload.data.products);
  }
  return [];
};

/* -------------------- Minimal design helpers (same as combo page) -------------------- */
function TogglePill({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`h-9 px-3 border text-xs font-bold uppercase tracking-widest transition ${active
        ? "border-gray-900 text-gray-900 bg-gray-50"
        : "border-gray-200 text-gray-600 hover:border-gray-400"
        }`}
    >
      {children}
    </button>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-700 hover:border-gray-400"
      title="Remove filter"
    >
      <span className="truncate max-w-45">{label}</span>
      <span className="text-gray-400">×</span>
    </button>
  );
}

function StarsInline({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < full ? "text-amber-400" : "text-gray-300"}`}
          fill={i < full ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="animate-pulse bg-white border border-gray-200 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
      <div className="relative h-56 bg-gray-100" />
      <div className="px-4 pb-5 pt-3 space-y-3 text-center">
        <div className="h-3 w-24 bg-gray-200 rounded mx-auto" />
        <div className="h-4 w-4/5 bg-gray-200 rounded mx-auto" />
        <div className="h-4 w-2/3 bg-gray-200 rounded mx-auto" />
        <div className="h-5 w-24 bg-gray-200 rounded mx-auto" />
      </div>
      <div className="px-4 pb-4">
        <div className="h-11 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

function ProductListSkeleton() {
  return (
    <div className="animate-pulse bg-white border border-gray-200 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
      <div className="flex flex-col md:flex-row gap-4 p-5">
        <div className="md:w-64 h-56 bg-gray-100" />
        <div className="flex-1 space-y-3">
          <div className="h-3 w-28 bg-gray-200 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
          <div className="h-4 w-1/2 bg-gray-200 rounded" />
          <div className="h-10 w-56 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

/* -------------------- Component -------------------- */
export default function ProductListingPage({
  collectionSlug,
  collectionName,
  initialProductData,
}: ProductListingPageProps) {
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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { wishlistItems, addToWishlist, removeFromWishlist, addToCart, isInCart } = useCommerce();
  const wishlistIds = useMemo(() => new Set(wishlistItems.map((item) => item.id)), [wishlistItems]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // lock body scroll for mobile drawer
  useEffect(() => {
    if (!isMobile) return;
    if (!showFilters) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showFilters, isMobile]);

  // debounce search (client-side)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

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
      const list = Array.isArray(payload?.products) ? (payload.products as ApiProduct[]) : [];
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
      setHeroSource(payload.type === "collection" ? "collection" : payload.type === "category" ? "category" : null);
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
        setRemoteError(error instanceof Error ? error.message : "Failed to load collection products");
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

  const fallbackTitle = collectionSlug ? titleizeSlug(collectionSlug) : "All Products";

  const heroTitle =
    heroSource === "collection"
      ? collectionMeta?.bannerTitle ?? collectionName ?? fallbackTitle
      : heroSource === "category"
        ? categoryMeta?.name ?? collectionName ?? fallbackTitle
        : collectionName ?? fallbackTitle;

  const heroBadge = heroSource === "category" ? "Category" : heroSource === "collection" ? "Collection" : "Products";

  const heroDescription =
    heroSource === "category"
      ? categoryMeta?.description
      : heroSource === "collection"
        ? collectionMeta?.bannerDescription
        : undefined;

  const filtered = useMemo(() => {
    let list = [...remoteProducts];

    // search (client-side, keeps API logic unchanged)
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((p) => {
        const hay = `${p.name} ${p.brand} ${p.category ?? ""} ${p.gender}`.toLowerCase();
        return hay.includes(q);
      });
    }

    if (gender !== "all") list = list.filter((p) => p.gender === gender);

    if (categories.length > 0) list = list.filter((p) => categories.includes(p.category!));

    if (priceIds.length > 0) {
      const activeRanges = PRICE_RANGES.filter((r) => priceIds.includes(r.id));
      list = list.filter((p) => {
        const price = p.salePrice ?? p.price;
        return activeRanges.some((r) => price >= r.min && price <= r.max);
      });
    }

    if (sizes.length > 0) list = list.filter((p) => sizes.some((s) => p.sizes.includes(s)));

    if (colors.length > 0) list = list.filter((p) => colors.some((c) => p.colors.includes(c)));

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
  }, [remoteProducts, debouncedSearch, gender, categories, priceIds, sizes, colors, sort]);

  const clearAll = () => {
    setGender("all");
    setCategories([]);
    setPriceIds([]);
    setSizes([]);
    setColors([]);
    setSort("featured");
    setSearchQuery("");
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
    Boolean(debouncedSearch),
    gender !== "all",
    categories.length,
    priceIds.length,
    sizes.length,
    colors.length,
  ].filter(Boolean).length;

  // pagination (refined)
  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, gender, categories, priceIds, sizes, colors, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const pagination = useMemo(() => {
    const pages: Array<number | "..."> = [];
    if (totalPages <= 1) return pages;

    const siblings = 1;
    const boundary = 1;

    const startPages = Array.from({ length: Math.min(boundary, totalPages) }, (_, i) => i + 1);
    const endPages = Array.from(
      { length: Math.min(boundary, totalPages) },
      (_, i) => totalPages - Math.min(boundary, totalPages) + 1 + i
    );

    const leftSibling = Math.max(page - siblings, boundary + 2);
    const rightSibling = Math.min(page + siblings, totalPages - boundary - 1);

    pages.push(...startPages);

    if (leftSibling > boundary + 2) pages.push("...");
    else if (boundary + 1 < totalPages - boundary) pages.push(boundary + 1);

    for (let p = leftSibling; p <= rightSibling; p++) pages.push(p);

    if (rightSibling < totalPages - boundary - 1) pages.push("...");
    else if (totalPages - boundary > boundary) pages.push(totalPages - boundary);

    endPages.forEach((p) => {
      if (!pages.includes(p)) pages.push(p);
    });

    return pages;
  }, [page, totalPages]);

  const setPageSafe = (next: number) => {
    const p = Math.min(totalPages, Math.max(1, next));
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // toggle helpers (button-based filters)
  const toggleArrayValue = <T,>(list: T[], val: T) =>
    list.includes(val) ? list.filter((x) => x !== val) : [...list, val];

  const FilterSidebar = (
    <div className="bg-white border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">Filters</h2>

        {isMobile ? (
          <button
            onClick={() => setShowFilters(false)}
            type="button"
            className="w-9 h-9 border border-gray-200 bg-white inline-flex items-center justify-center hover:bg-gray-50"
            aria-label="Close filters"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
        ) : (
          <button
            onClick={clearAll}
            type="button"
            className="text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900"
          >
            Clear
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-200 pl-9 pr-9 py-2.5 text-sm outline-none focus:border-gray-400"
          />
          {searchQuery.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        {debouncedSearch && (
          <div className="mt-2 text-[11px] text-gray-500">
            Searching for: <span className="font-semibold text-gray-800">{debouncedSearch}</span>
          </div>
        )}
      </div>

      {/* Gender (buttons) */}
      <div className="border-t border-gray-100 pt-5 mb-5">
        <div className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-3">Gender</div>
        <div className="flex flex-wrap gap-2">
          {(["all", "men", "women", "unisex"] as const).map((g) => (
            <TogglePill key={g} active={gender === g} onClick={() => setGender(g)} title={g}>
              {g === "all" ? "All" : g}
            </TogglePill>
          ))}
        </div>
      </div>

      {/* Category (buttons) */}
      <div className="border-t border-gray-100 pt-5 mb-5">
        <div className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-3">Category</div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <TogglePill
              key={c}
              active={categories.includes(c)}
              onClick={() => setCategories((prev) => toggleArrayValue(prev, c))}
              title={c}
            >
              {c}
            </TogglePill>
          ))}
        </div>
      </div>

      {/* Price (buttons) */}
      <div className="border-t border-gray-100 pt-5 mb-5">
        <div className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-3">Price</div>
        <div className="flex flex-col gap-2">
          {PRICE_RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setPriceIds((prev) => toggleArrayValue(prev, r.id))}
              className={[
                "h-9 px-3 border text-xs font-semibold tracking-wide text-left transition",
                priceIds.includes(r.id)
                  ? "border-gray-900 text-gray-900 bg-gray-50"
                  : "border-gray-200 text-gray-600 hover:border-gray-400",
              ].join(" ")}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Size (buttons) */}
      <div className="border-t border-gray-100 pt-5 mb-5">
        <div className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-3">Size</div>
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map((s) => (
            <TogglePill
              key={s}
              active={sizes.includes(s)}
              onClick={() => setSizes((prev) => toggleArrayValue(prev, s))}
              title={s}
            >
              {s}
            </TogglePill>
          ))}
        </div>
      </div>

      {/* Color (refined dots + label) */}
      <div className="border-t border-gray-100 pt-5">
        <div className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-3">Color</div>
        <div className="grid grid-cols-3 gap-2">
          {COLOR_OPTIONS.map((c) => {
            const active = colors.includes(c.value);
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setColors((prev) => toggleArrayValue(prev, c.value))}
                className={`flex items-center gap-2 border px-3 py-2 text-[11px] font-semibold uppercase tracking-widest transition ${active
                  ? "border-gray-900 text-gray-900 bg-gray-50"
                  : "border-gray-200 text-gray-600 hover:border-gray-400"
                  }`}
                title={c.name}
              >
                <span
                  className="w-4 h-4 rounded-full border border-gray-200"
                  style={{ backgroundColor: c.value }}
                />
                {/* <span className="truncate">{c.name}</span> */}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <style jsx>{`
        button {
          cursor: pointer;
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-gray-900 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4 mx-2 text-gray-300" />
          <Link href="/collections" className="hover:text-gray-900 transition-colors">
            Collections
          </Link>
          <ChevronRight className="w-4 h-4 mx-2 text-gray-300" />
          <span className="text-gray-900 font-semibold uppercase tracking-wide">{heroTitle}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Mobile Filter Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center justify-between w-full border border-gray-200 bg-white px-4 py-3"
              type="button"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-700" />
                <span className="text-sm font-semibold uppercase tracking-wide text-gray-900">Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-gray-900 text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          {/* Backdrop */}
          <AnimatePresence>
            {showFilters && isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm"
                onClick={() => setShowFilters(false)}
              />
            )}
          </AnimatePresence>

          {/* Sidebar */}
          <AnimatePresence>
            {(!isMobile || showFilters) && (
              <motion.aside
                initial={isMobile ? { x: -14, opacity: 0 } : { x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={isMobile ? { x: -14, opacity: 0 } : { x: -10, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={isMobile ? "fixed left-0 top-0 bottom-0 z-50 w-[92%] max-w-sm p-4" : "lg:w-60 shrink-0"}
              >
                {isMobile ? <div className="h-full overflow-y-auto">{FilterSidebar}</div> : <div className="sticky top-8">{FilterSidebar}</div>}
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main */}
          <div className="flex-1">
            {/* Header */}
            <div className="mb-5">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-700">
                    <span>{heroBadge}</span>
                  </div>

                  <h1 className="mt-3 text-xl font-bold uppercase tracking-widest text-gray-900">{heroTitle}</h1>

                  <div className="mt-1 text-xs text-gray-500">
                    {isRemoteLoading ? <Skeleton className="w-20 h-4"></Skeleton>: `${filtered.length} products`}
                    {activeFiltersCount > 0 ? ` • ${activeFiltersCount} active` : ""}
                  </div>

                  {heroDescription && <p className="mt-3 text-sm text-gray-600 max-w-2xl">{heroDescription}</p>}
                  {remoteError && <p className="mt-2 text-sm text-red-600">{remoteError}</p>}
                </div>

                <div className="flex items-center gap-3">
                  {/* View */}
                  <div className="flex items-center border border-gray-200">
                    <button
                      onClick={() => setViewMode("grid")}
                      type="button"
                      className={`p-2 ${viewMode === "grid" ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                      aria-label="Grid view"
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      type="button"
                      className={`p-2 border-l border-gray-200 ${viewMode === "list" ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      aria-label="List view"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Sort */}
                  <div className="relative">
                    <select
                      value={sort}
                      onChange={handleSortChange}
                      className="appearance-none border border-gray-200 bg-white pl-3 pr-9 py-2 text-xs font-semibold uppercase tracking-wider text-gray-700 outline-none focus:border-gray-400"
                    >
                      <option value="featured">Featured</option>
                      <option value="newest">New Arrivals</option>
                      <option value="popular">Most Popular</option>
                      <option value="low">Price: Low to High</option>
                      <option value="high">Price: High to Low</option>
                    </select>
                    <ChevronRight className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Active chips */}
              {activeFiltersCount > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {debouncedSearch && <Chip label={`Search: ${debouncedSearch}`} onRemove={() => setSearchQuery("")} />}
                  {gender !== "all" && <Chip label={`Gender: ${gender}`} onRemove={() => setGender("all")} />}
                  {categories.map((c) => (
                    <Chip key={c} label={`Category: ${c}`} onRemove={() => setCategories((p) => p.filter((x) => x !== c))} />
                  ))}
                  {priceIds.map((pid) => (
                    <Chip
                      key={pid}
                      label={`Price: ${PRICE_RANGES.find((r) => r.id === pid)?.label || pid}`}
                      onRemove={() => setPriceIds((p) => p.filter((x) => x !== pid))}
                    />
                  ))}
                  {sizes.map((s) => (
                    <Chip key={s} label={`Size: ${s}`} onRemove={() => setSizes((p) => p.filter((x) => x !== s))} />
                  ))}
                  {colors.map((c) => (
                    <Chip
                      key={c}
                      label={`Color: ${COLOR_OPTIONS.find((x) => x.value === c)?.name || c}`}
                      onRemove={() => setColors((p) => p.filter((x) => x !== c))}
                    />
                  ))}

                  <button
                    type="button"
                    onClick={clearAll}
                    className="ml-auto border border-gray-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-gray-700 hover:border-gray-400"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Products */}
            {isRemoteLoading ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ProductListSkeleton key={i} />
                  ))}
                </div>
              )
            ) : pageItems.length === 0 ? (
              <div className="border border-gray-200 bg-white p-10 text-center">
                <div className="text-gray-400 text-sm mb-2">No products found</div>
                <p className="text-gray-600 text-xs mb-5">Try adjusting filters</p>
                <button
                  onClick={clearAll}
                  className="px-5 py-2 bg-gray-900 text-white text-xs font-semibold uppercase tracking-wider"
                  type="button"
                >
                  Clear Filters
                </button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {pageItems.map((product) => (
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
                {pageItems.map((product) => (
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-xs text-gray-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} products
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPageSafe(page - 1)}
                    disabled={page === 1}
                    className="h-10 px-3 border border-gray-200 text-xs font-semibold uppercase tracking-widest text-gray-700 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    type="button"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>

                  <div className="flex items-center gap-1">
                    {pagination.map((p, i) =>
                      p === "..." ? (
                        <span key={`dots-${i}`} className="w-10 h-10 inline-flex items-center justify-center text-gray-400 text-sm">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPageSafe(p)}
                          className={`w-10 h-10 border text-xs font-semibold uppercase tracking-widest transition ${p === page ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-700 hover:border-gray-400"
                            }`}
                          type="button"
                          aria-current={p === page ? "page" : undefined}
                        >
                          {p}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    onClick={() => setPageSafe(page + 1)}
                    disabled={page === totalPages}
                    className="h-10 px-3 border border-gray-200 text-xs font-semibold uppercase tracking-widest text-gray-700 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    type="button"
                    aria-label="Next page"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Product Card (new design) -------------------- */
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
  const discountPercent = isOnSale ? Math.round(((product.price - product.salePrice!) / product.price) * 100) : 0;

  const detailHref = getDetailHref(product);
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="group relative bg-white border border-gray-200 shadow-[0_1px_0_rgba(0,0,0,0.03)] hover:shadow-[0_10px_22px_rgba(0,0,0,0.10)] transition-shadow"
    >
      <Link href={detailHref} prefetch={false} className="block">
        <div className="relative h-56 bg-white overflow-hidden">
          <Image
            src={product.image || "/placeholder-image.jpg"}
            alt={product.name}
            fill
            className="object-contain p-6 transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          <div className="absolute left-3 top-3 flex flex-col gap-2">
            {product.isNew && (
              <div className="bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                New
              </div>
            )}
            {product.isBestseller && (
              <div className="bg-gray-200 text-gray-800 text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                Bestseller
              </div>
            )}
          </div>

          {isOnSale && (
            <div className="absolute right-3 top-3 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">
              -{discountPercent}%
            </div>
          )}

          <div className="absolute right-3 top-14 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleWishlist();
              }}
              className="w-9 h-9 bg-white/90 backdrop-blur flex items-center justify-center text-gray-400 hover:text-red-500 transition"
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(detailHref);
              }}
              className="w-9 h-9 bg-white/90 backdrop-blur flex items-center justify-center text-gray-400 hover:text-gray-900 transition"
              aria-label="View product"
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-4 pb-5 pt-3 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
            {product.brand} • {product.category ?? "Product"}
          </div>

          <div className="mt-2 text-xs text-gray-800 leading-snug line-clamp-2 min-h-8">{product.name}</div>

          <div className="mt-2 flex items-center justify-center gap-2">
            <StarsInline rating={product.rating} />
            <span className="text-[11px] text-gray-600 font-semibold">{product.rating.toFixed(1)}</span>
            <span className="text-[11px] text-gray-400">({product.reviewCount})</span>
          </div>

          <div className="mt-3 flex items-baseline justify-center gap-2">
            {isOnSale && <span className="text-xs text-gray-400 line-through">{formatTk(product.price)}</span>}
            <span className="text-sm font-bold text-[#F84E25]">
              {formatTk(isOnSale ? product.salePrice! : product.price)}
            </span>
          </div>

          {/* colors */}
          <div className="mt-3 flex justify-center gap-1.5">
            {product.colors.slice(0, 4).map((c, i) => (
              <span key={`${c}-${i}`} className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: c }} />
            ))}
            {product.colors.length > 4 && (
              <span className="text-[10px] text-gray-500 font-semibold border border-gray-200 px-2 py-0.5">
                +{product.colors.length - 4}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isInCart) return;
            onAddToCart();
          }}
          disabled={isInCart}
          className={[
            "w-full h-11 uppercase tracking-widest text-xs font-bold transition",
            isInCart ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-[#B8B8B8] text-white hover:bg-[#AFAFAF]",
            "opacity-0 group-hover:opacity-100",
          ].join(" ")}
        >
          {isInCart ? "In cart" : "Shop now"}
        </button>
      </div>
    </motion.div>
  );
}

/* -------------------- List Item (new design) -------------------- */
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
  const detailHref = getDetailHref(product);
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 shadow-[0_1px_0_rgba(0,0,0,0.03)] hover:shadow-[0_10px_22px_rgba(0,0,0,0.10)] transition-shadow"
    >
      <div className="flex flex-col md:flex-row">
        <Link href={detailHref} prefetch={false} className="md:w-64 shrink-0">
          <div className="relative h-56 md:h-full bg-white overflow-hidden">
            <Image src={product.image || "/placeholder-image.jpg"} alt={product.name} fill className="object-contain p-6" sizes="(max-width: 768px) 100vw, 256px" />

            <div className="absolute left-3 top-3 flex flex-col gap-2">
              {product.isNew && (
                <div className="bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">New</div>
              )}
              {product.isBestseller && (
                <div className="bg-gray-200 text-gray-800 text-[10px] font-bold uppercase tracking-widest px-3 py-1">Bestseller</div>
              )}
            </div>
          </div>
        </Link>

        <div className="flex-1 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                {product.brand} • {product.category ?? "Product"}
              </div>

              <Link href={detailHref} prefetch={false} className="block mt-2">
                <div className="text-sm font-semibold text-gray-900">{product.name}</div>
              </Link>

              <div className="mt-2 flex items-center gap-2">
                <StarsInline rating={product.rating} />
                <span className="text-[11px] text-gray-600 font-semibold">{product.rating.toFixed(1)}</span>
                <span className="text-[11px] text-gray-400">({product.reviewCount})</span>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                {isOnSale && <span className="text-xs text-gray-400 line-through">{formatTk(product.price)}</span>}
                <span className="text-sm font-bold text-[#F84E25]">{formatTk(isOnSale ? product.salePrice! : product.price)}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {product.sizes.slice(0, 6).map((s) => (
                  <span key={s} className="px-2 py-1 text-[11px] border border-gray-200 bg-white text-gray-700">
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex gap-1.5">
                {product.colors.slice(0, 6).map((c, i) => (
                  <span key={`${c}-${i}`} className="w-3.5 h-3.5 rounded-full border border-gray-200" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleWishlist();
                }}
                className="p-1.5 rounded-full bg-transparent hover:shadow-sm transition-shadow"
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${isWishlisted
                      ? "fill-red-500 text-red-500"
                      : "text-gray-400 hover:text-red-500"
                    }`}
                />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(detailHref);
                }}
                className="p-1.5 rounded-full bg-transparent hover:shadow-sm transition-shadow"
                aria-label="View product"
              >
                <Eye className="w-5 h-5 text-gray-400 hover:text-gray-800 transition-colors" />
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isInCart) return;
                onAddToCart();
              }}
              disabled={isInCart}
              className={`h-10 px-5 uppercase tracking-widest text-xs font-bold transition ${isInCart ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-[#B8B8B8] text-white hover:bg-[#AFAFAF]"
                }`}
            >
              <span className="inline-flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                {isInCart ? "In cart" : "Shop now"}
              </span>
            </button>

            <Link
              href={detailHref}
              prefetch={false}
              className="h-10 px-5 border border-gray-200 uppercase tracking-widest text-xs font-bold text-gray-700 hover:border-gray-400 inline-flex items-center"
            >
              View details
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
