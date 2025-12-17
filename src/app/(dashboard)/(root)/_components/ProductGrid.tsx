/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Star, Eye, ShoppingBag, CheckCircle, Sparkles, Zap, 
  TrendingUp, Filter, Grid, List, Heart 
} from "lucide-react";
import { useCommerce } from "@/context/CommerceContext";
import type { Product as CommerceProduct } from "@/context/CommerceContext";

// ========== TYPES ==========
type Currency = "BDT";

interface Product {
  id: string;
  name: string;
  slug: string;
  image: string;
  price: {
    current: number;
    original: number;
    currency: Currency;
  };
  discountPercent?: number;
  rating: number;
  reviewCount: number;
  category: string;
  isNew?: boolean;
  isBestseller?: boolean;
  inStock: boolean;
  tags?: string[];
  inventory?: { quantity: number; status: string };
}

interface CollectionResponse {
  slug?: string;
  bannerTitle?: string;
  bannerImage?: string;
  collections?: CollectionEntry[];
}

interface CollectionEntry {
  type: "product" | "combo";
  refId?: string;
  slug?: string;
  name?: string;
  price?: number | string;
  thumbnail?: string;
  category?: string;
  tags?: string[];
  product?: any;
  combo?: any;
}

interface Category {
  slug: string;
  name: string;
}

interface ApiResponse<T> {
  data?: T[];
  products?: T[];
  collections?: CollectionResponse[];
  categories?: Category[];
}

interface ProductGridProps {
  products?: Product[];
  title?: string;
  subtitle?: string;
  maxDisplay?: number;
  showFeatured?: boolean;
  showCTA?: boolean;
  showFilters?: boolean;
}

// ========== CONSTANTS ==========
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&h=400&fit=crop";
const COLLECTIONS_LIMIT = 4;
const CATEGORIES_LIMIT = 6;
const DEFAULT_MAX_DISPLAY = 12;
const SKELETON_COUNT = 8;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

// ========== UTILITY FUNCTIONS ==========
const formatBDT = (value: number): string => {
  return value.toLocaleString("en-US");
};

const safeNumber = (value?: string | number, fallback = 0): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const calculateDiscountPercentage = (original: number, current: number): number => {
  if (original <= 0 || current >= original) return 0;
  return Math.round(((original - current) / original) * 100);
};

