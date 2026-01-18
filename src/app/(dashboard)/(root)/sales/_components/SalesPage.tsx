"use client";

import { useMemo, useState, useEffect, useCallback, MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter,
  Grid,
  List,
  ChevronRight,
  Heart,
  ShoppingBag,
  Check,
  Tag,
  Package,
  Clock,
  Users,
  Zap,
  X,
  ChevronLeft,
  Search,
  RefreshCcw,
} from "lucide-react";
import { useCommerce } from "@/context/CommerceContext";
import type { Product as CommerceProduct } from "@/context/CommerceContext";
import { useRouter } from "next/navigation";

type ComboOffer = {
  _id: string;
  name: string;
  description: string;
  slug: string;
  products: Array<{
    productId: string;
    quantity: number;
    product?: {
      _id: string;
      name: string;
      brand: string;
      category: string;
      pricing: {
        current: { value: number; currency: string };
        original?: { value: number; currency: string };
      };
      media: { thumbnail: string; gallery: string[] };
    };
  }>;
  pricing: {
    originalTotal: number;
    discountedPrice: number;
    discountPercentage: number;
    currency: string;
  };
  inventory: {
    totalStock: number;
    soldCount: number;
    status: string;
    remaining?: number;
  };
  validity: { startDate: string; endDate: string };
  tags: string[];
  features: string[];
  thumbnail: string;
  gallery: string[];
  delivery: { isFree: boolean; charge: number; message: string };
  createdAt: string;
  updatedAt: string;

  // enriched
  savings?: number;
  isActive?: boolean;
  remainingStock?: number;
};

type SortOption =
  | "featured"
  | "discount_high"
  | "discount_low"
  | "newest"
  | "popular"
  | "price_high"
  | "price_low";

