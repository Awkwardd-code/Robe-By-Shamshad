"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Star, 
  TrendingUp, 
  Flame, 
  Award, 
  ShoppingBag, 
  ChevronLeft, 
  ChevronRight, 
  Crown, 
  Trophy,
  Heart
} from "lucide-react";
import { useCommerce } from "@/context/CommerceContext";
import type { Product as CommerceProduct } from "@/context/CommerceContext";

interface BestSellerProduct {
  id: string;
  name: string;
  slug: string;
  image: string;
  originalPrice: string;
  currentPrice: string;
  priceValue: number;
  originalPriceValue: number;
  discount?: string;
  rating: number;
  reviewCount: number;
  category: string;
  salesCount: number;
  description?: string;
  shortDescription?: string;
  tags?: string[];
  inventory?: { quantity: number; status: string };
}

const PRODUCT_ENDPOINT = "/api/products?limit=12&sort=popular";
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&h=300&fit=crop";

const formatCurrencyValue = (value: number): string =>
  value.toLocaleString("en-US");

const safeNumber = (value?: string | number, fallback = 0): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const normalizeProductDoc = (doc: any): BestSellerProduct => {
  const base = doc && typeof doc === "object" ? doc : {};
  const slug = doc?.slug || doc?._id?.toString() || "product";
  const current = safeNumber(doc?.pricing?.current?.value, 0);
  const original = safeNumber(doc?.pricing?.original?.value, current);
  const discount =
    original > 0 && current < original
      ? Math.round(((original - current) / original) * 100).toString()
      : undefined;
  const tags = Array.isArray(doc?.tags) ? doc.tags : undefined;

  // Calculate sales count (for demo, use review count + random)
  const salesCount = doc?.salesCount || 
    Math.floor((doc?.ratings?.totalReviews || 0) * 10 + Math.random() * 100);

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
    category: doc?.category || doc?.categoryDetails?.name || "Products",
    salesCount,
    ...(Array.isArray(tags) ? { tags } : {}),
    inventory: doc?.inventory || { quantity: 10, status: "in_stock" }
  };
};

const toCommerceProduct = (product: BestSellerProduct): CommerceProduct => ({
  ...product,
  price: product.priceValue,
  oldPrice: product.originalPriceValue,
  description: product.description ?? `Best seller product - ${product.name}`,
  shortDescription: product.shortDescription ?? "Top selling item",
});

const BestSellerSkeleton = ({ count }: { count: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="animate-pulse rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="h-56 bg-gray-200" />
        <div className="p-6 space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-6 bg-gray-200 rounded w-full" />
          <div className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
          </div>
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      </div>
    ))}
  </div>
);

interface BestSellerSliderProps {
  title?: string;
  subtitle?: string;
  autoScroll?: boolean;
  autoScrollInterval?: number;
}