const dedupeProducts = (products: Product[]): Product[] => {
  const seen = new Set<string>();
  return products.filter(product => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
};

const normalizeCollectionEntry = (entry: CollectionEntry): Product | null => {
  try {
    const detail = entry.product ?? entry.combo;
    if (!detail) return null;

    const slug = detail.slug || entry.slug || entry.refId || detail._id?.toString();
    if (!slug) return null;

    const current = safeNumber(detail.pricing?.current?.value, safeNumber(entry.price, 0));
    const original = safeNumber(detail.pricing?.original?.value, current);
    const discountPercent = calculateDiscountPercentage(original, current);

    const image = 
      detail.media?.thumbnail || 
      entry.thumbnail || 
      detail.media?.gallery?.[0] || 
      FALLBACK_IMAGE;

    const rating = safeNumber(detail.ratings?.averageRating, 4.5);
    const reviewCount = safeNumber(detail.ratings?.totalReviews, 0);

    return {
      id: detail._id?.toString() || `col-${Date.now()}-${Math.random()}`,
      name: detail.name || entry.name || "Collection Item",
      slug: String(slug),
      image,
      price: { current, original, currency: "BDT" as Currency },
      discountPercent: discountPercent > 0 ? discountPercent : undefined,
      rating,
      reviewCount,
      category: detail.category || entry.category || "Collection",
      isNew: Boolean(detail.isNew),
      isBestseller: Boolean(detail.isBestseller),
      inStock: detail.inventory?.status !== "out_of_stock" && 
               safeNumber(detail.inventory?.quantity, 1) > 0,
      tags: Array.isArray(detail.tags) ? detail.tags : [],
      inventory: detail.inventory || { quantity: 10, status: "in_stock" }
    };
  } catch {
    return null;
  }
};

const normalizeProductDoc = (doc: any): Product => {
  try {
    const slug = doc.slug || doc._id?.toString() || "product";
    const current = safeNumber(doc.pricing?.current?.value, 0);
    const original = safeNumber(doc.pricing?.original?.value, current);
    const discountPercent = calculateDiscountPercentage(original, current);

    return {
      id: doc._id?.toString() || slug,
      name: doc.name || "Untitled Product",
      slug,
      image: doc.media?.thumbnail || doc.media?.gallery?.[0] || FALLBACK_IMAGE,
      price: { current, original, currency: "BDT" as Currency },
      discountPercent: discountPercent > 0 ? discountPercent : undefined,
      rating: safeNumber(doc.ratings?.averageRating, 4.5),
      reviewCount: safeNumber(doc.ratings?.totalReviews, 0),
      category: doc.category || doc.categoryDetails?.name || "Products",
      isNew: Boolean(doc.isNew),
      isBestseller: Boolean(doc.isBestseller),
      inStock: doc.inventory?.status !== "out_of_stock" && 
               safeNumber(doc.inventory?.quantity, 1) > 0,
      tags: Array.isArray(doc.tags) ? doc.tags : [],
      inventory: doc.inventory || { quantity: 10, status: "in_stock" }
    };
  } catch {
    return {
      id: "error",
      name: "Error Loading Product",
      slug: "error",
      image: FALLBACK_IMAGE,
      price: { current: 0, original: 0, currency: "BDT" },
      rating: 0,
      reviewCount: 0,
      category: "Error",
      inStock: false,
    };
  }
};

const toCommerceProduct = (product: Product): CommerceProduct => {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    image: product.image,
    price: product.price.current,
    oldPrice: product.price.original,
    category: product.category,
    description: product.name,
    shortDescription: product.tags?.[0] || product.category
  };
};

