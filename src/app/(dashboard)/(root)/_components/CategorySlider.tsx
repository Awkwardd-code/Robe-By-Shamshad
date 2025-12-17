"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type KeyboardEvent,
  type TouchEvent,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Star, Sparkles, ArrowRight } from "lucide-react";

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  image: string;
  productCount: number;
  description?: string;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1544441893-675973e31985?w=400&h=400&fit=crop";

interface CategorySliderProps {
  categories: CategoryItem[];
  autoPlayInterval?: number;
  title?: string;
  description?: string;
  isLoading?: boolean; // optional: let parent show skeleton while server fetches (usually not needed)
}

export default function CategorySlider({
  categories,
  autoPlayInterval = 5000,
  title = "Shop By Category",
  description = "Browse through our extensive collection of categories",
  isLoading = false,
}: CategorySliderProps) {
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Responsive items per view
  const getItemsPerView = () => {
    if (typeof window === "undefined") return 4;
    const width = window.innerWidth;
    if (width < 640) return 1; // Mobile
    if (width < 768) return 2; // Tablet
    if (width < 1024) return 3; // Laptop
    return 4; // Desktop
  };

  const [itemsPerView, setItemsPerView] = useState(getItemsPerView());

  useEffect(() => {
    const handleResize = () => setItemsPerView(getItemsPerView());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleCategorySelect = useCallback(
    (categorySlug: string) => {
      router.push(`/products?category=${encodeURIComponent(categorySlug)}`);
    },
    [router]
  );

  const handleCardKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, categorySlug: string) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleCategorySelect(categorySlug);
      }
    },
    [handleCategorySelect]
  );

  const slideCategories = categories ?? [];

  const maxIndex = useMemo(
    () => Math.max(slideCategories.length - itemsPerView, 0),
    [slideCategories.length, itemsPerView]
  );

  // keep index valid when resizing or categories length changes
  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  const safeIndex = Math.min(currentIndex, maxIndex);
  const slideWidthPercent = 100 / itemsPerView;
  const translatePercent = safeIndex * slideWidthPercent;
  const skeletonCount = Math.max(itemsPerView, 4);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  const goToSlide = useCallback(
    (index: number) => {
      setCurrentIndex(Math.min(index, maxIndex));
    },
    [maxIndex]
  );

  // Touch handlers
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsAutoPlaying(false);
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) nextSlide();
    if (isRightSwipe) prevSlide();

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Auto-play
  useEffect(() => {
    if (!isAutoPlaying || slideCategories.length <= itemsPerView || isHovering) return;
    const interval = setInterval(nextSlide, autoPlayInterval);
    return () => clearInterval(interval);
  }, [isAutoPlaying, nextSlide, autoPlayInterval, slideCategories.length, itemsPerView, isHovering]);

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
    }),
  };

  return (
    <div
      className="relative w-4/5 mx-auto py-10 md:py-16 overflow-hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              "radial-gradient(circle at 0% 50%, rgba(201, 169, 110, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 50%, rgba(212, 175, 55, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 50% 0%, rgba(183, 110, 121, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 50%, rgba(201, 169, 110, 0.1) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Header */}
      <div className="relative mb-12 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 mb-3"
        >
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span className="text-sm font-semibold text-amber-600 uppercase tracking-wider">
            Collections
          </span>
          <Sparkles className="w-5 h-5 text-amber-500" />
        </motion.div>

        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
          <span className="bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
            {title}
          </span>
        </h2>

        <p className="text-gray-600 max-w-2xl mx-auto text-lg">{description}</p>
      </div>

      {/* Slider */}
      <div className="relative px-4 sm:px-6 lg:px-8">
        <div className="relative py-8">
          <div
            className="overflow-hidden px-4 md:px-0"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {isLoading ? (
              <div className="flex gap-4 md:gap-6 lg:gap-8">
                {Array.from({ length: skeletonCount }).map((_, idx) => (
                  <div
                    key={`skeleton-${idx}`}
                    className="relative shrink-0 rounded-3xl border border-gray-100 bg-white/50 shadow-inner"
                    style={{ minWidth: `${slideWidthPercent}%` }}
                  >
                    <div className="h-40 md:h-48 lg:h-56 overflow-hidden rounded-t-3xl bg-gray-200/70 animate-pulse" />
                    <div className="p-6 md:p-8 space-y-3 animate-pulse">
                      <div className="h-6 w-3/4 rounded-full bg-gray-200" />
                      <div className="h-4 w-full rounded-full bg-gray-200/80" />
                      <div className="h-3 w-1/2 rounded-full bg-gray-200/60" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <motion.div
                className="flex gap-4 md:gap-6 lg:gap-8 will-change-transform touch-none relative"
                animate={{ x: `-${translatePercent}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30, mass: 1 }}
              >
                <AnimatePresence mode="wait">
                  {slideCategories.map((category, index) => (
                    <motion.div
                      key={category.id}
                      className="relative group shrink-0"
                      style={{ minWidth: `${slideWidthPercent}%` }}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      custom={index % itemsPerView}
                      whileHover={{ y: -8 }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleCategorySelect(category.slug)}
                        onKeyDown={(event) => handleCardKeyDown(event, category.slug)}
                        aria-label={`Explore ${category.name} collection`}
                        className="relative overflow-hidden rounded-3xl bg-white shadow-lg
                                  hover:shadow-2xl transition-all duration-500
                                  group-hover:shadow-amber-100/50 border border-gray-100
                                  h-full flex flex-col cursor-pointer"
                      >
                        <div className="relative h-40 md:h-48 lg:h-56 overflow-hidden rounded-t-3xl">
                          <Image
                            src={category.image || FALLBACK_IMAGE}
                            alt={category.name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          />

                          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="absolute top-4 right-4 backdrop-blur-xl bg-white/90 px-4 py-2 rounded-full shadow-lg"
                          >
                            <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                              <span className="text-amber-600">{category.productCount}</span>
                              <span className="text-gray-600">items</span>
                            </span>
                          </motion.div>

                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full text-gray-900 font-semibold shadow-xl"
                            >
                              Shop Now <ArrowRight className="w-4 h-4" />
                            </motion.span>
                          </div>
                        </div>

                        <div className="p-6 md:p-8 flex-1 flex flex-col">
                          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 line-clamp-1">
                            {category.name}
                          </h3>

                          {category.description && (
                            <p className="text-gray-600 mb-6 flex-1 line-clamp-2">
                              {category.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                            <span className="text-sm font-semibold text-amber-600 group-hover:text-amber-700 transition-colors flex items-center gap-2">
                              Explore Collection
                              <motion.span
                                animate={{ x: [0, 4, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              >
                                <ArrowRight className="w-4 h-4" />
                              </motion.span>
                            </span>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                ))}
                              </div>
                              <span className="text-sm font-medium text-gray-700">4.5</span>
                            </div>
                          </div>
                        </div>

                        <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-amber-400/30 transition-colors duration-300 pointer-events-none" />
                        <div className="absolute inset-0 rounded-3xl shadow-inner opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </div>

                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-1 h-1 rounded-full bg-amber-400/30"
                          style={{ top: `${20 + i * 20}%`, left: `${10 + i * 40}%` }}
                          animate={{ y: [0, -10, 0], opacity: [0.3, 0.8, 0.3] }}
                          transition={{ duration: 2 + i, repeat: Infinity, delay: i * 0.5 }}
                        />
                      ))}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          <div className="flex justify-center mt-10">
            <div className="flex items-center gap-2">
              {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className="relative group cursor-pointer"
                  aria-label={`Go to slide ${idx + 1}`}
                >
                  <div
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      idx === safeIndex ? "bg-amber-600 w-8" : "bg-gray-300 hover:bg-gray-400"
                    }`}
                  />
                  {idx === safeIndex && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute inset-0 rounded-full bg-amber-600"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