type ApiResponse = {
  offers: ComboOffer[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
  pageLimit: number;
};

type CategoryOption = {
  slug: string;
  name: string;
};

const robe = {
  cream: "#FBF3E8",
  maroon: "#944C35",
  sand: "#E2B188",
  blush: "#F1D6C1",
  text: "#3b2a22",
  maroonHover: "#7f3f2d",
  success: "#15803d",
  warning: "#ea580c",
};

const PRICE_RANGES = [
  { id: "u2000", label: "Under Tk. 2000", min: 0, max: 2000 },
  { id: "2000-5000", label: "Tk. 2000 - 5000", min: 2000, max: 5000 },
  { id: "5000-10000", label: "Tk. 5000 - 10000", min: 5000, max: 10000 },
  { id: "10000-20000", label: "Tk. 10000 - 20000", min: 10000, max: 20000 },
  { id: "20000+", label: "Tk. 20000+", min: 20000, max: Infinity },
];

const DISCOUNT_RANGES = [
  { id: "10-20", label: "10-20% OFF", min: 10, max: 20 },
  { id: "20-30", label: "20-30% OFF", min: 20, max: 30 },
  { id: "30-40", label: "30-40% OFF", min: 30, max: 40 },
  { id: "40+", label: "40%+ OFF", min: 40, max: 100 },
];

const COMBO_TYPES = [
  "Family Pack",
  "Seasonal Bundle",
  "Festive Special",
  "Weekend Deal",
  "Limited Edition",
  "Best Value",
  "Premium Collection",
];

const formatCategoryLabel = (slug: string) =>
  slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

function formatTk(n: number) {
  return `Tk. ${n.toLocaleString("en-US")}`;
}

const mapComboToCommerceProduct = (offer: ComboOffer): CommerceProduct => {
  const slug = offer.slug || offer._id;
  return {
    ...offer,
    id: `combo-${offer._id}`,
    name: offer.name,
    slug: `/product-data/${encodeURIComponent(slug)}`,
    image: offer.thumbnail || "/placeholder-image.jpg",
    price: offer.pricing.discountedPrice,
    oldPrice: offer.pricing.originalTotal,
    category: "combo",
    description: offer.description,
    shortDescription: offer.tags?.[0],
    isCombo: true,
    delivery: offer.delivery,
    deliveryCharge: offer.delivery?.charge,
  };
};

const getComboDetailHref = (offer: ComboOffer) => {
  const identifier = offer.slug || offer._id || "unknown";
  return `/product-data/${encodeURIComponent(identifier)}`;
};

function getDaysRemaining(endDate: string) {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getComboBadge(tags: string[]) {
  if (tags.includes("limited") || tags.includes("Limited Edition")) return "Limited";
  if (tags.includes("festive") || tags.includes("Festive Special")) return "Festive";
  if (tags.includes("seasonal") || tags.includes("Seasonal Bundle")) return "Seasonal";
  if (tags.includes("family") || tags.includes("Family Pack")) return "Family";
  return "Special";
}

/* -------------------- Design helpers (matches product listing style) -------------------- */
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
      className={`h-9 px-3 border text-xs font-bold uppercase tracking-widest transition ${
        active
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

function ComboCardSkeleton() {
  return (
    <div className="animate-pulse bg-white border border-gray-200 shadow-[0_1px_0_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="relative h-56 bg-gray-100 flex items-center justify-center">
        <div className="h-32 w-32 bg-gray-200/70 rounded" />
      </div>
      <div className="px-4 py-5 text-center space-y-3">
        <div className="h-3 w-20 bg-gray-200 rounded mx-auto" />
        <div className="h-4 w-4/5 bg-gray-200 rounded mx-auto" />
        <div className="h-4 w-3/5 bg-gray-200 rounded mx-auto" />
        <div className="h-10 w-full bg-gray-200 rounded" />
      </div>
    </div>
  );
}

function ComboListItemSkeleton() {
  return (
    <div className="animate-pulse bg-white border border-gray-200 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
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
export default function ComboOffersListingPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [priceIds, setPriceIds] = useState<string[]>([]);
  const [discountIds, setDiscountIds] = useState<string[]>([]);
  const [comboTypes, setComboTypes] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const { wishlistItems, addToWishlist, removeFromWishlist, addToCart, isInCart } = useCommerce();
  const wishlistIds = useMemo(() => new Set(wishlistItems.map((item) => item.id)), [wishlistItems]);
  const [isMobile, setIsMobile] = useState(false);

  // API states
  const [offers, setOffers] = useState<ComboOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Detect mobile (no window usage in render)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Body scroll lock when mobile filters open
  useEffect(() => {
    if (!isMobile) return;
    if (showFilters) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showFilters, isMobile]);

  // Debounce search (enabled)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch combo offers (keep as-is)
  const fetchOffers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12",
        ...(debouncedSearch && { search: debouncedSearch }),
      });

      const response = await fetch(`/api/combo-offers?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch combo offers: ${response.status}`);

      const data: ApiResponse = await response.json();

      const now = new Date();
      const enrichedOffers = data.offers.map((offer) => ({
        ...offer,
        isActive:
          new Date(offer.validity.endDate) > now &&
          new Date(offer.validity.startDate) <= now &&
          offer.inventory.status === "active",
        remainingStock: offer.inventory.totalStock - offer.inventory.soldCount,
        savings: offer.pricing.originalTotal - offer.pricing.discountedPrice,
      }));

      setOffers(enrichedOffers);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load combo offers");
      console.error("Error fetching combo offers:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const response = await fetch("/api/categories?limit=100", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Failed to fetch categories (${response.status})`);
        const payload = await response.json();
        const items = Array.isArray(payload?.categories) ? payload.categories : [];
        const mapped = items
          .map((item: { slug?: string; name?: string }) => {
            const slug = typeof item?.slug === "string" ? item.slug.trim() : "";
            const name = typeof item?.name === "string" ? item.name.trim() : "";
            if (!slug && !name) return null;
            return {
              slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
              name: name || formatCategoryLabel(slug),
            };
          })
          .filter(Boolean) as CategoryOption[];

        const unique = Array.from(new Map(mapped.map((entry) => [entry.slug, entry])).values()).sort(
          (a, b) => a.name.localeCompare(b.name)
        );

        if (!cancelled) setCategoryOptions(unique);
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching categories:", err);
          setCategoryOptions([]);
        }
      } finally {
        if (!cancelled) setIsLoadingCategories(false);
      }
    };

    void loadCategories();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  // Extract unique tags from offers
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    offers.forEach((offer) => {
      offer.tags?.forEach((tag) => tagSet.add(tag));
      offer.features?.forEach((feature) => {
        if (feature.toLowerCase().includes("combo") || feature.length < 20) tagSet.add(feature);
      });
    });
    return Array.from(tagSet).sort();
  }, [offers]);

  const availableCategories = useMemo(() => {
    if (categoryOptions.length > 0) return categoryOptions;

    const slugSet = new Set<string>();
    offers.forEach((offer) => {
      offer.products?.forEach((product) => {
        if (product.product?.category) slugSet.add(product.product.category);
      });
    });

    return Array.from(slugSet)
      .map((slug) => ({ slug, name: formatCategoryLabel(slug) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categoryOptions, offers]);

  const categoryNameBySlug = useMemo(
    () => new Map(availableCategories.map((category) => [category.slug, category.name])),
    [availableCategories]
  );

  // Client-side filtering + sorting (keep as-is)
  const filtered = useMemo(() => {
    let list = [...offers];

    if (categories.length > 0) {
      list = list.filter((offer) =>
        offer.products?.some((p) => p.product?.category && categories.includes(p.product.category))
      );
    }

    if (priceIds.length > 0) {
      const activeRanges = PRICE_RANGES.filter((r) => priceIds.includes(r.id));
      list = list.filter((offer) => {
        const price = offer.pricing.discountedPrice;
        return activeRanges.some((r) => price >= r.min && price <= r.max);
      });
    }

    if (discountIds.length > 0) {
      const activeRanges = DISCOUNT_RANGES.filter((r) => discountIds.includes(r.id));
      list = list.filter((offer) => {
        const discount = offer.pricing.discountPercentage;
        return activeRanges.some((r) => discount >= r.min && discount <= r.max);
      });
    }

    if (comboTypes.length > 0) {
      list = list.filter((offer) =>
        comboTypes.some(
          (type) => offer.tags?.includes(type) || offer.name.toLowerCase().includes(type.toLowerCase())
        )
      );
    }

    if (tags.length > 0) {
      list = list.filter((offer) => tags.some((tag) => offer.tags?.includes(tag)));
    }

    switch (sort) {
      case "discount_high":
        list.sort((a, b) => b.pricing.discountPercentage - a.pricing.discountPercentage);
        break;
      case "discount_low":
        list.sort((a, b) => a.pricing.discountPercentage - b.pricing.discountPercentage);
        break;
      case "price_low":
        list.sort((a, b) => a.pricing.discountedPrice - b.pricing.discountedPrice);
        break;
      case "price_high":
        list.sort((a, b) => b.pricing.discountedPrice - a.pricing.discountedPrice);
        break;
      case "newest":
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "popular":
        list.sort((a, b) => b.inventory.soldCount - a.inventory.soldCount);
        break;
      default:
        list.sort((a, b) => {
          const aScore = (a.isActive ? 2 : 0) + a.pricing.discountPercentage;
          const bScore = (b.isActive ? 2 : 0) + b.pricing.discountPercentage;
          return bScore - aScore;
        });
    }

    return list;
  }, [offers, categories, priceIds, discountIds, comboTypes, tags, sort]);

  const clearAll = () => {
    setCategories([]);
    setPriceIds([]);
    setDiscountIds([]);
    setComboTypes([]);
    setTags([]);
    setSort("featured");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleToggleWishlist = (offer: ComboOffer) => {
    const commerceProduct = mapComboToCommerceProduct(offer);
    if (wishlistIds.has(commerceProduct.id)) {
      removeFromWishlist(commerceProduct.id);
      return;
    }
    addToWishlist(commerceProduct);
  };

  const isComboInCart = (offer: ComboOffer) => isInCart(mapComboToCommerceProduct(offer).id);

  const handleAddToCart = (offer: ComboOffer) => {
    if (!offer.isActive || (offer.remainingStock ?? 0) <= 0) return;
    const commerceProduct = mapComboToCommerceProduct(offer);
    if (isInCart(commerceProduct.id)) return;
    addToCart(commerceProduct);
  };

  const isOfferWishlisted = (offer: ComboOffer) =>
    wishlistIds.has(mapComboToCommerceProduct(offer).id);

  const activeFiltersCount = [
    categories.length,
    priceIds.length,
    discountIds.length,
    comboTypes.length,
    tags.length,
    Boolean(debouncedSearch),
  ]
    .filter(Boolean)
    .length;

  const showInitialSkeletons = isLoading && offers.length === 0;
  const isRefreshing = isLoading && offers.length > 0;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // refined pagination (same logic as improved listing)
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

  // --- UPDATED UI: checkbox -> button toggles (keeps filter state logic) ---
  const toggleArrayValue = <T,>(list: T[], val: T) =>
    list.includes(val) ? list.filter((x) => x !== val) : [...list, val];

  // Sidebar (design aligned with product listing)
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

      {/* Search (enabled + refined) */}
      <div className="mb-5">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search combo offers"
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

      {/* Category (buttons) */}
      <div className="border-t border-gray-100 pt-5 mb-5">
        <div className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-3">
          Categories
        </div>
        <div className="flex flex-wrap gap-2">
          {availableCategories.length > 0 ? (
            availableCategories.map((category) => (
              <TogglePill
                key={category.slug}
                active={categories.includes(category.slug)}
                onClick={() => setCategories((prev) => toggleArrayValue(prev, category.slug))}
                title={category.name}
              >
                {category.name}
              </TogglePill>
            ))
          ) : isLoadingCategories ? (
            Array.from({ length: 6 }).map((_, index) => (
              <span
                key={`category-skeleton-${index}`}
                className="h-9 w-20 border border-gray-200 bg-gray-100 animate-pulse"
              />
            ))
          ) : (
            <span className="text-[11px] text-gray-500">No categories available</span>
          )}
        </div>
      </div>

      {/* Combo Types (buttons) */}
      <div className="border-t border-gray-100 pt-5 mb-5">
        <div className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-3">
          Combo type
        </div>
        <div className="flex flex-wrap gap-2">
          {COMBO_TYPES.map((type) => (
            <TogglePill
              key={type}
              active={comboTypes.includes(type)}
              onClick={() => setComboTypes((prev) => toggleArrayValue(prev, type))}
              title={type}
            >
              {type}
            </TogglePill>
          ))}
        </div>
      </div>

      {/* Price (buttons) */}
      <div className="border-t border-gray-100 pt-5 mb-5">
        <div className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-3">Price</div>
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

      {/* Discount (buttons) */}
      <div className="border-t border-gray-100 pt-5 mb-5">
        <div className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-3">
          Discount
        </div>
        <div className="flex flex-col gap-2">
          {DISCOUNT_RANGES.map((range) => (
            <button
              key={range.id}
              type="button"
              onClick={() => setDiscountIds((prev) => toggleArrayValue(prev, range.id))}
              className={[
                "h-9 px-3 border text-xs font-semibold tracking-wide text-left transition",
                discountIds.includes(range.id)
                  ? "border-gray-900 text-gray-900 bg-gray-50"
                  : "border-gray-200 text-gray-600 hover:border-gray-400",
              ].join(" ")}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tags (chips -> pills) */}
      {allTags.length > 0 && (
        <div className="border-t border-gray-100 pt-5">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-3">Tags</div>
          <div className="flex flex-wrap gap-2">
            {allTags.slice(0, 14).map((t) => (
              <TogglePill
                key={t}
                active={tags.includes(t)}
                onClick={() => setTags((prev) => toggleArrayValue(prev, t))}
                title={t}
              >
                {t}
              </TogglePill>
            ))}
          </div>
        </div>
      )}
    </div>
  );

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
          <Link href="/offers" className="hover:text-gray-900 transition-colors">
            Offers
          </Link>
          <ChevronRight className="w-4 h-4 mx-2 text-gray-300" />
          <span className="text-gray-900 font-semibold uppercase tracking-wide">Combo Offers</span>
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
                <span className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                  Filters
                </span>
                {activeFiltersCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-gray-900 text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          {/* Backdrop for mobile */}
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
                initial={isMobile ? { y: 12, opacity: 0 } : { x: -10, opacity: 0 }}
                animate={{ x: 0, y: 0, opacity: 1 }}
                exit={isMobile ? { y: 12, opacity: 0 } : { x: -10, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={
                  isMobile
                    ? "fixed left-1/2 top-20 bottom-6 z-50 w-[92%] max-w-md -translate-x-1/2 shadow-2xl"
                    : "lg:w-70 shrink-0"
                }
              >
                {showInitialSkeletons ? (
                  isMobile ? (
                    <div className="h-full overflow-y-auto scrollbar-hide rounded-xl">
                      <FilterSidebarSkeleton />
                    </div>
                  ) : (
                    <FilterSidebarSkeleton />
                  )
                ) : isMobile ? (
                  <div className="h-full overflow-y-auto scrollbar-hide rounded-xl">{FilterSidebar}</div>
                ) : (
                  <div className="sticky top-8">{FilterSidebar}</div>
                )}
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main */}
          <div className="flex-1">
            {/* Header / Controls */}
            <div className="mb-5">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-700">
                    <Tag className="w-4 h-4 text-gray-600" />
                    Combo offers
                  </div>

                  <h1 className="mt-3 text-xl font-bold uppercase tracking-widest text-gray-900">
                    Exclusive Bundles
                  </h1>
                  <div className="mt-1 text-xs text-gray-500">
                    {showInitialSkeletons ? (
                      <span className="inline-block h-3 w-24 bg-gray-200 animate-pulse align-middle" />
                    ) : (
                      ""
                    )}
                    {!isLoading && activeFiltersCount > 0 ? ` ? ${activeFiltersCount} active` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* View toggles */}
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

                  {/* Sort (refined) */}
                  <div className="relative">
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortOption)}
                      className="appearance-none border border-gray-200 bg-white pl-3 pr-9 py-2 text-xs font-semibold uppercase tracking-wider text-gray-700 outline-none focus:border-gray-400"
                    >
                      <option value="featured">Featured</option>
                      <option value="newest">New Arrivals</option>
                      <option value="discount_high">Highest Discount</option>
                      <option value="discount_low">Lowest Discount</option>
                      <option value="price_low">Price: Low to High</option>
                      <option value="price_high">Price: High to Low</option>
                      <option value="popular">Most Popular</option>
                    </select>
                    <ChevronRight className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Active chips */}
              {activeFiltersCount > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {debouncedSearch && (
                    <Chip label={`Search: ${debouncedSearch}`} onRemove={() => setSearchQuery("")} />
                  )}
                  {categories.map((c) => (
                    <Chip
                      key={c}
                      label={`Category: ${categoryNameBySlug.get(c) ?? formatCategoryLabel(c)}`}
                      onRemove={() => setCategories((p) => p.filter((x) => x !== c))}
                    />
                  ))}
                  {comboTypes.map((t) => (
                    <Chip key={t} label={`Type: ${t}`} onRemove={() => setComboTypes((p) => p.filter((x) => x !== t))} />
                  ))}
                  {priceIds.map((pid) => (
                    <Chip
                      key={pid}
                      label={`Price: ${PRICE_RANGES.find((r) => r.id === pid)?.label || pid}`}
                      onRemove={() => setPriceIds((p) => p.filter((x) => x !== pid))}
                    />
                  ))}
                  {discountIds.map((did) => (
                    <Chip
                      key={did}
                      label={`Discount: ${DISCOUNT_RANGES.find((r) => r.id === did)?.label || did}`}
                      onRemove={() => setDiscountIds((p) => p.filter((x) => x !== did))}
                    />
                  ))}
                  {tags.map((t) => (
                    <Chip key={t} label={`Tag: ${t}`} onRemove={() => setTags((p) => p.filter((x) => x !== t))} />
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

            {/* Content */}
            {showInitialSkeletons ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <ComboCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ComboListItemSkeleton key={i} />
                  ))}
                </div>
              )
            ) : error ? (
              <div className="border border-red-200 bg-red-50 p-6 text-center">
                <p className="text-red-700 font-semibold text-sm mb-2">Error loading combo offers</p>
                <p className="text-red-600 text-xs mb-4">{error}</p>
                <button
                  onClick={() => fetchOffers()}
                  className="px-4 py-2 bg-gray-900 text-white text-xs font-semibold uppercase tracking-wider"
                  type="button"
                >
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="border border-gray-200 bg-white p-10 text-center">
                <div className="text-gray-400 text-sm mb-2">No combo offers found</div>
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
                    {filtered.map((offer) => (
                      <ComboCard
                        key={offer._id}
                        offer={offer}
                        isWishlisted={isOfferWishlisted(offer)}
                        isInCart={isComboInCart(offer)}
                        onToggleWishlist={() => handleToggleWishlist(offer)}
                        onAddToCart={() => handleAddToCart(offer)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className={`space-y-4 ${isRefreshing ? "opacity-70" : ""}`}>
                    {filtered.map((offer) => (
                      <ComboListItem
                        key={offer._id}
                        offer={offer}
                        isWishlisted={isOfferWishlisted(offer)}
                        isInCart={isComboInCart(offer)}
                        onToggleWishlist={() => handleToggleWishlist(offer)}
                        onAddToCart={() => handleAddToCart(offer)}
                      />
                    ))}
                  </div>
                )}

                {/* Refined Pagination */}
                {totalPages > 1 && (
                  <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-gray-500">
                      Showing {(currentPage - 1) * 12 + 1}-{Math.min(currentPage * 12, totalCount)} of{" "}
                      {totalCount} combos
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
function ComboCard({
  offer,
  isWishlisted,
  isInCart,
  onToggleWishlist,
  onAddToCart,
}: {
  offer: ComboOffer;
  isWishlisted: boolean;
  isInCart: boolean;
  onToggleWishlist: () => void;
  onAddToCart: () => void;
}) {
  const daysRemaining = getDaysRemaining(offer.validity.endDate);
  const isLimitedStock = (offer.remainingStock ?? 0) < 10;
  const badgeType = getComboBadge(offer.tags);
  const router = useRouter();

  const outOfStock = (offer.remainingStock ?? 0) <= 0;
  const disabled = !offer.isActive || outOfStock || isInCart;

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    router.push(getComboDetailHref(offer));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="group relative bg-white border border-gray-200 shadow-[0_1px_0_rgba(0,0,0,0.03)] hover:shadow-[0_10px_22px_rgba(0,0,0,0.10)] transition-shadow"
      onClick={handleCardClick}
    >
      <Link href={getComboDetailHref(offer)} className="block">
        <div className="relative h-56 bg-white overflow-hidden">
          <Image
            src={offer.thumbnail || "/placeholder-image.jpg"}
            alt={offer.name}
            fill
            className="object-contain p-6 transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* badges */}
          <div className="absolute left-3 top-3 flex flex-col gap-2">
            <div className="bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">
              {badgeType}
            </div>
            {!offer.isActive && (
              <div className="bg-gray-200 text-gray-700 text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                Expired
              </div>
            )}
          </div>

          {/* discount */}
          <div className="absolute right-3 top-3 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">
            {offer.pricing.discountPercentage}% off
          </div>

          {/* footer chips */}
          <div className="absolute left-3 bottom-3 flex items-center gap-2">
            <div className="bg-white/90 backdrop-blur border border-gray-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1 text-gray-800">
              {(offer.products?.length || 0).toString()} items
            </div>
            {offer.isActive && daysRemaining > 0 && (
              <div className="bg-white/90 backdrop-blur border border-gray-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1 text-gray-800">
                {daysRemaining}d left
              </div>
            )}
          </div>

          {isLimitedStock && offer.isActive && !outOfStock && (
            <div className="absolute right-3 bottom-3 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">
              only {offer.remainingStock} left
            </div>
          )}

          {outOfStock && (
            <div className="absolute right-3 bottom-3 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">
              out of stock
            </div>
          )}

          {/* hover action icons */}
          <div className="absolute right-3 top-14 flex flex-col gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleWishlist();
              }}
              type="button"
              className="w-9 h-9 flex items-center justify-center text-[#6B0F1A] hover:text-red-500 "
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
            </button>


          </div>
        </div>

        <div className="px-4 pb-5 pt-3 text-center">
         {/*  <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
            Combo bundle
          </div> */}

          <div className="mt-2 text-xs text-gray-800 leading-snug line-clamp-2 min-h-8">
            {offer.name}
          </div>

          {/* <div className="mt-2 text-[11px] text-gray-500 line-clamp-2 min-h-7.5">
            {offer.description}
          </div> */}

          <div className="mt-3 flex items-baseline justify-center gap-2">
            <span className="text-xs text-gray-400 line-through">{formatTk(offer.pricing.originalTotal)}</span>
            <span className="text-sm font-bold text-[#F84E25]">{formatTk(offer.pricing.discountedPrice)}</span>
          </div>

          <div className="mt-2 text-[11px] text-gray-600">
            Save <span className="font-semibold">{formatTk(offer.savings || 0)}</span> {/* •{" "} */}
            {/* <span className="font-semibold">{offer.inventory.soldCount}</span> sold */}
          </div>
        </div>
      </Link>

      {/* CTA (disabled states) */}
      <div className="px-4 pb-4">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (disabled) return;
            onAddToCart();
          }}
          disabled={disabled}
          type="button"
          className={[
            "w-full h-11 bg-[#6B0F1A] uppercase tracking-widest text-xs font-bold transition",
            disabled ? "bg-[#6B0F1A] text-white cursor-not-allowed" : "bg-[#6B0F1A] text-white hover:bg-[#AFAFAF]",
            "opacity-100 lg:opacity-0 lg:group-hover:opacity-100",
          ].join(" ")}
        >
          {!offer.isActive ? "OFFER EXPIRED" : outOfStock ? "OUT OF STOCK" : isInCart ? "IN CART" : "SHOP NOW"}
        </button>
      </div>
    </motion.div>
  );
}

function ComboListItem({
  offer,
  isWishlisted,
  isInCart,
  onToggleWishlist,
  onAddToCart,
}: {
  offer: ComboOffer;
  isWishlisted: boolean;
  isInCart: boolean;
  onToggleWishlist: () => void;
  onAddToCart: () => void;
}) {
  const daysRemaining = getDaysRemaining(offer.validity.endDate);
  const router = useRouter();

  const outOfStock = (offer.remainingStock ?? 0) <= 0;
  const disabled = !offer.isActive || outOfStock || isInCart;

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    router.push(getComboDetailHref(offer));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 shadow-[0_1px_0_rgba(0,0,0,0.03)] hover:shadow-[0_10px_22px_rgba(0,0,0,0.10)] transition-shadow"
      onClick={handleCardClick}
    >
      <div className="flex flex-col md:flex-row">
        <Link href={getComboDetailHref(offer)} className="md:w-64 shrink-0">
          <div className="relative h-56 md:h-full bg-white overflow-hidden">
            <Image
              src={offer.thumbnail || "/placeholder-image.jpg"}
              alt={offer.name}
              fill
              className="object-contain p-6"
              sizes="(max-width: 768px) 100vw, 256px"
            />

            <div className="absolute left-3 top-3 flex flex-col gap-2">
              <div className="bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                {offer.pricing.discountPercentage}% off
              </div>
              {!offer.isActive && (
                <div className="bg-gray-200 text-gray-700 text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                  expired
                </div>
              )}
            </div>

            <div className="absolute left-3 bottom-3 bg-white/90 backdrop-blur border border-gray-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1 text-gray-800">
              {(offer.products?.length || 0).toString()} items
              {offer.isActive && daysRemaining > 0 ? ` • ${daysRemaining}d left` : ""}
            </div>

            {outOfStock && (
              <div className="absolute right-3 bottom-3 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                out of stock
              </div>
            )}
          </div>
        </Link>

        <div className="flex-1 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                Combo bundle
              </div>
              <Link href={getComboDetailHref(offer)} className="block mt-2">
                <div className="text-sm font-semibold text-gray-900">{offer.name}</div>
              </Link>

              <div className="mt-2 text-xs text-gray-600 line-clamp-2">{offer.description}</div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-xs text-gray-400 line-through">{formatTk(offer.pricing.originalTotal)}</span>
                <span className="text-sm font-bold text-[#F84E25]">{formatTk(offer.pricing.discountedPrice)}</span>
                <span className="text-[11px] text-gray-500">
                  Save <span className="font-semibold">{formatTk(offer.savings || 0)}</span>
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {(offer.features || []).slice(0, 4).map((f, i) => (
                  <span key={i} className="px-2 py-1 text-[11px] border border-gray-200 bg-white text-gray-700">
                    {f}
                  </span>
                ))}
              </div>

              <div className="mt-3 text-[11px] text-gray-500 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1">
                  <Users className="w-4 h-4 text-gray-400" /> {offer.inventory.soldCount} sold
                </span>
                <span className="inline-flex items-center gap-1">
                  <Package className="w-4 h-4 text-gray-400" /> {offer.remainingStock ?? 0} left
                </span>
                {offer.isActive && daysRemaining > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" /> {daysRemaining}d left
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleWishlist();
              }}
              className="text-gray-400 hover:text-red-500 transition-colors"
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              type="button"
            >
              <Heart className={`w-5 h-5 text-[#6B0F1A] ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (disabled) return;
                onAddToCart();
              }}
              disabled={disabled}
              type="button"
              className={`h-10 px-5 uppercase bg-[#6B0F1A] tracking-widest text-xs font-bold transition ${
                disabled ? "bg-[#6B0F1A] text-white cursor-not-allowed" : "bg-[#6B0F1A] text-white hover:bg-[#AFAFAF]"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                {!offer.isActive ? "EXPIRED" : outOfStock ? "OUT OF STOCK" : isInCart ? "IN CART" : "SHOP NOW"}
              </span>
            </button>

            <Link
              href={getComboDetailHref(offer)}
              className="h-10 px-5 bg-[#6B0F1A] border border-gray-200 uppercase tracking-widest text-xs font-bold text-white hover:border-gray-400 inline-flex items-center"
            >
              View details
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