// ========== API FUNCTIONS ==========
const fetchWithTimeout = async (url: string, options?: RequestInit, timeout = 8000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

const fetchCollectionProductsBySlug = async (slug: string): Promise<Product[]> => {
  try {
    const response = await fetchWithTimeout(
      `/api/collections?search=${encodeURIComponent(slug)}&limit=1`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload: ApiResponse<CollectionResponse> = await response.json();
    const collections = payload.collections || [];
    
    const collection = collections.find(col => col.slug === slug) || collections[0];
    if (!collection?.collections) return [];

    return collection.collections
      .map(normalizeCollectionEntry)
      .filter((product): product is Product => product !== null);
  } catch (error) {
    console.error(`Failed to fetch collection ${slug}:`, error);
    return [];
  }
};

const fetchCategoryProductsBySlug = async (slug: string): Promise<Product[]> => {
  try {
    const response = await fetchWithTimeout(
      `/api/products?category=${encodeURIComponent(slug)}&limit=4`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload: ApiResponse<any> = await response.json();
    const products = payload.products || [];
    
    return products.map(normalizeProductDoc);
  } catch (error) {
    console.error(`Failed to fetch category ${slug}:`, error);
    return [];
  }
};

const fetchRemoteProducts = async (maxDisplay: number): Promise<Product[]> => {
  try {
    const [collectionsRes, categoriesRes] = await Promise.all([
      fetchWithTimeout(`/api/collections?status=public&limit=${COLLECTIONS_LIMIT}`),
      fetchWithTimeout(`/api/categories?limit=${CATEGORIES_LIMIT}`),
    ]);

    if (!collectionsRes.ok || !categoriesRes.ok) {
      throw new Error("Failed to fetch collections or categories");
    }

    const [collectionsData, categoriesData]: [ApiResponse<CollectionResponse>, ApiResponse<Category>] = 
      await Promise.all([collectionsRes.json(), categoriesRes.json()]);

    const collectionSlugs = (collectionsData.collections || [])
      .map(col => col.slug)
      .filter(Boolean) as string[];

    const categorySlugs = (categoriesData.categories || [])
      .map(cat => cat.slug)
      .filter(Boolean) as string[];

    const [collectionProducts, categoryProducts] = await Promise.all([
      Promise.all(collectionSlugs.map(slug => fetchCollectionProductsBySlug(slug))),
      Promise.all(categorySlugs.map(slug => fetchCategoryProductsBySlug(slug))),
    ]);

    const allProducts = [
      ...collectionProducts.flat(),
      ...categoryProducts.flat(),
    ];

    return dedupeProducts(allProducts).slice(0, maxDisplay);
  } catch (error) {
    console.error("Failed to fetch remote products:", error);
    throw error;
  }
};

// ========== SUB-COMPONENTS ==========
const ProductImage = ({ src, alt }: { src: string; alt: string }) => {
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill
      className="object-contain p-6 group-hover:scale-110 transition-transform duration-700 ease-out"
      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
      onError={() => setImgSrc(FALLBACK_IMAGE)}
      priority={false}
      loading="lazy"
    />
  );
};

interface ProductCardProps {
  product: Product;
  index: number;
  isProductInCart: (productId: string) => boolean;
  isProductWishlisted: (productId: string) => boolean;
  handleAddToCart: (product: Product) => void;
  handleToggleWishlist: (product: Product) => void;
}

const ProductCard = ({ 
  product, 
  index,
  isProductInCart,
  isProductWishlisted,
  handleAddToCart,
  handleToggleWishlist
}: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const productInCart = isProductInCart(product.id);
  const productWishlisted = isProductWishlisted(product.id);

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Quick view:", product.id);
  };

  const savings = product.price.original - product.price.current;

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -8 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group"
    >
      <Link href={`/products/${product.slug}`} className="block h-full">
        <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 overflow-hidden h-full flex flex-col backdrop-blur-sm">
          {/* Glow effect on hover */}
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute -inset-2 rounded-2xl bg-linear-to-r from-amber-500/5 via-transparent to-purple-500/5 blur-xl pointer-events-none"
            />
          )}

          {/* Image Container */}
          <div className="relative h-64 md:h-72 overflow-hidden bg-linear-to-br from-gray-50 to-gray-100/50">
            <ProductImage src={product.image} alt={product.name} />

            {/* Wishlist Button */}
            <motion.button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleToggleWishlist(product);
              }}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full 
                       bg-white/90 backdrop-blur-sm flex items-center justify-center
                       shadow-lg hover:shadow-xl transition-all duration-300
                       hover:bg-white"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label={productWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart 
                className={`w-5 h-5 transition-colors ${
                  productWishlisted 
                    ? "fill-red-500 text-red-500" 
                    : "text-gray-600 hover:text-red-500"
                }`}
              />
            </motion.button>

            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent 
                          opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="absolute inset-0 bg-linear-to-tr from-amber-500/5 via-transparent to-purple-500/5 
                          opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {product.isNew && (
                <motion.span
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 
                           bg-linear-to-r from-blue-600 to-cyan-600 
                           text-white text-xs font-bold rounded-full shadow-lg"
                >
                  <Zap className="w-3 h-3" />
                  NEW
                </motion.span>
              )}
              {product.isBestseller && (
                <motion.span
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 
                           bg-linear-to-r from-amber-500 to-orange-500 
                           text-white text-xs font-bold rounded-full shadow-lg"
                >
                  <TrendingUp className="w-3 h-3" />
                  BESTSELLER
                </motion.span>
              )}
            </div>

            {/* Discount Badge */}
            {product.discountPercent && product.discountPercent > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="absolute top-16 right-4"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-linear-to-br from-red-600 to-pink-600 
                                flex items-center justify-center text-white font-bold text-sm
                                shadow-xl">
                    -{product.discountPercent}%
                  </div>
                  <div className="absolute -inset-1 rounded-full bg-red-600/30 blur-sm" />
                </div>
              </motion.div>
            )}

            {/* Out of Stock Overlay */}
            {!product.inStock && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/60 flex items-center justify-center"
              >
                <span className="px-4 py-2 bg-gray-800 text-white font-bold text-sm rounded-lg shadow-xl">
                  OUT OF STOCK
                </span>
              </motion.div>
            )}

            {/* Quick View & Add to Cart Buttons */}
            <div className={`absolute bottom-4 left-4 right-4 flex gap-2 transition-all duration-300 ${
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <button
                onClick={handleQuickView}
                className="flex-1 py-2.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg 
                         flex items-center justify-center gap-2 hover:bg-white hover:scale-[1.02] 
                         transition-all duration-300"
                aria-label="Quick view"
                title="Quick view"
              >
                <Eye className="w-4 h-4 text-gray-700" />
                <span className="text-sm font-medium text-gray-900">Quick View</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddToCart(product);
                }}
                className={`px-6 py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2 
                         transition-all duration-300 hover:scale-[1.02] ${
                           product.inStock && !productInCart
                             ? "bg-linear-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl"
                             : productInCart
                             ? "bg-green-100 text-green-700 hover:bg-green-200"
                             : "bg-gray-300 text-gray-500 cursor-not-allowed"
                         }`}
                disabled={!product.inStock || productInCart}
                aria-label={productInCart ? "In Cart" : product.inStock ? "Add to cart" : "Out of stock"}
              >
                <ShoppingBag className="w-4 h-4" />
                {productInCart ? "In Cart" : product.inStock ? "Add" : "Out"}
              </button>
            </div>
          </div>

          {/* Product Info */}
          <div className="p-6 flex-1 flex flex-col">
            {/* Category */}
            <div className="mb-3">
              <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">
                {product.category}
              </span>
            </div>

            {/* Product Name */}
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-3 line-clamp-2 flex-1 leading-tight">
              {product.name}
            </h3>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {product.tags.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-gray-100 text-xs text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Rating */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(product.rating)
                        ? "fill-amber-400 text-amber-400"
                        : "fill-gray-200 text-gray-200"
                    }`}
                  />
                ))}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900">
                  {product.rating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-500">
                  {product.reviewCount.toLocaleString()} reviews
                </span>
              </div>
            </div>

            {/* Price Section */}
            <div className="mt-auto pt-4 border-t border-gray-100">
              <div className="flex items-end justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl md:text-3xl font-bold text-gray-900">
                      ৳{formatBDT(product.price.current)}
                    </span>
                    {product.price.original > product.price.current && (
                      <span className="text-sm text-gray-500 line-through">
                        ৳{formatBDT(product.price.original)}
                      </span>
                    )}
                  </div>
                  
                  {product.price.original > product.price.current && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        Save {product.discountPercent}%
                      </span>
                      <span className="text-xs text-gray-500">
                        ৳{formatBDT(savings)} off
                      </span>
                    </div>
                  )}
                </div>

                {/* Stock Status */}
                <div className="flex flex-col items-end">
                  {product.inStock ? (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-green-600 font-medium">In Stock</span>
                    </div>
                  ) : (
                    <span className="text-xs text-red-600 font-medium">Out of Stock</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Border glow on hover */}
          <div className="absolute inset-0 rounded-2xl border-2 border-transparent 
                        group-hover:border-amber-400/20 transition-colors duration-300 
                        pointer-events-none" />
        </div>
      </Link>

      {/* Floating particles */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-linear-to-r from-amber-400/20 to-purple-400/20"
          style={{
            top: `${10 + i * 20}%`,
            left: `${5 + i * 30}%`,
          }}
          animate={{
            y: [0, -10, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2 + i,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        />
      ))}
    </motion.div>
  );
};

