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

const PRODUCT_CATEGORIES = [
  "Shirts",
  "Panjabis",
  "Sarees",
  "Blouses",
  "Dresses",
  "Kurtas",
  "Pants",
  "Blazers",
  "Accessories",
  "Unstitched",
];

function formatTk(n: number) {
  return `Tk. ${n.toLocaleString("en-US")}`;
}

const mapComboToCommerceProduct = (offer: ComboOffer): CommerceProduct => {
  const slug = offer.slug || offer._id;
  return {
    id: `combo-${offer._id}`,
    name: offer.name,
    slug: `/product-data/${encodeURIComponent(slug)}`,
    image: offer.thumbnail || "/placeholder-image.jpg",
    price: offer.pricing.discountedPrice,
    oldPrice: offer.pricing.originalTotal,
    category: "combo",
    description: offer.description,
    shortDescription: offer.tags?.[0],
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

function ComboCardSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="relative h-64 bg-gray-200" />
      <div className="p-5 space-y-4">
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="h-4 w-1/2 rounded bg-gray-200" />
        <div className="h-8 w-full rounded bg-gray-200" />
      </div>
    </div>
  );
}

function FilterSidebarSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6 animate-pulse">
      <div className="h-5 w-1/2 rounded bg-gray-200" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`filter-skel-${index}`} className="space-y-2">
            <div className="h-4 w-1/3 rounded bg-gray-200" />
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

