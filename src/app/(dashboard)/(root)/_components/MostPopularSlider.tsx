"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  ShoppingBag, 
  Sparkles, 
  Zap, 
  TrendingUp, 
  Heart 
} from "lucide-react";
import { useCommerce } from "@/context/CommerceContext";
import type { Product as CommerceProduct } from "@/context/CommerceContext";

interface PopularProduct {
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
  isNew?: boolean;
  isBestseller?: boolean;
  inventory?: { quantity: number; status: string };
}

const PRODUCT_ENDPOINT = "/api/products?limit=10";
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&h=300&fit=crop";

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

const normalizeProductDoc = (doc: any): PopularProduct => {
  const slug = doc?.slug || doc?._id?.toString() || "product";
  const current = safeNumber(doc?.pricing?.current?.value, 0);
  const original = safeNumber(doc?.pricing?.original?.value, current);
  const discount =
    original > 0 && current < original
      ? Math.round(((original - current) / original) * 100).toString()
      : undefined;

  return {
    id: doc?._id?.toString() || slug,
    name: doc?.name || "Untitled Product",
    slug,
    image:
      doc?.media?.thumbnail ||
      doc?.media?.gallery?.[0] ||
      FALLBACK_IMAGE,
    originalPrice: formatCurrencyValue(Math.max(original, current)),
    currentPrice: formatCurrencyValue(current),
    priceValue: current,
    originalPriceValue: Math.max(original, current),
    discount,
    rating: safeNumber(doc?.ratings?.averageRating, 4.5),
    reviewCount: safeNumber(doc?.ratings?.totalReviews, 0),
    category: doc?.category || doc?.categoryDetails?.name || "Products",
    isNew: Boolean(doc?.isNew),
    isBestseller: Boolean(doc?.isBestseller),
    inventory: doc?.inventory || { quantity: 10, status: "in_stock" }
  };
};

const toCommerceProduct = (product: PopularProduct): CommerceProduct => {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    image: product.image,
    price: product.priceValue,
    oldPrice: product.originalPriceValue,
    category: product.category,
    description: "Popular product - " + product.name,
    shortDescription: "Trending item"
  };
};

const MostPopularSliderSkeleton = ({ count }: { count: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="animate-pulse rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="h-56 bg-gray-200" />
        <div className="p-5 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-5 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-12 bg-gray-200 rounded" />
        </div>
      </div>
    ))}
  </div>
);

interface MostPopularSliderProps {
  title?: string;
  autoScroll?: boolean;
  autoScrollInterval?: number;
}

