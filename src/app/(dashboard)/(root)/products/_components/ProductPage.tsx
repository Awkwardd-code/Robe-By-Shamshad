/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Grid, List, ChevronRight, Heart, ShoppingBag } from "lucide-react";
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
  category: string; // should be slug in your API output (recommended)
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

const SKELETON_COUNT = 6;
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

const tkFormatter = new Intl.NumberFormat("bn-BD", {
  maximumFractionDigits: 0,
});

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

/* -------------------- Skeletons -------------------- */
function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
        <div
          key={`grid-skel-${index}`}
          className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="h-60 rounded-xl bg-gray-200" />
          <div className="mt-4 space-y-3">
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-4 w-1/2 rounded bg-gray-200" />
            <div className="flex gap-2">
              <span className="h-8 w-1/2 rounded bg-gray-200" />
              <span className="h-8 w-1/3 rounded bg-gray-200" />
            </div>
            <div className="h-10 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
        <div
          key={`list-skel-${index}`}
          className="animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="flex flex-col gap-4 p-6 md:flex-row">
            <div className="md:w-64 h-60 rounded-xl bg-gray-200" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-40 rounded bg-gray-200" />
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="flex flex-wrap gap-2">
                <span className="h-8 w-28 rounded bg-gray-200" />
                <span className="h-8 w-24 rounded bg-gray-200" />
              </div>
              <div className="h-4 w-1/3 rounded bg-gray-200" />
              <div className="h-12 w-2/3 rounded bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterSidebarSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6 animate-pulse">
      <div className="h-5 w-1/2 rounded bg-gray-200" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`search-skel-${index}`} className="h-4 rounded bg-gray-200" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`section-skel-${index}`} className="space-y-2">
            <div className="h-3 w-1/3 rounded bg-gray-200" />
            <div className="flex flex-wrap gap-2">
              <span className="h-8 w-10 rounded bg-gray-200" />
              <span className="h-8 w-10 rounded bg-gray-200" />
              <span className="h-8 w-10 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={`range-skel-${index}`} className="h-4 rounded bg-gray-200" />
        ))}
      </div>
      <div className="h-10 w-full rounded bg-gray-200" />
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => searchParams.getAll("category"));
  const {
    wishlistItems,
    addToWishlist,
    removeFromWishlist,
    addToCart,
    isInCart,
  } = useCommerce();
  const wishlistIds = useMemo(() => new Set(wishlistItems.map((item) => item.id)), [wishlistItems]);

  // API states
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Track desktop safely (fixes window.innerWidth usage in render)
  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= 1024);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Extract unique brands from products
  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.brand))).sort();
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

  useEffect(() => {
    const categoriesFromUrl = searchParams.getAll("category");
    setSelectedCategories((prev) => {
      if (
        prev.length === categoriesFromUrl.length &&
        prev.every((value, index) => value === categoriesFromUrl[index])
      ) {
        return prev;
      }
      return categoriesFromUrl;
    });
  }, [searchParams]);

  const categoryNameBySlug = useMemo(() => {
    const map = new Map<string, string>();
    availableCategories.forEach((cat) => map.set(cat.slug, cat.name));
    return map;
  }, [availableCategories]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch products (SERVER-SIDE filters: search, gender, sort, brand, category, pagination)
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

      // multi brand
      brands.forEach((brand) => params.append("brand", brand));

      // ✅ multi category (slug)
      selectedCategories.forEach((slug) => params.append("category", slug));

      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error(`Failed to fetch products: ${response.status}`);

      const data: ApiResponse = await response.json();

      // Mark new/bestseller (client enhancement)
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
    }
  }, [currentPage, debouncedSearch, gender, sort, brands, selectedCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Client-side filtering (price/size/color + category safety)
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

    // keep as safety fallback (if API didn’t filter perfectly)
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

  const isProductInCart = (product: Product) =>
    isInCart(resolveApiProductId(product));

  const handleAddToCart = (product: Product) => {
    if (product.inventory.quantity <= 0) return;
    if (isProductInCart(product)) return;
    addToCart(toCommerceProduct(product));
  };

  const isProductWishlisted = (product: Product) =>
    wishlistIds.has(resolveApiProductId(product));

  const activeFiltersCount = [
    gender !== "all",
    brands.length,
    priceIds.length,
    sizes.length,
    colors.length,
    selectedCategories.length,
  ].filter(Boolean).length;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const renderPagination = () => {
    const pages: Array<number | "..."> = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push("...");

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx>{`
        button {
          cursor: pointer;
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-gray-600 mb-8">
          <Link href="/" className="hover:text-gray-900 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <Link href="/products" className="hover:text-gray-900 transition-colors">
            Products
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-gray-900 font-medium">All Products</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Mobile Filter Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span className="font-medium">Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-6 h-6 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${showFilters ? "rotate-90" : ""}`} />
            </button>
          </div>

          {/* Sidebar Filters */}
          <AnimatePresence>
            {(showFilters || isDesktop) && (
              <motion.aside
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="lg:w-64 shrink-0"
              >
                {isLoading ? (
                  <FilterSidebarSkeleton />
                ) : (
                  <div className="bg-white rounded-xl shadow-sm p-6 sticky top-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                      <button
                        onClick={clearAll}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        Clear all
                      </button>
                    </div>

                    {/* Search */}
                    <div className="mb-6">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search products..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Gender */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Gender</h3>
                      <div className="space-y-2">
                        {["all", "men", "women", "unisex"].map((g) => (
                          <label key={g} className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="radio"
                              name="gender"
                              checked={gender === g}
                              onChange={() => {
                                setGender(g as Gender | "all");
                                setCurrentPage(1);
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700 capitalize group-hover:text-gray-900">
                              {g === "all" ? "All Genders" : g}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Brand */}
                    {uniqueBrands.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Brand</h3>
                        <div className="space-y-2">
                          {uniqueBrands.map((brand) => (
                            <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={brands.includes(brand)}
                                onChange={(e) => {
                                  setBrands((prev) => (e.target.checked ? [...prev, brand] : prev.filter((b) => b !== brand)));
                                  setCurrentPage(1);
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600"
                              />
                              <span className="text-sm text-gray-700 group-hover:text-gray-900">{brand}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ✅ Category */}
                    {availableCategories.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Category</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {availableCategories.map((category) => (
                            <label
                              key={category.slug}
                              className="flex items-center justify-between gap-3 cursor-pointer group"
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedCategories.includes(category.slug)}
                                  onChange={(e) => {
                                    setSelectedCategories((prev) =>
                                      e.target.checked
                                        ? [...prev, category.slug]
                                        : prev.filter((slug) => slug !== category.slug)
                                    );
                                    setCurrentPage(1);
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                                />
                                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                  {category.name}
                                </span>
                              </div>

                              {typeof category.productCount === "number" && (
                                <span className="text-xs text-gray-400">{category.productCount} items</span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Price */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Price Range</h3>
                      <div className="space-y-2">
                        {PRICE_RANGES.map((range) => (
                          <label key={range.id} className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={priceIds.includes(range.id)}
                              onChange={(e) => {
                                setPriceIds((prev) =>
                                  e.target.checked ? [...prev, range.id] : prev.filter((id) => id !== range.id)
                                );
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600"
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">{range.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Size */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Size</h3>
                      <div className="flex flex-wrap gap-2">
                        {SIZE_OPTIONS.map((size) => (
                          <button
                            key={size}
                            onClick={() =>
                              setSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]))
                            }
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
                              sizes.includes(size)
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Color</h3>
                      <div className="grid grid-cols-5 gap-3">
                        {COLOR_OPTIONS.map((color) => (
                          <button
                            key={color.value}
                            onClick={() =>
                              setColors((prev) =>
                                prev.includes(color.value) ? prev.filter((c) => c !== color.value) : [...prev, color.value]
                              )
                            }
                            className="group relative"
                            title={color.name}
                            type="button"
                          >
                            <div
                              className={`w-8 h-8 rounded-full border-2 transition-transform ${
                                colors.includes(color.value) ? "scale-110 border-gray-900" : "border-gray-300 group-hover:border-gray-400"
                              }`}
                              style={{ backgroundColor: color.value }}
                            />
                            {colors.includes(color.value) && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-3 h-3 bg-white rounded-full" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Active Filters */}
                    {activeFiltersCount > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="text-sm text-gray-600 mb-2">Active filters ({activeFiltersCount})</div>
                        <div className="flex flex-wrap gap-2">
                          {gender !== "all" && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">{gender}</span>
                          )}
                          {brands.map((brand) => (
                            <span key={brand} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {brand}
                            </span>
                          ))}
                          {selectedCategories.map((slug) => (
                            <span key={slug} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {categoryNameBySlug.get(slug) || slug}
                            </span>
                          ))}
                          {sizes.map((size) => (
                            <span key={size} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              Size: {size}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">All Products</h1>
                  <p className="text-gray-600">
                    {isLoading ? "Loading..." : `${totalCount} items found`}
                    {activeFiltersCount > 0 && ` • ${activeFiltersCount} filter${activeFiltersCount > 1 ? "s" : ""} active`}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {/* View Mode Toggle */}
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-l-lg transition-colors ${
                        viewMode === "grid" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                      type="button"
                    >
                      <Grid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-r-lg transition-colors ${
                        viewMode === "list" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                      type="button"
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Sort */}
                  <select
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="featured">Featured</option>
                    <option value="newest">Newest</option>
                    <option value="popular">Most Popular</option>
                    <option value="low">Price: Low to High</option>
                    <option value="high">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Loading / Error / Empty / Results */}
            {isLoading ? (
              viewMode === "grid" ? (
                <ProductGridSkeleton />
              ) : (
                <ProductListSkeleton />
              )
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-600 font-medium mb-2">Error loading products</p>
                <p className="text-red-500 text-sm">{error}</p>
                <button
                  onClick={() => fetchProducts()}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  type="button"
                >
                  Try Again
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="text-gray-400 mb-4">No products found</div>
                <p className="text-gray-600 mb-6">Try adjusting your filters or search terms</p>
                <button
                  onClick={clearAll}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  type="button"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <div className="space-y-4">
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-600">
                      Showing {(currentPage - 1) * 12 + 1}-{Math.min(currentPage * 12, totalCount)} of {totalCount} products
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        type="button"
                      >
                        ← Previous
                      </button>

                      {renderPagination().map((page, i) => (
                        <button
                          key={i}
                          onClick={() => typeof page === "number" && handlePageChange(page)}
                          disabled={page === "..."}
                          className={`w-10 h-10 flex items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                            page === currentPage
                              ? "bg-blue-600 text-white border-blue-600"
                              : "border-gray-300 text-gray-700 hover:border-gray-400"
                          } ${page === "..." ? "pointer-events-none" : ""}`}
                          type="button"
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        type="button"
                      >
                        Next →
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
  const isOnSale = Boolean(product.pricing.discountPercentage && product.pricing.discountPercentage > 0);
  const currentPrice = product.pricing.current.value;
  const originalPrice = product.pricing.original?.value || currentPrice;

  const productSlug = `/products/${resolveProductSlug(product)}`;
  const cardIsOutOfStock = product.inventory.quantity <= 0;
  const cardIsAddDisabled = cardIsOutOfStock || isInCart;
  const addButtonClass = `mt-4 w-full py-2.5 flex items-center justify-center gap-2 text-sm font-medium rounded-lg transition-all duration-300 ${
    cardIsAddDisabled
      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
      : "bg-linear-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg"
  }`;
  const addButtonLabel = cardIsOutOfStock
    ? "Out of Stock"
    : isInCart
    ? "In Cart"
    : "Add to Cart";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden"
    >
      <Link href={productSlug}>
        <div className="relative h-64 overflow-hidden bg-linear-to-br from-gray-50 to-gray-100">
          <Image
            src={product.media.thumbnail || "/placeholder-image.jpg"}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.isNew && (
              <span className="px-3 py-1 bg-linear-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold rounded-full shadow-sm">
                NEW
              </span>
            )}
            {product.isBestseller && (
              <span className="px-3 py-1 bg-linear-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-sm">
                BESTSELLER
              </span>
            )}
          </div>

          {isOnSale && (
            <span className="absolute top-3 right-3 px-3 py-1 bg-linear-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-sm">
              -{product.pricing.discountPercentage}%
            </span>
          )}

          {product.inventory.quantity <= 0 && (
            <span className="absolute top-3 right-3 px-3 py-1 bg-gray-800 text-white text-xs font-bold rounded-full shadow-sm">
              OUT OF STOCK
            </span>
          )}

            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
              <button
                className="w-full py-2.5 bg-linear-to-r from-blue-600 to-purple-600 text-white font-medium text-sm rounded-lg hover:shadow-lg transition-all"
                type="button"
              >
                Quick View
              </button>
            </div>
        </div>
      </Link>

      <button
        onClick={onToggleWishlist}
        className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:text-red-500 hover:bg-white transition-all shadow-sm z-10"
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        type="button"
      >
        <Heart className={`w-4 h-4 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
      </button>

      <div className="p-5">
        <div className="mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {product.brand} • {product.gender}
          </span>
        </div>

        <Link href={productSlug}>
          <h3 className="text-base font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors line-clamp-1">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(product.ratings?.averageRating || 0) ? "text-yellow-400" : "text-gray-300"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-sm font-medium text-gray-700">
            {product.ratings?.averageRating?.toFixed(1) || "0.0"}
          </span>
          <span className="text-sm text-gray-500">({product.ratings?.totalReviews || 0})</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-gray-900">{formatTk(currentPrice)}</span>
            {isOnSale && <span className="text-sm text-gray-400 line-through">{formatTk(originalPrice)}</span>}
          </div>

          <div className="flex gap-1">
            {(product.details?.colors || []).slice(0, 3).map((color, i) => (
              <div key={i} className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: color }} />
            ))}
            {product.details?.colors && product.details.colors.length > 3 && (
              <div className="w-4 h-4 rounded-full bg-gray-100 border border-gray-300 text-xs flex items-center justify-center">
                +{product.details.colors.length - 3}
              </div>
            )}
          </div>
        </div>

                <button
                  className={addButtonClass}
                  disabled={cardIsAddDisabled}
                  type="button"
                  onClick={onAddToCart}
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
  const isOnSale = Boolean(product.pricing.discountPercentage && product.pricing.discountPercentage > 0);
  const currentPrice = product.pricing.current.value;
  const originalPrice = product.pricing.original?.value || currentPrice;

  const listIsOutOfStock = product.inventory.quantity <= 0;
  const listIsAddDisabled = listIsOutOfStock || isInCart;
  const listButtonClass = `px-6 py-2.5 flex items-center gap-2 font-medium rounded-lg transition-all duration-300 ${
    listIsAddDisabled
      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
      : "bg-linear-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg"
  }`;
  const listButtonLabel = listIsOutOfStock
    ? "Out of Stock"
    : isInCart
    ? "In Cart"
    : "Add to Cart";

  const productSlug = `/products/${resolveProductSlug(product)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 overflow-hidden"
    >
      <div className="flex flex-col md:flex-row">
        <Link href={productSlug} className="md:w-64 shrink-0">
          <div className="relative h-64 md:h-full overflow-hidden bg-linear-to-br from-gray-50 to-gray-100">
            <Image
              src={product.media.thumbnail || "/placeholder-image.jpg"}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 256px"
            />
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {product.isNew && (
                <span className="px-3 py-1 bg-linear-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold rounded-full shadow-sm">
                  NEW
                </span>
              )}
              {product.isBestseller && (
                <span className="px-3 py-1 bg-linear-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-sm">
                  BESTSELLER
                </span>
              )}
            </div>
          </div>
        </Link>

        <div className="flex-1 p-6">
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {product.brand} • {product.gender}
                  </span>
                  <Link href={productSlug}>
                    <h3 className="text-xl font-semibold text-gray-900 mt-1 hover:text-blue-600 transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                </div>

                <button
                  onClick={onToggleWishlist}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                  type="button"
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(product.ratings?.averageRating || 0) ? "text-yellow-400" : "text-gray-300"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {product.ratings?.averageRating?.toFixed(1) || "0.0"} ({product.ratings?.totalReviews || 0} reviews)
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mb-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Available Sizes</div>
                  <div className="flex gap-2 flex-wrap">
                    {(product.details?.sizes || []).map((size) => (
                      <span key={size} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                        {size}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-1">Available Colors</div>
                  <div className="flex gap-2 flex-wrap">
                    {(product.details?.colors || []).slice(0, 4).map((color, i) => (
                      <div key={i} className="w-6 h-6 rounded-full border border-gray-300" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-gray-900">{formatTk(currentPrice)}</span>

                  {isOnSale && (
                    <>
                      <span className="text-lg text-gray-400 line-through">{formatTk(originalPrice)}</span>
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-sm font-bold rounded">
                        SAVE {product.pricing.discountPercentage}%
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  className={listButtonClass}
                  disabled={listIsAddDisabled}
                  type="button"
                  onClick={onAddToCart}
                >
                  <ShoppingBag className="w-4 h-4" />
                  {listButtonLabel}
                </button>

                <Link
                  href={productSlug}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
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