export default function BestSellerSlider({
  title = "Best Sellers",
  subtitle = "Top selling products this month",
  autoScroll = true,
  autoScrollInterval = 5000,
}: BestSellerSliderProps) {
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

  // State variables
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [itemsPerView, setItemsPerView] = useState(4);
  const [products, setProducts] = useState<BestSellerProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Responsive items per view
  useEffect(() => {
    const updateItemsPerView = () => {
      const width = window.innerWidth;
      if (width < 640) return 1;
      if (width < 768) return 2;
      if (width < 1024) return 3;
      return 4;
    };
    
    setItemsPerView(updateItemsPerView());
    
    const handleResize = () => {
      setItemsPerView(updateItemsPerView());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch products dynamically
  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    const loadProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(PRODUCT_ENDPOINT, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load best sellers (${response.status})`);
        }

        const payload = await response.json();
        const fetched = Array.isArray(payload.products)
          ? payload.products
          : Array.isArray(payload.data)
          ? payload.data
          : [];

        const normalized = fetched.map(normalizeProductDoc);

        if (!isActive) return;
        setProducts(normalized);
      } catch (fetchError) {
        if (!isActive) return;
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load best sellers";
        setProducts([]);
        setError(message);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [reloadKey]);

  const handleRetry = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  // Cart and Wishlist Handlers
  const handleAddToCart = useCallback((product: BestSellerProduct) => {
    if ((product.inventory?.quantity ?? 0) <= 0) {
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

  const handleToggleWishlist = useCallback((product: BestSellerProduct) => {
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

  // Sort by sales count
  const sortedProducts = useMemo(() => 
    [...products].sort((a, b) => b.salesCount - a.salesCount), 
    [products]
  );

  // Adjust current index when items per view changes
  useEffect(() => {
    setCurrentIndex((prev) => {
      const max = Math.max(products.length - itemsPerView, 0);
      return Math.min(prev, max);
    });
  }, [products.length, itemsPerView]);

  const maxIndex = useMemo(
    () => Math.max(sortedProducts.length - itemsPerView, 0),
    [sortedProducts.length, itemsPerView]
  );

  const safeIndex = Math.min(currentIndex, maxIndex);
  const slideWidthPercent = 100 / itemsPerView;
  const translatePercent = safeIndex * slideWidthPercent;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(Math.min(index, maxIndex));
  }, [maxIndex]);

  // Auto-scroll
  useEffect(() => {
    if (!autoScroll) return;
    if (isHovered || isDragging) return;
    if (sortedProducts.length <= itemsPerView) return;

    const interval = setInterval(nextSlide, autoScrollInterval);
    return () => clearInterval(interval);
  }, [autoScroll, isHovered, isDragging, sortedProducts.length, itemsPerView, nextSlide, autoScrollInterval]);

  // Calculate total sales
  const totalSales = useMemo(() => 
    sortedProducts.reduce((sum, product) => sum + product.salesCount, 0), 
    [sortedProducts]
  );

  const averageRating = useMemo(() => {
    if (sortedProducts.length === 0) return 0;
    const total = sortedProducts.reduce((sum, product) => sum + product.rating, 0);
    return total / sortedProducts.length;
  }, [sortedProducts]);

  const skeletonCount = Math.min(Math.max(itemsPerView, 3), 6);
  const showSkeletons = isLoading && products.length === 0;
  const hasProducts = products.length > 0;

  // Product Card Component
  const ProductCard = ({ 
    product, 
    index 
  }: { 
    product: BestSellerProduct;
    index: number;
  }) => {
    const productInCart = isProductInCart(product.id);
    const productWishlisted = isProductWishlisted(product.id);
    const isOutOfStock = (product.inventory?.quantity ?? 0) <= 0;

    return (
      <motion.div
        className="group shrink-0"
        style={{ minWidth: `${slideWidthPercent}%` }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: (index % itemsPerView) * 0.1, duration: 0.6 }}
        whileHover={{ y: -8 }}
      >
        <Link href={`/products/${product.slug}`}>
          <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl 
                        transition-all duration-500 border border-gray-100 
                        overflow-hidden h-full flex flex-col backdrop-blur-sm">
            
            {/* Sales Rank Badge */}
            <div className="absolute top-4 left-4 z-10">
              <div className="relative">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl ${
                  index < 3 
                    ? 'bg-linear-to-r from-amber-500 to-orange-500'
                    : 'bg-linear-to-r from-gray-700 to-gray-900'
                }`}>
                  <span className="text-white font-bold text-sm">#{index + 1}</span>
                </div>
                {index < 3 && (
                  <motion.div
                    className="absolute -inset-2 rounded-full bg-linear-to-r from-amber-500/30 to-orange-500/30 blur-sm"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
            </div>

            {/* Product Image */}
            <div className="relative h-56 md:h-64 overflow-hidden bg-linear-to-br from-gray-50 to-gray-100/50">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-contain p-6 group-hover:scale-110 transition-transform duration-700 ease-out"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = FALLBACK_IMAGE;
                }}
              />

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
              <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="absolute inset-0 bg-linear-to-tr from-amber-500/5 via-transparent to-orange-500/5 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Sales Count Badge */}
              <div className="absolute bottom-4 left-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-linear-to-r from-green-500 to-emerald-600 
                             text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-sm">
                  <TrendingUp className="w-3 h-3" />
                  {product.salesCount.toLocaleString()} sold
                </div>
              </div>

              {/* Out of Stock Badge */}
              {isOutOfStock && (
                <div className="absolute top-20 right-4">
                  <div className="px-3 py-1.5 bg-gray-800 text-white text-xs font-bold rounded-full">
                    OUT OF STOCK
                  </div>
                </div>
              )}

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="absolute bottom-4 right-4 flex flex-col gap-1 items-end">
                  {product.tags.slice(0, 2).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-800 
                               rounded-full border border-gray-200 shadow-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">
                  {product.category}
                </span>
                <div className="flex items-center gap-1">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < Math.floor(product.rating)
                            ? "fill-amber-400 text-amber-400"
                            : "fill-gray-200 text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-gray-900 ml-1">
                    {product.rating.toFixed(1)}
                  </span>
                </div>
              </div>

              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 leading-tight line-clamp-2">
                {product.name}
              </h3>

              {/* Divider */}
              <div className="h-px bg-linear-to-r from-transparent via-amber-200 to-transparent mb-4" />

              {/* Price Section */}
              <div className="mt-auto space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500">Original</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-semibold text-gray-400 line-through">
                        ৳{product.originalPrice}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">Current</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl md:text-3xl font-bold text-amber-600">
                        ৳{product.currentPrice}
                      </span>
                    </div>
                  </div>
                </div>

                {product.discount && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 
                               bg-linear-to-r from-red-50 to-pink-50 rounded-xl border border-red-100">
                    <span className="text-sm font-medium text-red-600">
                      Save {product.discount}%
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-600">
                      Save ৳{(product.originalPriceValue - product.priceValue).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                  <motion.button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    whileHover={!isOutOfStock && !productInCart ? { scale: 1.02 } : {}}
                    whileTap={!isOutOfStock && !productInCart ? { scale: 0.98 } : {}}
                    className={`flex-1 py-3 font-semibold rounded-xl transition-all duration-300 
                             flex items-center justify-center gap-2 ${
                               isOutOfStock
                                 ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                 : productInCart
                                 ? "bg-green-100 text-green-700 hover:bg-green-200"
                                 : "bg-linear-to-r from-amber-500 to-orange-500 text-white hover:shadow-xl"
                             }`}
                    disabled={isOutOfStock || productInCart}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {isOutOfStock ? "Out of Stock" : productInCart ? "In Cart" : "Add to Cart"}
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Glow effect on hover */}
            <div className="absolute inset-0 rounded-2xl border-2 border-transparent 
                          group-hover:border-amber-400/20 transition-colors duration-300 
                          pointer-events-none" />
          </div>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="relative w-full bg-linear-to-b from-gray-50 to-amber-50/30 py-12 md:py-20 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              "radial-gradient(circle at 0% 0%, rgba(251, 191, 36, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 0%, rgba(249, 115, 22, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 100%, rgba(251, 191, 36, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 0%, rgba(251, 191, 36, 0.15) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Floating awards */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute opacity-10"
            style={{
              left: `${10 + i * 20}%`,
              top: `${20 + (i * 15) % 60}%`,
            }}
            animate={{
              rotate: [0, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 20 + i * 2,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <Trophy className="w-12 h-12 text-amber-500" />
          </motion.div>
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          {error && (
            <div className="mb-6 inline-flex items-center gap-3 rounded-2xl border border-red-200/70 bg-red-50 px-6 py-3 text-sm text-red-700">
              <span>{error}</span>
              <button
                onClick={handleRetry}
                className="text-red-600 underline-offset-2 hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          <div className="inline-flex items-center gap-2 mb-4">
            <div className="relative">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 bg-linear-to-r from-amber-500 via-orange-500 to-amber-500 rounded-full flex items-center justify-center shadow-2xl"
              >
                <Crown className="w-10 h-10 text-white" />
              </motion.div>
              <motion.div
                className="absolute -top-2 -right-2 w-10 h-10 bg-linear-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-sm text-white font-bold shadow-xl"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                #1
              </motion.div>
            </div>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 leading-tight">
            {title}
            <span className="block text-amber-600">Collection</span>
          </h2>
          
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            {subtitle}
          </p>

          {/* Stats Bar */}
          {!isLoading && hasProducts && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex flex-wrap items-center justify-center gap-4 md:gap-8 bg-white/80 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-lg border border-amber-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-linear-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{sortedProducts.length}</div>
                  <div className="text-sm text-gray-600">Best Sellers</div>
                </div>
              </div>

              <div className="h-8 w-px bg-linear-to-b from-transparent via-amber-200 to-transparent" />

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-linear-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
                  <div className="text-sm text-gray-600">Avg Rating</div>
                </div>
              </div>

              <div className="h-8 w-px bg-linear-to-b from-transparent via-amber-200 to-transparent" />

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-linear-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totalSales.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Sold</div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Slider Container */}
        <div className="relative">
          {showSkeletons ? (
            <BestSellerSkeleton count={skeletonCount} />
          ) : hasProducts ? (
            <>
              {/* Navigation Arrows */}
              <div className="hidden lg:block">
                <motion.button
                  onClick={prevSlide}
                  whileHover={{ scale: 1.1, x: -4 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-30
                           w-14 h-14 rounded-full backdrop-blur-xl 
                           bg-white/90 border border-gray-200/50
                           shadow-2xl flex items-center justify-center
                           hover:bg-white hover:border-amber-400/30
                           transition-all duration-300 cursor-pointer"
                  aria-label="Previous products"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-700" />
                </motion.button>

                <motion.button
                  onClick={nextSlide}
                  whileHover={{ scale: 1.1, x: 4 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-30
                           w-14 h-14 rounded-full backdrop-blur-xl 
                           bg-white/90 border border-gray-200/50
                           shadow-2xl flex items-center justify-center
                           hover:bg-white hover:border-amber-400/30
                           transition-all duration-300 cursor-pointer"
                  aria-label="Next products"
                >
                  <ChevronRight className="w-6 h-6 text-gray-700" />
                </motion.button>
              </div>

              {/* Slider Track */}
              <div 
                className="overflow-hidden px-2"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <motion.div
                  className="flex gap-6 md:gap-8 will-change-transform"
                  animate={{ x: `-${translatePercent}%` }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    mass: 1
                  }}
                  initial={false}
                  drag={sortedProducts.length > itemsPerView ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.08}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={(_, info) => {
                    setIsDragging(false);
                    const threshold = 60;
                    if (info.offset.x > threshold) prevSlide();
                    else if (info.offset.x < -threshold) nextSlide();
                  }}
                >
                  <AnimatePresence mode="wait">
                    {sortedProducts.map((product, index) => (
                      <ProductCard 
                        key={product.id} 
                        product={product}
                        index={index}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* Progress Indicators */}
              {sortedProducts.length > itemsPerView && (
                <div className="mt-10 flex flex-col items-center">
                  <div className="flex items-center gap-6">
                    {/* Navigation for mobile */}
                    <div className="flex items-center gap-2 lg:hidden">
                      <button
                        onClick={prevSlide}
                        className="p-3 rounded-full bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all"
                        aria-label="Previous"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-700" />
                      </button>
                      <button
                        onClick={nextSlide}
                        className="p-3 rounded-full bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all"
                        aria-label="Next"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                      </button>
                    </div>

                    {/* Position indicator */}
                    <div className="text-center">
                      <div className="text-sm font-semibold text-gray-700">
                        Position {safeIndex + 1} of {maxIndex + 1}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Showing {Math.min(itemsPerView, sortedProducts.length - safeIndex)} of {sortedProducts.length} products
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white/70 p-8 text-center shadow-md">
              <p className="mb-4 text-sm text-gray-500">
                No best sellers available at the moment.
              </p>
              <button
                onClick={handleRetry}
                className="inline-flex items-center justify-center rounded-full bg-linear-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.01]"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* View All Button */}
        {hasProducts && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-12 md:mt-16"
          >
            <Link
              href="/products?sort=bestseller"
              className="group inline-flex items-center gap-3 px-8 py-4 
                       bg-linear-to-r from-amber-500 to-orange-500 text-white font-bold text-lg 
                       rounded-full hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <Award className="w-5 h-5" />
              View All Best Sellers
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
            
            <p className="mt-4 text-sm text-gray-600">
              Join {totalSales.toLocaleString()}+ satisfied customers who love our best sellers
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