const ProductGridSkeleton = ({ count }: { count: number }) => (
  <motion.div 
    variants={containerVariants}
    initial="hidden"
    animate="visible"
    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
  >
    {Array.from({ length: count }).map((_, i) => (
      <motion.div
        key={i}
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-linear-to-br from-gray-100 to-gray-200/50 border border-gray-200/50 h-100"
      >
        <div className="absolute inset-0">
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-linear-to-r from-transparent via-white/20 to-transparent" />
        </div>
        
        <div className="h-64 md:h-72 bg-linear-to-br from-gray-200 to-gray-300" />
        <div className="p-6 space-y-4">
          <div className="h-4 bg-linear-to-r from-gray-200 to-gray-300 rounded w-3/4" />
          <div className="h-4 bg-linear-to-r from-gray-200 to-gray-300 rounded w-1/2" />
          <div className="h-6 bg-linear-to-r from-gray-200 to-gray-300 rounded w-full" />
          <div className="flex gap-2">
            <div className="h-6 bg-linear-to-r from-gray-200 to-gray-300 rounded w-20" />
            <div className="h-6 bg-linear-to-r from-gray-200 to-gray-300 rounded w-16" />
          </div>
        </div>
      </motion.div>
    ))}
  </motion.div>
);

const ErrorDisplay = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl border border-red-200 bg-linear-to-br from-red-50 to-white p-8 text-center shadow-lg"
  >
    <div className="mb-4">
      <div className="w-16 h-16 rounded-full bg-linear-to-r from-red-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-red-900 mb-2">Error Loading Products</h3>
      <p className="text-red-700 mb-6 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          className="px-6 py-3 bg-linear-to-r from-red-600 to-pink-600 text-white font-semibold rounded-full hover:shadow-xl transition-all duration-300"
        >
          Try Again
        </motion.button>
      )}
    </div>
  </motion.div>
);

