/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter,
  Grid,
  List,
  ChevronRight,
  Heart,
  ShoppingBag,
  RefreshCcw,
  ChevronLeft,
  Search,
  X,
} from "lucide-react";
import { useCommerce } from "@/context/CommerceContext";
import type { Product as CommerceProduct } from "@/context/CommerceContext";

type Gender = "men" | "women" | "unisex";
type Size = "XS" | "S" | "M" | "L" | "XL" | "XXL";

interface DeliveryInfo {
  isFree?: boolean;
  charge?: number | string;
  message?: string;
}

interface Product {
  category: string;
  _id: string | { $oid?: string } | null;
  brand: string;
  name: string;
  slug?: string;
  gender: Gender;
  pricing: {
    current: { value: number; currency: string };
    original?: { value: number; currency: string };
    discountPercentage?: number;
  };
  inventory: { quantity: number; status: string };
  media: { thumbnail: string; gallery: string[] };
  details: {
    sizes: string[];
    colors: string[];
    materials: string[];
    features: string[];
  };
  ratings?: { averageRating: number; totalReviews: number };
  isNew?: boolean;
  isBestseller?: boolean;
  createdAt?: string;
  delivery?: DeliveryInfo;
}

interface CategoryOption {
  slug: string;
  name: string;
  productCount?: number;
}

interface ApiResponse {
  products: Product[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
  pageLimit: number;
}

const SIZE_OPTIONS: Size[] = ["XS", "S", "M", "L", "XL", "XXL"];

const COLOR_OPTIONS = [
  { name: "Black", value: "#111827" },
  { name: "White", value: "#ffffff" },
  { name: "Red", value: "#ef4444" },
  { name: "Blue", value: "#0ea5e9" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#fbbf24" },
  { name: "Pink", value: "#f472b6" },
  { name: "Brown", value: "#7c2d12" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Gray", value: "#9ca3af" },
];

const PRICE_RANGES = [
  { id: "u1000", label: "Under Tk. 1000", min: 0, max: 1000 },
  { id: "1000-2000", label: "Tk. 1000 - 2000", min: 1000, max: 2000 },
  { id: "2000-3000", label: "Tk. 2000 - 3000", min: 2000, max: 3000 },
  { id: "3000-4000", label: "Tk. 3000 - 4000", min: 3000, max: 4000 },
  { id: "4000-5000", label: "Tk. 4000 - 5000", min: 4000, max: 5000 },
  { id: "5000+", label: "Tk. 5000+", min: 5000, max: Infinity },
];

const SKELETON_COUNT = 8;

function slugifyName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function resolveApiProductId(product: Product) {
  if (!product._id) return "";
  if (typeof product._id === "string") return product._id;
  if (typeof product._id?.$oid === "string") return product._id.$oid;
  return String(product._id);
}

function resolveProductSlug(product: Product) {
  const explicitSlug = product.slug?.trim();
  if (explicitSlug) return explicitSlug;
  const derivedSlug = slugifyName(product.name || "");
  return derivedSlug || resolveApiProductId(product);
}

const tkFormatter = new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 0 });
function formatTk(n: number) {
  return `Tk. ${tkFormatter.format(n)}`;
}

const toCommerceProduct = (product: Product): CommerceProduct => {
  const slug = product.slug ?? resolveProductSlug(product);
  const image =
    product.media.thumbnail ||
    (product.media.gallery && product.media.gallery.length > 0
      ? product.media.gallery[0]
      : "/placeholder-image.jpg");
  const id = resolveApiProductId(product);

  return {
    ...product,
    id,
    name: product.name,
    slug,
    image,
    price: product.pricing.current.value,
    oldPrice: product.pricing.original?.value ?? product.pricing.current.value,
    category: product.category,
    description: product.details?.features?.[0],
    shortDescription: product.details?.materials?.[0],
  };
};

/* -------------------- UI primitives -------------------- */
function TogglePill({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={[
        "h-9 px-3 border text-xs font-bold uppercase tracking-widest transition",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        active
          ? "border-gray-900 text-gray-900 bg-gray-50"
          : "border-gray-200 text-gray-600 hover:border-gray-400",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Chip({
  onRemove,
  label,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-700 hover:border-gray-400"
      title="Remove filter"
    >
      <span className="truncate max-w-40">{label}</span>
      <span className="text-gray-400">×</span>
    </button>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
        <div
          key={`grid-skel-${index}`}
          className="animate-pulse bg-white border border-gray-200 shadow-[0_1px_0_rgba(0,0,0,0.03)]"
        >
          <div className="h-56 bg-gray-100 flex items-center justify-center">
            <div className="h-32 w-32 bg-gray-200/70 rounded" />
          </div>
          <div className="px-4 py-5 text-center space-y-3">
            <div className="h-3 w-16 bg-gray-200 rounded mx-auto" />
            <div className="h-4 w-4/5 bg-gray-200 rounded mx-auto" />
            <div className="h-4 w-3/5 bg-gray-200 rounded mx-auto" />
            <div className="h-10 w-full bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`list-skel-${index}`}
          className="animate-pulse bg-white border border-gray-200 shadow-[0_1px_0_rgba(0,0,0,0.03)]"
        >
          <div className="flex flex-col md:flex-row gap-4 p-5">
            <div className="md:w-64 h-56 bg-gray-100 flex items-center justify-center">
              <div className="h-28 w-28 bg-gray-200/70 rounded" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="h-3 w-28 bg-gray-200 rounded" />
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
              <div className="h-4 w-1/2 bg-gray-200 rounded" />
              <div className="h-10 w-56 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterSidebarSkeleton() {
  return (
    <div className="bg-white border border-gray-200 p-5 space-y-6 animate-pulse">
      <div className="h-4 w-1/2 rounded bg-gray-200" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-24 rounded bg-gray-200" />
          <div className="h-3 w-40 rounded bg-gray-200/80" />
          <div className="h-3 w-36 rounded bg-gray-200/70" />
        </div>
      ))}
    </div>
  );
}

/* -------------------- Page -------------------- */
export default function DynamicProductListingPage() {
  const [gender, setGender] = useState<Gender | "all">("all");
  const [brands, setBrands] = useState<string[]>([]);
  const [priceIds, setPriceIds] = useState<string[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<CategoryOption[]>([]);
  const [sort, setSort] = useState<"featured" | "newest" | "popular" | "low" | "high">("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const searchParams = useSearchParams();
  const searchParam = searchParams.get("search") || "";
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    searchParams.getAll("category")
  );

  const { wishlistItems, addToWishlist, removeFromWishlist, addToCart, isInCart } = useCommerce();
  const wishlistIds = useMemo(() => new Set(wishlistItems.map((item) => item.id)), [wishlistItems]);

  // API states
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Track desktop safely
  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= 1024);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!showFilters || isDesktop) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showFilters, isDesktop]);