export default function ComboOffersListingPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [priceIds, setPriceIds] = useState<string[]>([]);
  const [discountIds, setDiscountIds] = useState<string[]>([]);
  const [comboTypes, setComboTypes] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>("featured");
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

  // API states
  const [offers, setOffers] = useState<ComboOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch combo offers
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

  // Client-side filtering + sorting
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

  const isComboInCart = (offer: ComboOffer) =>
    isInCart(mapComboToCommerceProduct(offer).id);

  const handleAddToCart = (offer: ComboOffer) => {
    if (!offer.isActive || (offer.remainingStock ?? 0) <= 0) return;
    const commerceProduct = mapComboToCommerceProduct(offer);
    if (isInCart(commerceProduct.id)) return;
    addToCart(commerceProduct);
  };

  const isOfferWishlisted = (offer: ComboOffer) => wishlistIds.has(mapComboToCommerceProduct(offer).id);

  const activeFiltersCount = [categories.length, priceIds.length, discountIds.length, comboTypes.length, tags.length]
    .filter(Boolean)
    .length;

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

  // 🔥 UPDATED: No internal scroll. Desktop shows full sidebar. Mobile uses drawer + backdrop.
  const FilterSidebar = (
    <div className="bg-white rounded-xl p-6 border" style={{ borderColor: robe.blush }}>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-lg font-serif font-semibold" style={{ color: robe.maroon }}>
          Filters
        </h2>

        {/* Mobile close button */}
        {isMobile ? (
          <button
            onClick={() => setShowFilters(false)}
            className="w-9 h-9 rounded-lg border flex items-center justify-center hover:opacity-80 transition-opacity"
            style={{ borderColor: robe.blush, color: robe.text, backgroundColor: robe.cream }}
            aria-label="Close filters"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={clearAll}
            className="text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: robe.sand }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Desktop clear all under title if you prefer */}
      {!isMobile && (
        <div className="-mt-6 mb-6">
          <button
            onClick={clearAll}
            className="text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: robe.sand }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search combo offers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 transition-all"
            style={{
              borderColor: robe.blush,
              color: robe.text,
              backgroundColor: robe.cream,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: robe.sand }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: robe.maroon }}>
          Product Categories
        </h3>
        <div className="space-y-2">
          {PRODUCT_CATEGORIES.map((category) => (
            <label key={category} className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={categories.includes(category)}
                  onChange={(e) =>
                    setCategories((prev) => (e.target.checked ? [...prev, category] : prev.filter((c) => c !== category)))
                  }
                  className="peer sr-only"
                />
                <div className="w-4 h-4 rounded border transition-all" style={{ borderColor: robe.blush }}>
                  <Check
                    className="w-3 h-3 opacity-0 transition-opacity peer-checked:opacity-100"
                    style={{ color: robe.maroon }}
                  />
                </div>
              </div>
              <span className="text-sm group-hover:opacity-80 transition-opacity" style={{ color: robe.text }}>
                {category}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Combo Types */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: robe.maroon }}>
          Combo Type
        </h3>
        <div className="space-y-2">
          {COMBO_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={comboTypes.includes(type)}
                  onChange={(e) =>
                    setComboTypes((prev) => (e.target.checked ? [...prev, type] : prev.filter((t) => t !== type)))
                  }
                  className="peer sr-only"
                />
                <div className="w-4 h-4 rounded border transition-all" style={{ borderColor: robe.blush }}>
                  <Check
                    className="w-3 h-3 opacity-0 transition-opacity peer-checked:opacity-100"
                    style={{ color: robe.maroon }}
                  />
                </div>
              </div>
              <span className="text-sm group-hover:opacity-80 transition-opacity" style={{ color: robe.text }}>
                {type}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: robe.maroon }}>
          Price Range
        </h3>
        <div className="space-y-2">
          {PRICE_RANGES.map((range) => (
            <label key={range.id} className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={priceIds.includes(range.id)}
                  onChange={(e) =>
                    setPriceIds((prev) => (e.target.checked ? [...prev, range.id] : prev.filter((id) => id !== range.id)))
                  }
                  className="peer sr-only"
                />
                <div className="w-4 h-4 rounded border transition-all" style={{ borderColor: robe.blush }}>
                  <Check
                    className="w-3 h-3 opacity-0 transition-opacity peer-checked:opacity-100"
                    style={{ color: robe.maroon }}
                  />
                </div>
              </div>
              <span className="text-sm group-hover:opacity-80 transition-opacity" style={{ color: robe.text }}>
                {range.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Discount Range */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: robe.maroon }}>
          Discount
        </h3>
        <div className="space-y-2">
          {DISCOUNT_RANGES.map((range) => (
            <label key={range.id} className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={discountIds.includes(range.id)}
                  onChange={(e) =>
                    setDiscountIds((prev) =>
                      e.target.checked ? [...prev, range.id] : prev.filter((id) => id !== range.id)
                    )
                  }
                  className="peer sr-only"
                />
                <div className="w-4 h-4 rounded border transition-all" style={{ borderColor: robe.blush }}>
                  <Check
                    className="w-3 h-3 opacity-0 transition-opacity peer-checked:opacity-100"
                    style={{ color: robe.maroon }}
                  />
                </div>
              </div>
              <span className="text-sm group-hover:opacity-80 transition-opacity" style={{ color: robe.text }}>
                {range.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="mb-2">
          <h3 className="text-sm font-semibold mb-3" style={{ color: robe.maroon }}>
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {allTags.slice(0, 12).map((tag) => (
              <button
                key={tag}
                onClick={() => setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))}
                className="px-3 py-1 text-xs font-medium rounded-full border transition-all"
                style={{
                  backgroundColor: tags.includes(tag) ? robe.maroon : robe.cream,
                  borderColor: tags.includes(tag) ? robe.maroon : robe.blush,
                  color: tags.includes(tag) ? "white" : robe.text,
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

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
          <Link href="/offers" className="hover:opacity-80 transition-opacity">
            Offers
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" style={{ color: robe.sand }} />
          <span className="font-medium" style={{ color: robe.maroon }}>
            Combo Offers
          </span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Mobile Filter Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl w-full justify-between border transition-all hover:shadow-sm"
              style={{ borderColor: robe.blush, color: robe.maroon }}
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span className="font-medium">Filters</span>
                {activeFiltersCount > 0 && (
                  <span
                    className="w-6 h-6 text-xs rounded-full flex items-center justify-center"
                    style={{ backgroundColor: robe.maroon, color: "white" }}
                  >
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* ✅ Backdrop (mobile) */}
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

          {/* ✅ Sidebar: desktop = normal (no scroll). mobile = drawer. */}
          <AnimatePresence>
            {(!isMobile || showFilters) && (
              <motion.aside
                initial={isMobile ? { x: -24, opacity: 0 } : { x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={isMobile ? { x: -24, opacity: 0 } : { x: -10, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={
                  isMobile
                    ? "fixed left-0 top-0 bottom-0 z-50 w-[92%] max-w-sm p-4"
                    : "lg:w-72 shrink-0"
                }
              >
                {isLoading ? (
                  <FilterSidebarSkeleton />
                ) : isMobile ? (
                  <div className="h-full overflow-y-auto rounded-xl">
                    {/* mobile drawer can scroll the page is locked, so drawer scroll is OK */}
                    {FilterSidebar}
                  </div>
                ) : (
                  // Desktop: ✅ full sidebar, NO internal scroll
                  <div className="sticky top-8">{FilterSidebar}</div>
                )}
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <div className="bg-white rounded-xl p-6 mb-6 border" style={{ borderColor: robe.blush }}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.2em]"
                      style={{ backgroundColor: robe.cream, color: robe.maroon }}
                    >
                      <Tag className="w-3 h-3" />
                      <span>Combo Offers</span>
                    </div>
                    {activeFiltersCount > 0 && (
                      <span
                        className="text-xs font-medium px-2 py-1 rounded"
                        style={{ backgroundColor: robe.sand, color: robe.text }}
                      >
                        {activeFiltersCount} active filter{activeFiltersCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl md:text-3xl font-serif font-bold mb-2" style={{ color: robe.maroon }}>
                    Exclusive Combo Deals
                  </h1>
                  <p className="text-sm" style={{ color: robe.text }}>
                    {isLoading ? "Loading..." : `${totalCount} curated combos`} • Bundle and save on premium collections
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {/* View Mode Toggle */}
                  <div className="flex items-center rounded-lg border" style={{ borderColor: robe.blush }}>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-l-lg transition-all ${viewMode === "grid" ? "text-white" : ""}`}
                      style={{ backgroundColor: viewMode === "grid" ? robe.maroon : "transparent", color: robe.text }}
                    >
                      <Grid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-r-lg transition-all ${viewMode === "list" ? "text-white" : ""}`}
                      style={{ backgroundColor: viewMode === "list" ? robe.maroon : "transparent", color: robe.text }}
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Sort */}
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortOption)}
                    className="px-4 py-2 rounded-lg border text-sm font-medium outline-none transition-all"
                    style={{
                      borderColor: robe.blush,
                      color: robe.text,
                      backgroundColor: "white",
                    }}
                  >
                    <option value="featured">Featured</option>
                    <option value="newest">New Arrivals</option>
                    <option value="discount_high">Highest Discount</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="popular">Most Popular</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Loading / Error / Empty / Data */}
            {isLoading ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ComboCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-white rounded-xl p-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="md:w-64 h-48 rounded-xl bg-gray-200" />
                        <div className="flex-1 space-y-3">
                          <div className="h-4 w-3/4 rounded bg-gray-200" />
                          <div className="h-4 w-1/2 rounded bg-gray-200" />
                          <div className="h-8 w-full rounded bg-gray-200" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-600 font-medium mb-2">Error loading combo offers</p>
                <p className="text-red-500 text-sm mb-4">{error}</p>
                <button
                  onClick={() => fetchOffers()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <div className="mb-6">
                  <div
                    className="w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-4"
                    style={{ backgroundColor: robe.cream }}
                  >
                    <Package className="w-12 h-12" style={{ color: robe.sand }} />
                  </div>
                  <h3 className="text-xl font-serif font-semibold mb-2" style={{ color: robe.maroon }}>
                    No combo offers found
                  </h3>
                  <p className="text-sm mb-6" style={{ color: robe.text }}>
                    Try adjusting your filters or check back later for new offers
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
            ) : (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <div className="space-y-4">
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm" style={{ color: robe.text }}>
                      Showing {(currentPage - 1) * 12 + 1}-{Math.min(currentPage * 12, totalCount)} of {totalCount} combos
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ borderColor: robe.blush, color: robe.text }}
                      >
                        ← Previous
                      </button>

                      {renderPagination().map((page, i) => (
                        <button
                          key={i}
                          onClick={() => typeof page === "number" && handlePageChange(page)}
                          disabled={page === "..."}
                          className={`w-10 h-10 flex items-center justify-center rounded-lg border text-sm font-medium transition-all ${
                            page === "..." ? "pointer-events-none" : ""
                          }`}
                          style={{
                            backgroundColor: page === currentPage ? robe.maroon : "transparent",
                            borderColor: page === currentPage ? robe.maroon : robe.blush,
                            color: page === currentPage ? "white" : robe.text,
                          }}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ borderColor: robe.blush, color: robe.text }}
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

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    router.push(getComboDetailHref(offer));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-white rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-xl"
      style={{ borderColor: robe.blush }}
      onClick={handleCardClick}
    >
      <Link href={getComboDetailHref(offer)}>
        <div className="relative h-64 overflow-hidden bg-linear-to-br from-(--robe-cream) to-white">
          <Image
            src={offer.thumbnail || "/api/placeholder/600/600"}
            alt={offer.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <span
              className="px-3 py-1 text-xs font-bold rounded-full shadow-sm capitalize"
              style={{
                backgroundColor:
                  badgeType === "Limited"
                    ? robe.maroon
                    : badgeType === "Festive"
                    ? robe.success
                    : badgeType === "Seasonal"
                    ? robe.warning
                    : robe.maroon,
                color: "white",
              }}
            >
              {badgeType}
            </span>

            {!offer.isActive && (
              <span className="px-3 py-1 bg-gray-800 text-white text-xs font-bold rounded-full shadow-sm">EXPIRED</span>
            )}
          </div>

          <span
            className="absolute top-3 right-3 px-3 py-1 text-xs font-bold rounded-full shadow-sm"
            style={{ backgroundColor: robe.maroon, color: "white" }}
          >
            {offer.pricing.discountPercentage}% OFF
          </span>

          <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/70 text-white text-xs font-medium rounded-full backdrop-blur-sm">
            {offer.products?.length || 0} Items
          </div>

          {isLimitedStock && (
            <div className="absolute bottom-3 right-3 px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
              Only {offer.remainingStock} left!
            </div>
          )}
        </div>
      </Link>

      <button
        onClick={onToggleWishlist}
        className="absolute top-12 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm z-10 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.9)" }}
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart
          className={`w-4 h-4 ${isWishlisted ? "fill-(--robe-maroon) text-(--robe-maroon)" : ""}`}
          style={{ color: isWishlisted ? robe.maroon : robe.text }}
        />
      </button>

      <div className="p-5">
        <div className="mb-3">
          <Link href={getComboDetailHref(offer)}>
            <h3
              className="text-base font-semibold mb-1 hover:opacity-80 transition-opacity line-clamp-1"
              style={{ color: robe.text }}
            >
              {offer.name}
            </h3>
          </Link>
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">{offer.description}</p>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {offer.features?.slice(0, 3).map((feature, i) => (
            <span key={i} className="px-2 py-1 text-xs rounded" style={{ backgroundColor: robe.cream, color: robe.text }}>
              {feature}
            </span>
          ))}
        </div>

        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xl font-bold" style={{ color: robe.maroon }}>
              {formatTk(offer.pricing.discountedPrice)}
            </span>
            <span className="text-sm line-through" style={{ color: robe.sand }}>
              {formatTk(offer.pricing.originalTotal)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: robe.success }}>
              Save {formatTk(offer.savings || 0)}
            </span>
            <span className="text-xs" style={{ color: robe.text }}>
              {offer.products?.length || 0} products
            </span>
          </div>
        </div>

        {offer.isActive && daysRemaining > 0 && (
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: robe.cream }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: robe.sand }} />
                <span className="text-xs font-medium" style={{ color: robe.text }}>
                  Ends in {daysRemaining} days
                </span>
              </div>
              <span className="text-xs" style={{ color: robe.sand }}>
                {new Date(offer.validity.endDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        <button
          className={`w-full py-2.5 text-white font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
            !offer.isActive || (offer.remainingStock ?? 0) <= 0 || isInCart
              ? "opacity-50 cursor-not-allowed"
              : "hover:shadow-lg"
          }`}
          style={{ backgroundColor: robe.maroon }}
          type="button"
          onClick={onAddToCart}
          disabled={!offer.isActive || (offer.remainingStock ?? 0) <= 0 || isInCart}
        >
          <ShoppingBag className="w-4 h-4" />
          {!offer.isActive
            ? "Offer Expired"
            : (offer.remainingStock ?? 0) <= 0
            ? "Out of Stock"
            : isInCart
            ? "In Cart"
            : `Add Combo - Save ${offer.pricing.discountPercentage}%`}
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

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    router.push(getComboDetailHref(offer));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-md"
      style={{ borderColor: robe.blush }}
      onClick={handleCardClick}
    >
      <div className="flex flex-col md:flex-row">
        <Link href={getComboDetailHref(offer)} className="md:w-64 shrink-0">
          <div className="relative h-64 md:h-full overflow-hidden bg-linear-to-br from-(--robe-cream) to-white">
            <Image
              src={offer.thumbnail || "/api/placeholder/600/400"}
              alt={offer.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 256px"
            />

            <div className="absolute top-3 left-3 flex flex-col gap-2">
              <span className="px-3 py-1 text-xs font-bold rounded-full shadow-sm" style={{ backgroundColor: robe.maroon, color: "white" }}>
                {offer.pricing.discountPercentage}% OFF
              </span>
              {!offer.isActive && (
                <span className="px-3 py-1 bg-gray-800 text-white text-xs font-bold rounded-full shadow-sm">EXPIRED</span>
              )}
            </div>

            <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/70 text-white text-xs font-medium rounded-full backdrop-blur-sm">
              {offer.products?.length || 0} Items
            </div>
          </div>
        </Link>

        <div className="flex-1 p-6">
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Link href={getComboDetailHref(offer)}>
                    <h3 className="text-xl font-serif font-semibold mt-1 hover:opacity-80 transition-opacity mb-2" style={{ color: robe.text }}>
                      {offer.name}
                    </h3>
                  </Link>
                  <p className="text-sm mb-4" style={{ color: robe.text }}>
                    {offer.description}
                  </p>
                </div>
                <button onClick={onToggleWishlist} className="transition-colors hover:opacity-80" aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}>
                  <Heart className={`w-5 h-5 ${isWishlisted ? "fill-(--robe-maroon) text-(--robe-maroon)" : ""}`} style={{ color: isWishlisted ? robe.maroon : robe.text }} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {offer.features?.slice(0, 4).map((feature, i) => (
                  <span key={i} className="px-3 py-1 text-xs rounded-lg" style={{ backgroundColor: robe.cream, color: robe.text }}>
                    {feature}
                  </span>
                ))}
              </div>

              <div className="mb-6">
                <div className="text-sm mb-2" style={{ color: robe.sand }}>
                  Includes:
                </div>
                <div className="flex flex-wrap gap-2">
                  {offer.products?.slice(0, 4).map((comboProduct, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: robe.cream }}>
                      <Package className="w-3 h-3" style={{ color: robe.sand }} />
                      <span className="text-xs" style={{ color: robe.text }}>
                        {comboProduct.product?.name || `Item ${i + 1}`}
                        {comboProduct.quantity > 1 && ` × ${comboProduct.quantity}`}
                      </span>
                    </div>
                  ))}
                  {offer.products && offer.products.length > 4 && (
                    <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: robe.cream }}>
                      <span className="text-xs" style={{ color: robe.text }}>
                        +{offer.products.length - 4} more items
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t" style={{ borderColor: robe.blush }}>
              <div>
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-2xl font-bold" style={{ color: robe.maroon }}>
                    {formatTk(offer.pricing.discountedPrice)}
                  </span>
                  <span className="text-lg line-through" style={{ color: robe.sand }}>
                    {formatTk(offer.pricing.originalTotal)}
                  </span>
                  <span className="px-2 py-1 text-sm font-bold rounded" style={{ backgroundColor: robe.cream, color: robe.maroon }}>
                    Save {formatTk(offer.savings || 0)}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" style={{ color: robe.sand }} />
                    <span className="text-xs" style={{ color: robe.text }}>
                      {offer.inventory.soldCount} sold
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" style={{ color: robe.warning }} />
                    <span className="text-xs" style={{ color: robe.text }}>
                      {offer.remainingStock} in stock
                    </span>
                  </div>
                  {offer.isActive && daysRemaining > 0 && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" style={{ color: robe.success }} />
                      <span className="text-xs" style={{ color: robe.text }}>
                        {daysRemaining} days left
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  className={`px-6 py-2.5 text-white font-medium rounded-lg transition-all flex items-center gap-2 ${
                    !offer.isActive || (offer.remainingStock ?? 0) <= 0 || isInCart
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:shadow-lg"
                  }`}
                  style={{ backgroundColor: robe.maroon }}
                  type="button"
                  onClick={onAddToCart}
                  disabled={!offer.isActive || (offer.remainingStock ?? 0) <= 0 || isInCart}
                >
                  <ShoppingBag className="w-4 h-4" />
                  {!offer.isActive
                    ? "Expired"
                    : (offer.remainingStock ?? 0) <= 0
                    ? "Sold Out"
                    : isInCart
                    ? "In Cart"
                    : "Add Combo"}
                </button>
                <Link
                  href={getComboDetailHref(offer)}
                  className="px-6 py-2.5 font-medium rounded-lg transition-colors border"
                  style={{ borderColor: robe.blush, color: robe.text, backgroundColor: "white" }}
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