const CTAFooter = () => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay: 0.2 }}
    className="mt-20 text-center"
  >
    <div className="bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10">
        <motion.div
          className="absolute inset-0"
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientTransform='rotate(45)'%3E%3Cstop offset='0%25' stop-color='%23ffffff' stop-opacity='0.1'/%3E%3Cstop offset='50%25' stop-color='%23ffffff' stop-opacity='0.05'/%3E%3Cstop offset='100%25' stop-color='%23ffffff' stop-opacity='0.1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23a)'/%3E%3C/svg%3E")`,
            backgroundSize: "60px",
          }}
        />
      </div>

      <div className="relative z-10">
        <h3 className="text-3xl md:text-4xl font-bold mb-6">
          Ready to Explore More?
        </h3>
        <p className="text-gray-300 mb-8 max-w-2xl mx-auto text-lg">
          Discover our complete collection with exclusive discounts, premium quality, and exceptional service.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/products"
            className="group inline-flex items-center justify-center gap-3 px-8 py-4 
                     bg-linear-to-r from-amber-500 to-orange-500 text-white font-bold 
                     rounded-full hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Browse All Products</span>
            <motion.svg
              className="w-5 h-5"
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </motion.svg>
          </Link>

          <Link
            href="/categories"
            className="group inline-flex items-center justify-center gap-3 px-8 py-4 
                     bg-white/10 backdrop-blur-sm text-white font-bold rounded-full 
                     border border-white/30 hover:bg-white/20 transition-all duration-300"
          >
            <span>Browse by Category</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { text: "Free shipping on orders over ৳5,000" },
            { text: "30-day return policy" },
            { text: "24/7 customer support" },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 text-gray-300">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </motion.div>
);