  // Unique brands from products
  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.brand))).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [products]);

  // Load categories
  useEffect(() => {
    const controller = new AbortController();

    const loadCategories = async () => {
      try {
        const response = await fetch("/api/categories?limit=100", { signal: controller.signal });
        if (!response.ok) throw new Error(`Failed to load categories (${response.status})`);

        const data = await response.json();
        if (!Array.isArray(data.categories)) return;

        const sanitized: CategoryOption[] = data.categories
          .filter((cat: any) => cat?.slug && cat?.name)
          .map((cat: any) => ({
            slug: String(cat.slug),
            name: String(cat.name),
            productCount: Number.isFinite(cat.productCount) ? cat.productCount : undefined,
          }));

        const deduped = Array.from(new Map(sanitized.map((cat) => [cat.slug, cat])).values());
        deduped.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
        );

        setAvailableCategories(deduped);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error("Unable to load categories", e);
      }
    };

    loadCategories();
    return () => controller.abort();
  }, []);

  // Keep categories in sync with URL
  useEffect(() => {
    const categoriesFromUrl = searchParams.getAll("category");
    setSelectedCategories((prev) => {
      if (prev.length === categoriesFromUrl.length && prev.every((v, i) => v === categoriesFromUrl[i])) {
        return prev;
      }
      return categoriesFromUrl;
    });
  }, [searchParams]);

  useEffect(() => {
    const next = searchParam.trim();
    setSearchQuery((prev) => (prev === next ? prev : next));
  }, [searchParam]);

  const categoryNameBySlug = useMemo(() => {
    const map = new Map<string, string>();
    availableCategories.forEach((cat) => map.set(cat.slug, cat.name));
    return map;
  }, [availableCategories]);

  // Debounce search (enabled)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch products (server filters: search, gender, sort, brand, category, pagination)
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12",
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(gender !== "all" && { gender }),
        ...(sort !== "featured" && { sort }),
      });

      brands.forEach((brand) => params.append("brand", brand));
      selectedCategories.forEach((slug) => params.append("category", slug));

      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error(`Failed to fetch products: ${response.status}`);

      const data: ApiResponse = await response.json();

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const updated = data.products.map((product) => ({
        ...product,
        isNew: product.createdAt ? new Date(product.createdAt) > sevenDaysAgo : false,
        isBestseller: (product.ratings?.averageRating || 0) >= 4.5,
      }));

      setProducts(updated);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (err: any) {
      setError(err?.message || "Failed to load products");
      console.error("Error fetching products:", err);
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, [currentPage, debouncedSearch, gender, sort, brands, selectedCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Client-side filtering (price/size/color + category fallback)
  const filtered = useMemo(() => {
    let list = [...products];

    if (priceIds.length > 0) {
      const activeRanges = PRICE_RANGES.filter((r) => priceIds.includes(r.id));
      list = list.filter((p) => {
        const price = p.pricing.current.value;
        return activeRanges.some((r) => price >= r.min && price <= r.max);
      });
    }

    if (sizes.length > 0) {
      list = list.filter((p) => sizes.some((s) => p.details?.sizes?.includes(s)));
    }

    if (colors.length > 0) {
      list = list.filter((p) => colors.some((c) => p.details?.colors?.includes(c)));
    }

    if (selectedCategories.length > 0) {
      list = list.filter((p) => selectedCategories.includes(p.category));
    }

    return list;
  }, [products, priceIds, sizes, colors, selectedCategories]);

  const clearAll = () => {
    setGender("all");
    setBrands([]);
    setPriceIds([]);
    setSizes([]);
    setColors([]);
    setSelectedCategories([]);
    setSort("featured");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleToggleWishlist = (product: Product) => {
    const commerceProduct = toCommerceProduct(product);
    if (wishlistIds.has(commerceProduct.id)) {
      removeFromWishlist(commerceProduct.id);
      return;
    }
    addToWishlist(commerceProduct);
  };

  const isProductInCart = (product: Product) => isInCart(resolveApiProductId(product));

  const handleAddToCart = (product: Product) => {
    if (product.inventory.quantity <= 0) return;
    if (isProductInCart(product)) return;
    addToCart(toCommerceProduct(product));
  };

  const isProductWishlisted = (product: Product) => wishlistIds.has(resolveApiProductId(product));

  const activeFiltersCount = [
    gender !== "all",
    brands.length,
    priceIds.length,
    sizes.length,
    colors.length,
    selectedCategories.length,
    Boolean(debouncedSearch),
  ].filter(Boolean).length;

  const showInitialSkeletons = isLoading && !hasLoadedOnce;
  const isRefreshing = isLoading && hasLoadedOnce;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // refined pagination: always show first/last + siblings
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

    const leftSibling = Math.max(currentPage - siblings, boundary + 2);
    const rightSibling = Math.min(currentPage + siblings, totalPages - boundary - 1);

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
  }, [currentPage, totalPages]);

  // Filter button toggles (replace checkboxes with buttons)
  const toggleArrayValue = <T,>(list: T[], val: T) =>
    list.includes(val) ? list.filter((x) => x !== val) : [...list, val];

  return (
    <div className="min-h-screen bg-white">
      <style jsx>{`
        button {
          cursor: pointer;
        }
        .scrollbar-hide {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-gray-900 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4 mx-2 text-gray-300" />
          <Link href="/products" className="hover:text-gray-900 transition-colors">
            Products
          </Link>
          <ChevronRight className="w-4 h-4 mx-2 text-gray-300" />
          <span className="text-gray-900 font-semibold uppercase tracking-wide">All Products</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center justify-between w-full border border-gray-200 bg-white px-4 py-3"
              type="button"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-700" />
                <span className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                  Filters
                </span>
                {activeFiltersCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-gray-900 text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <ChevronRight
                className={`w-4 h-4 text-gray-700 transition-transform ${
                  showFilters ? "rotate-90" : ""
                }`}
              />
            </button>
          </div>

          {/* Sidebar Filters */}
          <AnimatePresence>
            {(showFilters || isDesktop) && (
              <>
                {!isDesktop && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                    onClick={() => setShowFilters(false)}
                  />
                )}
                <motion.aside
                  initial={isDesktop ? { x: -14, opacity: 0 } : { y: 12, opacity: 0 }}
                  animate={{ x: 0, y: 0, opacity: 1 }}
                  exit={isDesktop ? { x: -14, opacity: 0 } : { y: 12, opacity: 0 }}
                  className={
                    isDesktop
                      ? "lg:w-65 shrink-0"
                      : "fixed left-1/2 top-20 bottom-6 z-50 w-[92%] max-w-md -translate-x-1/2"
                  }
                >
                  {showInitialSkeletons ? (
                    <div className={isDesktop ? "" : "h-full overflow-y-auto scrollbar-hide rounded-xl"}>
                      <FilterSidebarSkeleton />
                    </div>
                  ) : (
                    <div
                      className={`bg-white border border-gray-200 p-5 ${
                        isDesktop ? "sticky top-8" : "h-full overflow-y-auto scrollbar-hide rounded-xl"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">
                          Filters
                        </h2>
                        {isDesktop ? (
                          <button
                            onClick={clearAll}
                            className="text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900"
                            type="button"
                          >
                            Clear
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowFilters(false)}
                            className="w-9 h-9 border border-gray-200 bg-white inline-flex items-center justify-center hover:bg-gray-50"
                            type="button"
                            aria-label="Close filters"
                          >
                            <X className="w-4 h-4 text-gray-700" />
                          </button>
                        )}
                      </div>

                    {/* Search (enabled + refined) */}
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
                      {isRefreshing && (
                        <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-2" role="status">
                          <RefreshCcw className="w-3 h-3 animate-spin" />
                          Updating results...
                        </div>
                      )}
                    </div>

                    {/* Gender (buttons) */}
                    <div className="border-t border-gray-100 pt-5 mb-5">
                      <div className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-3">
                        Gender
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(["all", "men", "women", "unisex"] as const).map((g) => (
                          <TogglePill
                            key={g}
                            active={gender === g}
                            onClick={() => {
                              setGender(g);
                              setCurrentPage(1);
                            }}
                          >
                            {g === "all" ? "All" : g}
                          </TogglePill>
                        ))}
                      </div>
                    </div>

                    {/* Price (buttons) */}
                    <div className="border-t border-gray-100 pt-5 mb-5">
                      <div className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-3">
                        Price
                      </div>
                      <div className="flex flex-col gap-2">
                        {PRICE_RANGES.map((range) => (
                          <button
                            key={range.id}
                            type="button"
                            onClick={() => setPriceIds((prev) => toggleArrayValue(prev, range.id))}
                            className={[
                              "h-9 px-3 border text-xs font-semibold tracking-wide text-left transition",
                              priceIds.includes(range.id)
                                ? "border-gray-900 text-gray-900 bg-gray-50"
                                : "border-gray-200 text-gray-600 hover:border-gray-400",
                            ].join(" ")}
                          >
                            {range.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Size (buttons already) */}
                    <div className="border-t border-gray-100 pt-5 mb-5">
                      <div className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-3">
                        Size
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {SIZE_OPTIONS.map((size) => (
                          <TogglePill
                            key={size}
                            active={sizes.includes(size)}
                            onClick={() => setSizes((prev) => toggleArrayValue(prev, size))}
                          >
                            {size}
                          </TogglePill>
                        ))}
                      </div>
                    </div>

                    {/* Color (buttons) */}
                    <div className="border-t border-gray-100 pt-5">
                      <div className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-3">
                        Color
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {COLOR_OPTIONS.map((c) => {
                          const active = colors.includes(c.value);
                          return (
                            <button
                              key={c.value}
                              type="button"
                              title={c.name}
                              onClick={() => setColors((prev) => toggleArrayValue(prev, c.value))}
                              className="w-7 h-7 border border-gray-300"
                              style={{
                                backgroundColor: c.value,
                                outline: active ? "2px solid #111827" : "none",
                                outlineOffset: 2,
                              }}
                              aria-label={c.name}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Brand (buttons) */}
                    {uniqueBrands.length > 0 && (
                      <div className="border-t border-gray-100 pt-5 mt-5">
                        <div className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-3">
                          Brand
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
                          {uniqueBrands.map((brand) => (
                            <TogglePill
                              key={brand}
                              active={brands.includes(brand)}
                              onClick={() => {
                                setBrands((prev) => toggleArrayValue(prev, brand));
                                setCurrentPage(1);
                              }}
                              title={brand}
                            >
                              {brand}
                            </TogglePill>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Category (buttons) */}
                    {availableCategories.length > 0 && (
                      <div className="border-t border-gray-100 pt-5 mt-5">
                        <div className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-3">
                          Category
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto pr-1">
                          {availableCategories.map((category) => (
                            <TogglePill
                              key={category.slug}
                              active={selectedCategories.includes(category.slug)}
                              onClick={() => {
                                setSelectedCategories((prev) => toggleArrayValue(prev, category.slug));
                                setCurrentPage(1);
                              }}
                              title={category.name}
                            >
                              {category.name}
                            </TogglePill>
                          ))}
                        </div>
                      </div>
                    )}
                    </div>
                  )}
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <div className="flex-1">
            {/* Topbar: refined select filter + view toggles */}
            <div className="mb-5">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold uppercase tracking-widest text-gray-900">
                    All Products
                  </h1>
                  <div className="mt-1 text-xs text-gray-500">
                    {isLoading ? (
                      <span className="inline-block h-3 w-24 bg-gray-200 animate-pulse align-middle" />
                    ) : (
                      `${totalCount} items`
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* View Mode Toggle */}
                  <div className="flex items-center border border-gray-200">
                    <button
                      onClick={() => setViewMode("grid")}
                      type="button"
                      className={`p-2 ${
                        viewMode === "grid"
                          ? "bg-gray-900 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                      aria-label="Grid view"
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      type="button"
                      className={`p-2 border-l border-gray-200 ${
                        viewMode === "list"
                          ? "bg-gray-900 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                      aria-label="List view"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Refined sort select */}
                  <div className="relative">
                    <select
                      value={sort}
                      onChange={(e) => {
                        setSort(e.target.value as any);
                        setCurrentPage(1);
                      }}
                      className="appearance-none border border-gray-200 bg-white pl-3 pr-9 py-2 text-xs font-semibold uppercase tracking-wider text-gray-700 outline-none focus:border-gray-400"
                    >
                      <option value="featured">Featured</option>
                      <option value="newest">Newest</option>
                      <option value="popular">Most Popular</option>
                      <option value="low">Price: Low to High</option>
                      <option value="high">Price: High to Low</option>
                    </select>
                    <ChevronRight className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Active filter chips */}
              {activeFiltersCount > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {debouncedSearch && (
                    <Chip label={`Search: ${debouncedSearch}`} onRemove={() => setSearchQuery("")} />
                  )}
                  {gender !== "all" && (
                    <Chip label={`Gender: ${gender}`} onRemove={() => setGender("all")} />
                  )}
                  {brands.map((b) => (
                    <Chip
                      key={b}
                      label={`Brand: ${b}`}
                      onRemove={() => setBrands((prev) => prev.filter((x) => x !== b))}
                    />
                  ))}
                  {selectedCategories.map((slug) => (
                    <Chip
                      key={slug}
                      label={`Category: ${categoryNameBySlug.get(slug) || slug}`}
                      onRemove={() => setSelectedCategories((prev) => prev.filter((x) => x !== slug))}
                    />
                  ))}
                  {priceIds.map((pid) => (
                    <Chip
                      key={pid}
                      label={`Price: ${PRICE_RANGES.find((r) => r.id === pid)?.label || pid}`}
                      onRemove={() => setPriceIds((prev) => prev.filter((x) => x !== pid))}
                    />
                  ))}
                  {sizes.map((s) => (
                    <Chip label={`Size: ${s}`} key={s} onRemove={() => setSizes((prev) => prev.filter((x) => x !== s))} />
                  ))}
                  {colors.map((c) => (
                    <Chip
                      key={c}
                      label={`Color`}
                      onRemove={() => setColors((prev) => prev.filter((x) => x !== c))}
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

            {/* Loading / Error / Empty / Results */}
            {showInitialSkeletons ? (
              viewMode === "grid" ? (
                <ProductGridSkeleton />
              ) : (
                <ProductListSkeleton />
              )
            ) : error ? (
              <div className="border border-red-200 bg-red-50 p-6 text-center">
                <p className="text-red-700 font-semibold text-sm mb-2">Error loading products</p>
                <p className="text-red-600 text-xs">{error}</p>
                <button
                  onClick={() => fetchProducts()}
                  className="mt-4 px-4 py-2 bg-gray-900 text-white text-xs font-semibold uppercase tracking-wider"
                  type="button"
                >
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
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
            ) : (
              <>
                {isRefreshing && (
                  <div className="mb-4 flex items-center gap-2 text-xs text-gray-500">
                    <RefreshCcw className="w-3 h-3 animate-spin" />
                    Updating results...
                  </div>
                )}
                {viewMode === "grid" ? (
                  <div
                    className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 ${
                      isRefreshing ? "opacity-70" : ""
                    }`}
                  >
                    {filtered.map((product) => (
                      <ProductCard
                        key={resolveApiProductId(product)}
                        product={product}
                        isWishlisted={isProductWishlisted(product)}
                        isInCart={isProductInCart(product)}
                        onToggleWishlist={() => handleToggleWishlist(product)}
                        onAddToCart={() => handleAddToCart(product)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className={`space-y-4 ${isRefreshing ? "opacity-70" : ""}`}>
                    {filtered.map((product) => (
                      <ProductListItem
                        key={resolveApiProductId(product)}
                        product={product}
                        isWishlisted={isProductWishlisted(product)}
                        isInCart={isProductInCart(product)}
                        onToggleWishlist={() => handleToggleWishlist(product)}
                        onAddToCart={() => handleAddToCart(product)}
                      />
                    ))}
                  </div>
                )}

                {/* Refined Pagination */}
                {totalPages > 1 && (
                  <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-gray-500">
                      Showing {(currentPage - 1) * 12 + 1}-{Math.min(currentPage * 12, totalCount)} of{" "}
                      {totalCount}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-10 px-3 border border-gray-200 text-xs font-semibold uppercase tracking-widest text-gray-700 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                        type="button"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" /> Prev
                      </button>

                      <div className="flex items-center gap-1">
                        {pagination.map((p, i) =>
                          p === "..." ? (
                            <span
                              key={`dots-${i}`}
                              className="w-10 h-10 inline-flex items-center justify-center text-gray-400 text-sm"
                            >
                              …
                            </span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => handlePageChange(p)}
                              className={`w-10 h-10 border text-xs font-semibold uppercase tracking-widest transition ${
                                p === currentPage
                                  ? "bg-gray-900 text-white border-gray-900"
                                  : "border-gray-200 text-gray-700 hover:border-gray-400"
                              }`}
                              type="button"
                              aria-current={p === currentPage ? "page" : undefined}
                            >
                              {p}
                            </button>
                          )
                        )}
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="h-10 px-3 border border-gray-200 text-xs font-semibold uppercase tracking-widest text-gray-700 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                        type="button"
                        aria-label="Next page"
                      >
                        Next <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Cards -------------------- */
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
  const currentPrice = product.pricing.current.value;
  const originalPrice = product.pricing.original?.value ?? currentPrice;
  const isOnSale = originalPrice > currentPrice || (product.pricing.discountPercentage ?? 0) > 0;

  const productSlug = `/products/${resolveProductSlug(product)}`;
  const outOfStock = product.inventory.quantity <= 0;

  // ✅ Out of stock disabled (both hover CTA and click)
  const shopDisabled = outOfStock || isInCart;

  const discountPercent =
    typeof product.pricing.discountPercentage === "number"
      ? product.pricing.discountPercentage
      : originalPrice > currentPrice
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="group relative bg-white border border-gray-200 shadow-[0_1px_0_rgba(0,0,0,0.03)] hover:shadow-[0_10px_22px_rgba(0,0,0,0.10)] transition-shadow"
    >
      <Link href={productSlug} className="block">
        <div className="relative h-56 bg-white overflow-hidden">
          <Image
            src={product.media.thumbnail || "/placeholder-image.jpg"}
            alt={product.name}
            fill
            className="object-contain p-6 transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* top-right icons (hover) */}
          <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleWishlist();
              }}
              type="button"
              className="w-9 h-9 flex items-center justify-center text-[#6B0F1A] hover:text-red-500"
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              type="button"
              className="w-9 h-9 flex items-center justify-center text-[#6B0F1A] hover:text-gray-700"
              aria-label="Compare"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
          </div>

          {/* sale badge */}
          {isOnSale && discountPercent > 0 && (
            <div className="absolute left-3 top-28 -rotate-18 origin-left">
              <div className="bg-red-600 text-white text-[11px] font-bold uppercase tracking-widest px-3 py-1 shadow">
                Sale
              </div>
            </div>
          )}

          {/* Out of stock chip (visible) */}
          {outOfStock && (
            <div className="absolute left-3 top-3">
              <div className="bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                Out of stock
              </div>
            </div>
          )}
        </div>

        <div className="px-4 pb-5 pt-3 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
            {product.brand}
          </div>

          <div className="mt-2 text-xs text-gray-700 leading-snug line-clamp-2 min-h-8">
            {product.name}
          </div>

          <div className="mt-3 flex items-baseline justify-center gap-2">
            {isOnSale && (
              <span className="text-xs text-gray-400 line-through">{formatTk(originalPrice)}</span>
            )}
            <span className="text-sm font-bold text-[#F84E25]">{formatTk(currentPrice)}</span>
          </div>
        </div>
      </Link>

      {/* hover CTA */}
      <div className="px-4 pb-4">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (shopDisabled) return;
            onAddToCart();
          }}
          disabled={shopDisabled}
          type="button"
          className={[
            "w-full h-11 bg-[#6B0F1A] text-white uppercase tracking-widest text-xs font-bold transition",
            shopDisabled
              ? "bg-[#6B0F1A] text-white cursor-not-allowed"
              : "bg-[#6B0F1A] text-white hover:bg-[#5E0D17]",
            "opacity-100 lg:opacity-0 lg:group-hover:opacity-100",
          ].join(" ")}
        >
          {outOfStock ? "OUT OF STOCK" : isInCart ? "IN CART" : "SHOP NOW"}
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
  const currentPrice = product.pricing.current.value;
  const originalPrice = product.pricing.original?.value ?? currentPrice;
  const isOnSale = originalPrice > currentPrice || (product.pricing.discountPercentage ?? 0) > 0;

  const productSlug = `/products/${resolveProductSlug(product)}`;
  const outOfStock = product.inventory.quantity <= 0;
  const disabled = outOfStock || isInCart;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 shadow-[0_1px_0_rgba(0,0,0,0.03)]"
    >
      <div className="flex flex-col md:flex-row">
        <Link href={productSlug} className="md:w-64 shrink-0">
          <div className="relative h-56 md:h-full bg-white overflow-hidden">
            <Image
              src={product.media.thumbnail || "/placeholder-image.jpg"}
              alt={product.name}
              fill
              className="object-contain p-6"
              sizes="(max-width: 768px) 100vw, 256px"
            />
          </div>
        </Link>

        <div className="flex-1 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                {product.brand} • {product.gender}
              </div>
              <Link href={productSlug} className="block mt-2">
                <div className="text-sm font-semibold text-gray-900">{product.name}</div>
              </Link>

              <div className="mt-3 flex items-baseline gap-2">
                {isOnSale && (
                  <span className="text-xs text-gray-400 line-through">
                    {formatTk(originalPrice)}
                  </span>
                )}
                <span className="text-sm font-bold text-[#F84E25]">
                  {formatTk(currentPrice)}
                </span>
                {outOfStock && (
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Out of stock
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onToggleWishlist}
              className="text-[#6B0F1A] hover:text-red-500"
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              type="button"
            >
              <Heart className={`w-5 h-5  ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => {
                if (disabled) return;
                onAddToCart();
              }}
              disabled={disabled}
              type="button"
              className={`h-10  px-5 uppercase tracking-widest text-xs font-bold ${
                disabled
                  ? "bg-[#6B0F1A] text-white cursor-not-allowed"
                  : "bg-[#6B0F1A] text-white hover:bg-[#5E0D17]"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                {outOfStock ? "OUT OF STOCK" : isInCart ? "IN CART" : "SHOP NOW"}
              </span>
            </button>

            <Link
              href={productSlug}
              className="h-10 text-white bg-[#6B0F1A] px-5 border border-gray-200 uppercase tracking-widest text-xs font-bold  hover:border-gray-400 inline-flex items-center"
            >
              View details
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