export default function MostPopularSlider({
  title = "Most Popular",
  autoScroll = true,
  autoScrollInterval = 5000,
}: MostPopularSliderProps) {
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
  const [products, setProducts] = useState<PopularProduct[]>([]);
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

  // Fetch products
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
          throw new Error(`Failed to load products (${response.status})`);
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
            : "Failed to load products";
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

  // Adjust current index when items per view changes
  useEffect(() => {
    setCurrentIndex((prev) => {
      const max = Math.max(products.length - itemsPerView, 0);
      return Math.min(prev, max);
    });
  }, [products.length, itemsPerView]);

  const maxIndex = useMemo(
    () => Math.max(products.length - itemsPerView, 0),
    [products.length, itemsPerView]
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
    if (products.length <= itemsPerView) return;

    const interval = setInterval(nextSlide, autoScrollInterval);
    return () => clearInterval(interval);
  }, [autoScroll, isHovered, isDragging, products.length, itemsPerView, nextSlide, autoScrollInterval]);

  // Cart and Wishlist Handlers
  const handleAddToCart = useCallback((product: PopularProduct) => {
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

  const handleToggleWishlist = useCallback((product: PopularProduct) => {
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

  // Dots for pagination
  const totalDots = useMemo(() => {
    if (products.length <= itemsPerView) return 1;
    return Math.ceil(products.length / itemsPerView);
  }, [products.length, itemsPerView]);

  const activeDot = Math.min(Math.floor(safeIndex / itemsPerView), totalDots - 1);

  const showSkeletons = isLoading && products.length === 0;
  const hasProducts = products.length > 0;
  const skeletonCount = Math.min(Math.max(itemsPerView, 3), 6);
  const showError = Boolean(error) && !isLoading;

  // Product Card Component
  const ProductCard = ({ 
    product, 
    index 
  }: { 
    product: PopularProduct;
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
        transition={{ delay: index * 0.1, duration: 0.6 }}
        whileHover={{ y: -8 }}
      >
        <Link href={`/products/${product.slug}`}>
          <div className="relative bg-white rounded-3xl shadow-lg 
                        hover:shadow-2xl transition-all duration-500 
                        border border-gray-100 overflow-hidden h-full
                        flex flex-col backdrop-blur-sm">
            
            {/* Product Image with Effects */}
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
                className="absolute top-4 right-16 z-10 w-10 h-10 rounded-full 
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

              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="absolute inset-0 bg-linear-to-tr from-amber-500/5 via-transparent to-orange-500/5 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.isNew && (
                  <motion.span
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 
                             bg-linear-to-r from-blue-500 to-cyan-500 
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
                    className="inline-flex items-center gap-1 px-3 py-1.5 
                             bg-linear-to-r from-amber-500 to-orange-500 
                             text-white text-xs font-bold rounded-full shadow-lg"
                  >
                    <TrendingUp className="w-3 h-3" />
                    BESTSELLER
                  </motion.span>
                )}
              </div>

              {/* Discount Badge */}
              {product.discount && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="absolute top-4 right-4"
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-linear-to-br from-red-500 to-pink-500 
                                  flex items-center justify-center text-white font-bold text-sm
                                  shadow-xl">
                      -{product.discount}%
                    </div>
                    <div className="absolute -inset-1 rounded-full bg-red-500/30 blur-sm" />
                  </div>
                </motion.div>
              )}

              {/* Out of Stock Badge */}
              {isOutOfStock && (
                <div className="absolute top-20 right-4">
                  <div className="px-3 py-1.5 bg-gray-800 text-white text-xs font-bold rounded-full">
                    OUT OF STOCK
                  </div>
                </div>
              )}

              {/* Quick View Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 
                            group-hover:opacity-100 transition-opacity duration-500">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm 
                           px-6 py-3 rounded-full text-gray-900 font-semibold shadow-xl"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Quick View
                </motion.div>
              </div>
            </div>

            {/* Product Info */}
            <div className="p-6 flex-1 flex flex-col">
              <div className="mb-3">
                <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">
                  {product.category}
                </span>
              </div>

              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 leading-tight line-clamp-2">
                {product.name}
              </h3>

              {/* Price Section */}
              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    {product.originalPriceValue > product.priceValue && (
                      <span className="text-xs text-gray-500 line-through">
                        ৳{product.originalPrice}
                      </span>
                    )}
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl md:text-3xl font-bold text-gray-900">
                        ৳{product.currentPrice}
                      </span>
                      {product.originalPriceValue > product.priceValue && (
                        <span className="text-xs text-green-600 font-semibold">
                          You save ৳{(product.originalPriceValue - product.priceValue).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rating and Reviews with Cart Button */}
              <div className="mt-auto pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
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
                        {product.reviewCount} reviews
                      </span>
                    </div>
                  </div>

                  <motion.button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    whileHover={!isOutOfStock && !productInCart ? { scale: 1.05 } : {}}
                    whileTap={!isOutOfStock && !productInCart ? { scale: 0.95 } : {}}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg 
                             transition-all duration-300 ${
                               isOutOfStock
                                 ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                 : productInCart
                                 ? "bg-green-100 text-green-700 hover:bg-green-200"
                                 : "bg-linear-to-r from-gray-900 to-gray-800 text-white hover:shadow-lg"
                             }`}
                    disabled={isOutOfStock || productInCart}
                  >
                    {isOutOfStock ? "Out of Stock" : productInCart ? "In Cart" : "Add to Cart"}
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Glow Effects */}
            <div className="absolute inset-0 rounded-3xl border-2 border-transparent 
                          group-hover:border-amber-400/20 transition-colors duration-300 
                          pointer-events-none" />
            
            <div className="absolute inset-0 rounded-3xl shadow-inner opacity-0 
                          group-hover:opacity-100 transition-opacity duration-300 
                          pointer-events-none" />
          </div>
        </Link>

        {/* Product Hover Particles */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-linear-to-r from-amber-400/30 to-orange-400/30"
            style={{
              top: `${10 + i * 25}%`,
              left: `${5 + i * 30}%`,
            }}
            animate={{
              y: [0, -15, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 2 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.4,
            }}
          />
        ))}
      </motion.div>
    );
  };

  return (
    <div className="relative w-full bg-linear-to-b from-gray-50 to-white py-12 md:py-20 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{
            background: [
              "radial-gradient(circle at 0% 0%, rgba(251, 191, 36, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 0%, rgba(249, 115, 22, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 100%, rgba(251, 191, 36, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 0%, rgba(251, 191, 36, 0.1) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Floating elements */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-linear-to-r from-amber-400/20 to-orange-400/20"
            style={{
              left: `${(i * 15) % 100}%`,
              top: `${(i * 12) % 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 md:mb-16 gap-6"
        >
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-semibold text-amber-600 uppercase tracking-wider">
                Trending Now
              </span>
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            
            <div className="flex items-center gap-4">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                {title}
                <span className="block text-amber-600">Products</span>
              </h2>
              
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="hidden lg:block"
              >
                <div className="w-20 h-20 rounded-full border-2 border-amber-200/50 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-amber-500" />
                </div>
              </motion.div>
            </div>
            
            <div className="mt-4 max-w-2xl">
              <p className="text-gray-600 text-lg">
                Discover our best-selling products loved by thousands of customers worldwide
              </p>
            </div>
          </div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="lg:self-start"
          >
            <Link
              href="/products?sort=popular"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full 
                       bg-linear-to-r from-amber-500 to-orange-500 
                       text-white font-semibold shadow-lg hover:shadow-xl 
                       transition-all duration-300 group"
            >
              <ShoppingBag className="w-5 h-5" />
              Shop All Products
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ChevronRight className="w-5 h-5" />
              </motion.span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Slider Container */}
        <div className="relative">
          {showError && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-200/70 bg-red-50 px-6 py-4 text-sm text-red-700">
              <span>{error}</span>
              <button
                onClick={handleRetry}
                className="text-red-600 underline-offset-2 hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {showSkeletons ? (
            <MostPopularSliderSkeleton count={skeletonCount} />
          ) : hasProducts ? (
            <div>
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
                  drag={products.length > itemsPerView ? "x" : false}
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
                    {products.map((product, index) => (
                      <ProductCard 
                        key={product.id} 
                        product={product}
                        index={index}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white/70 p-8 text-center shadow-md">
              <p className="mb-4 text-sm text-gray-500">
                No popular products available at the moment.
              </p>
              <button
                onClick={handleRetry}
                className="inline-flex items-center justify-center rounded-full bg-linear-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.01]"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Progress Indicators */}
          {products.length > itemsPerView && (
            <div className="mt-10 flex flex-col items-center">
              <div className="relative w-full max-w-2xl">
                <div className="h-px bg-linear-to-r from-transparent via-gray-200 to-transparent" />
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex items-center gap-8">
                    {/* Navigation for mobile */}
                    <div className="flex items-center gap-2 lg:hidden">
                      <button
                        onClick={prevSlide}
                        className="p-2 rounded-full bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all"
                        aria-label="Previous"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-700" />
                      </button>
                      <button
                        onClick={nextSlide}
                        className="p-2 rounded-full bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all"
                        aria-label="Next"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                      </button>
                    </div>

                    {/* Dots */}
                    <div className="flex items-center gap-2">
                      {Array.from({ length: totalDots }).map((_, dot) => (
                        <button
                          key={dot}
                          onClick={() => goToSlide(dot * itemsPerView)}
                          className="relative group"
                          aria-label={`Go to slide ${dot + 1}`}
                        >
                          <div className={`h-2 rounded-full transition-all duration-300 ${
                            dot === activeDot 
                              ? 'w-8' 
                              : 'w-2 bg-gray-300 hover:bg-gray-400'
                          }`} />
                          {dot === activeDot && (
                            <motion.div
                              layoutId="popularSliderIndicator"
                              className="absolute inset-0 rounded-full bg-linear-to-r from-amber-500 to-orange-500"
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          )}
                          {/* Glow effect */}
                          {dot === activeDot && (
                            <motion.div
                              className="absolute -inset-1 rounded-full bg-linear-to-r from-amber-500/30 to-orange-500/30 blur-sm"
                              animate={{ opacity: [0.3, 0.6, 0.3] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* View Counter */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-center"
              >
                <span className="text-sm text-gray-500">
                  Showing {safeIndex + 1}-{Math.min(safeIndex + itemsPerView, products.length)} of {products.length} products
                </span>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