// ========== MAIN COMPONENT ==========
export default function ProductGrid({
  products: propProducts = [],
  title = "Featured Products",
  subtitle = "Discover our top products",
  maxDisplay = DEFAULT_MAX_DISPLAY,
  showFeatured = true,
  showCTA = true,
  showFilters = false,
}: ProductGridProps) {
  // Commerce Context
  const {
    wishlistItems,
    addToWishlist,
    removeFromWishlist,
    addToCart,
    isInCart,
  } = useCommerce();

  const wishlistIds = useMemo(() => 
    new Set(wishlistItems.map((item) => item.id)), 
    [wishlistItems]
  );

  const [remoteProducts, setRemoteProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Cart and Wishlist Handlers
  const handleAddToCart = useCallback((product: Product) => {
    if (!product.inStock) {
      console.log("Product is out of stock");
      return;
    }

    if (isInCart(product.id)) {
      console.log("Product already in cart");
      return;
    }

    const commerceProduct = toCommerceProduct(product);
    addToCart(commerceProduct);
    console.log("Added to cart:", product.name);
  }, [addToCart, isInCart]);

  const handleToggleWishlist = useCallback((product: Product) => {
    const commerceProduct = toCommerceProduct(product);
    
    if (wishlistIds.has(product.id)) {
      removeFromWishlist(product.id);
      console.log("Removed from wishlist:", product.name);
    } else {
      addToWishlist(commerceProduct);
      console.log("Added to wishlist:", product.name);
    }
  }, [wishlistIds, addToWishlist, removeFromWishlist]);

  const isProductWishlisted = useCallback((productId: string) => {
    return wishlistIds.has(productId);
  }, [wishlistIds]);

  const isProductInCart = useCallback((productId: string) => {
    return isInCart(productId);
  }, [isInCart]);

  // Merge products with priority to remote
  const products = useMemo(() => {
    const source = remoteProducts.length > 0 ? remoteProducts : propProducts;
    return source.slice(0, maxDisplay);
  }, [propProducts, remoteProducts, maxDisplay]);

  const loadRemoteProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedProducts = await fetchRemoteProducts(maxDisplay);
      setRemoteProducts(fetchedProducts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load products";
      setError(errorMessage);
      
      if (propProducts.length === 0) {
        setRemoteProducts([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [maxDisplay, propProducts.length]);

  useEffect(() => {
    if (propProducts.length === 0) {
      loadRemoteProducts();
    }
  }, [propProducts.length, loadRemoteProducts]);

  const showSkeletons = isLoading && products.length === 0;
  const hasProducts = products.length > 0;
  const showError = error && !hasProducts;

  return (
    <div className="relative w-full bg-linear-to-b from-white to-gray-50 py-12 md:py-20 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{
            background: [
              "radial-gradient(circle at 0% 0%, rgba(251, 191, 36, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 0%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 100%, rgba(251, 191, 36, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 0%, rgba(251, 191, 36, 0.1) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        {showFeatured && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-semibold text-amber-600 uppercase tracking-wider">
                Premium Collection
              </span>
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 leading-tight">
              {title}
            </h2>
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {subtitle}
            </p>
            
            <div className="flex justify-center">
              <div className="h-1 w-32 bg-linear-to-r from-amber-500 via-purple-500 to-amber-500 rounded-full" />
            </div>
          </motion.div>
        )}

        {/* Filters & View Toggle */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-200"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">
                {products.length} Products
              </span>
              
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <Filter className="w-4 h-4" />
                <span className="text-sm">Filter</span>
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {showError && (
          <div className="mb-8">
            <ErrorDisplay message={error} onRetry={loadRemoteProducts} />
          </div>
        )}

        {/* Loading State */}
        {showSkeletons ? (
          <ProductGridSkeleton count={SKELETON_COUNT} />
        ) : hasProducts ? (
          /* Products Grid */
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={`grid gap-6 md:gap-8 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}
          >
            {products.map((product, index) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                index={index}
                isProductInCart={isProductInCart}
                isProductWishlisted={isProductWishlisted}
                handleAddToCart={handleAddToCart}
                handleToggleWishlist={handleToggleWishlist}
              />
            ))}
          </motion.div>
        ) : (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="mb-8">
              <div className="w-32 h-32 rounded-full mx-auto flex items-center justify-center mb-6 bg-linear-to-br from-gray-100 to-gray-200">
                <svg
                  className="w-16 h-16 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                No products found
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                We couldn't find any products matching your criteria. Try adjusting your filters or check back later for new arrivals.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={loadRemoteProducts}
                  className="px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-xl transition-all duration-300"
                >
                  Refresh Products
                </button>
                <Link
                  href="/products"
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  Browse All
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Call to Action */}
        {showCTA && hasProducts && <CTAFooter />}
      </div>
    </div>
  );
}