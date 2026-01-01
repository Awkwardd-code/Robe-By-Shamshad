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
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

// NOTE: No static category labels. Everything uses your incoming `categories` data.

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  image: string;
  productCount: number;
  description?: string;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1544441893-675973e31985?w=800&h=500&fit=crop";

interface CategorySliderProps {
  categories?: CategoryItem[];
  title?: string;
  autoPlayInterval?: number;
  isLoading?: boolean;
}

// Reference-like tile gradients (instead of flat colors)
const PASTEL_GRADIENTS = [
  "linear-gradient(135deg, #BDDCE7 0%, #F7F0DC 100%)",
  "linear-gradient(135deg, #FCD2DC 0%, #F7F0DC 100%)",
  "linear-gradient(135deg, #A2CFE8 0%, #F7F0DC 100%)",
  "linear-gradient(135deg, #FCD2DC 0%, #F7F0DC 100%)",
];

// Tiny helper: subtle shadow under product cutout feel
const shadowStyle =
  "drop-shadow-[0_18px_22px_rgba(0,0,0,0.18)] drop-shadow-[0_6px_10px_rgba(0,0,0,0.12)]";

function MiniTileSkeleton({
  count,
  itemsPerView,
}: {
  count: number;
  itemsPerView: number;
}) {
  const safeItemsPerView = Math.max(itemsPerView, 1);
  const tileWidthPercent = 100 / safeItemsPerView;
  const gapOffset = safeItemsPerView > 1 ? 12 : 0;

  return (
    <div className="w-full overflow-hidden">
      <div className="flex gap-0 sm:gap-3 md:gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="relative shrink-0 overflow-hidden rounded-xl"
            style={{
              minWidth: `calc(${tileWidthPercent}% - ${gapOffset}px)`,
              backgroundImage: PASTEL_GRADIENTS[i % PASTEL_GRADIENTS.length],
              height: 150,
            }}
          >
            <div className="absolute left-3 top-3">
              <div className="h-4 w-20 bg-black/10 rounded-sm animate-pulse" />
              <div className="mt-1 h-2 w-14 bg-black/10 rounded-sm animate-pulse" />
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-20 w-28 bg-black/10 rounded-xl animate-pulse" />
            </div>

            <div className="absolute inset-0">
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
                }}
                animate={{ x: ["-120%", "120%"] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            <div className="absolute inset-0 border border-black/5 pointer-events-none" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-xl border border-black/5"
          style={{
            backgroundImage: PASTEL_GRADIENTS[i % PASTEL_GRADIENTS.length],
          }}
        >
          <div className="aspect-3/2 w-full">
            <div className="absolute left-3 top-3">
              <div className="h-4 w-20 bg-black/10 rounded-sm animate-pulse" />
              <div className="mt-1 h-2 w-14 bg-black/10 rounded-sm animate-pulse" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-20 w-28 bg-black/10 rounded-xl animate-pulse" />
            </div>
            <div className="absolute inset-0">
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
                }}
                animate={{ x: ["-120%", "120%"] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryTile({
  category,
  bg,
  onSelect,
  onKeyDown,
}: {
  category: CategoryItem;
  bg: string;
  onSelect: (slug: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>, slug: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(category.slug)}
      onKeyDown={(event) => onKeyDown(event, category.slug)}
      aria-label={`Open ${category.name}`}
      className="group relative w-full overflow-hidden cursor-pointer rounded-xl border border-black/5"
      style={{ backgroundImage: bg }}
    >
      {/* Use aspect ratio to match the reference tile shape */}
      <div className="aspect-3/2 w-full">
        {/* Top-left "logo lockup" */}
        <div className="absolute left-3 top-3 z-10 leading-none">
          <div
            className="text-[13px] sm:text-[14px] font-black uppercase tracking-tight text-black/90"
            style={{ letterSpacing: "-0.02em" }}
          >
            {category.name}
          </div>
          <div className="mt-0.5 text-[8px] uppercase tracking-[0.45em] text-black/70">
            {String(category.productCount).padStart(2, "0")} ITEMS
          </div>
        </div>

        {/* Product image: large, centered, editorial crop */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-[78%] w-[92%]">
            <Image
              src={category.image || FALLBACK_IMAGE}
              alt={category.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={`object-contain ${shadowStyle} transition-transform duration-500 ease-out group-hover:scale-[1.03]`}
            />
          </div>
        </div>

        {/* Hover overlay (desktop hover + mobile tap/press) */}
        <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-active:opacity-100">
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent,rgba(255,255,255,0.10),transparent)]" />

          <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
            <div className="max-w-[90%] text-white">
              <div className="text-sm sm:text-base font-extrabold uppercase tracking-wider">
                {category.name}
              </div>

              {category.description ? (
                <div className="mt-2 text-xs sm:text-sm text-white/90 line-clamp-2">
                  {category.description}
                </div>
              ) : (
                <div className="mt-2 text-xs sm:text-sm text-white/90">
                  {category.productCount} products available
                </div>
              )}

              <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] sm:text-xs font-semibold text-black">
                Shop now
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CategorySlider({
  categories,
  title,
  autoPlayInterval = 5000,
  isLoading = false,
}: CategorySliderProps) {
  const router = useRouter();

  const [remoteCategories, setRemoteCategories] = useState<CategoryItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // slider state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  // mobile detection for grid layout
  const [isMobile, setIsMobile] = useState(false);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const getItemsPerView = () => {
    if (typeof window === "undefined") return 4;
    const width = window.innerWidth;
    if (width < 640) return 2;
    if (width < 768) return 2;
    if (width < 1024) return 3;
    return 4;
  };

  const [itemsPerView, setItemsPerView] = useState(getItemsPerView());

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setItemsPerView(getItemsPerView());
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const shouldFetch = categories === undefined;
  const slideCategories = shouldFetch ? remoteCategories : categories ?? [];
  const isLoadingResolved = isLoading || (shouldFetch && isFetching);

  useEffect(() => {
    if (!shouldFetch) return;

    let cancelled = false;
    const controller = new AbortController();

    const loadCategories = async () => {
      setIsFetching(true);
      try {
        const response = await fetch("/api/categories?limit=12", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load categories (${response.status})`);
        }

        const payload = await response.json();
        const list = Array.isArray(payload?.categories) ? payload.categories : [];

        const mapped = list
          .map((category: any, index: number) => {
            const slug =
              typeof category?.slug === "string" ? category.slug.trim() : "";
            if (!slug) return null;

            const rawId = category?._id;
            const id =
              typeof rawId === "string"
                ? rawId
                : rawId?.toString?.() ?? rawId?.$oid ?? slug ?? `category-${index}`;

            const image =
              typeof category?.image === "string" && category.image.trim()
                ? category.image
                : FALLBACK_IMAGE;

            const name =
              typeof category?.name === "string" && category.name.trim()
                ? category.name
                : slug;

            const productCount = Number.isFinite(category?.productCount)
              ? Number(category.productCount)
              : 0;

            const description =
              typeof category?.description === "string" &&
              category.description.trim()
                ? category.description
                : undefined;

            return {
              id,
              name,
              slug,
              image,
              productCount,
              description,
            } satisfies CategoryItem;
          })
          .filter(Boolean) as CategoryItem[];

        if (!cancelled) setRemoteCategories(mapped);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load categories for slider:", error);
          setRemoteCategories([]);
        }
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    };

    void loadCategories();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [shouldFetch]);

  const maxIndex = useMemo(
    () => Math.max(slideCategories.length - itemsPerView, 0),
    [slideCategories.length, itemsPerView]
  );

  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  const safeIndex = Math.min(currentIndex, maxIndex);
  const slideWidthPercent = 100 / itemsPerView;
  const translatePercent = safeIndex * slideWidthPercent;

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

  // Touch handlers (slider only)
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

  // Auto-play (slider only)
  useEffect(() => {
    if (isMobile) return;
    if (!isAutoPlaying || slideCategories.length <= itemsPerView || isHovering)
      return;
    const interval = setInterval(nextSlide, autoPlayInterval);
    return () => clearInterval(interval);
  }, [
    isMobile,
    isAutoPlaying,
    nextSlide,
    autoPlayInterval,
    slideCategories.length,
    itemsPerView,
    isHovering,
  ]);

  // Mobile: render a 2x2 grid like the reference (first 4 categories)
  const mobileGridItems = useMemo(
    () => slideCategories.slice(0, 4),
    [slideCategories]
  );

  return (
    <section
      className="relative w-full pt-6 pb-8 md:pt-7 md:pb-10 overflow-hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      aria-label="Category strip"
    >
      {title ? (
        <div className="px-4 sm:px-6 mb-4 md:mb-5">
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-wide text-[#1F1B18]">
            {title}
          </h2>
        </div>
      ) : null}

      <div className="relative px-4 sm:px-6">
        {/* ===== MOBILE GRID (Reference-style 2x2) ===== */}
        {isMobile ? (
          isLoadingResolved ? (
            <MiniGridSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {mobileGridItems.map((category, index) => {
                // alternate like the reference columns
                const bg =
                  PASTEL_GRADIENTS[index % PASTEL_GRADIENTS.length] ??
                  PASTEL_GRADIENTS[0];

                return (
                  <CategoryTile
                    key={category.id}
                    category={category}
                    bg={bg}
                    onSelect={handleCategorySelect}
                    onKeyDown={handleCardKeyDown}
                  />
                );
              })}
            </div>
          )
        ) : (
          // ===== DESKTOP/TABLET SLIDER (existing behavior) =====
          <div
            className="overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {isLoadingResolved ? (
              <MiniTileSkeleton
                count={itemsPerView === 1 ? 1 : Math.max(itemsPerView, 4)}
                itemsPerView={itemsPerView}
              />
            ) : (
              <motion.div
                className="flex gap-0 sm:gap-3 md:gap-4 will-change-transform touch-none"
                animate={{ x: `-${translatePercent}%` }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  mass: 1,
                }}
              >
                {slideCategories.map((category, index) => {
                  const bg =
                    PASTEL_GRADIENTS[index % PASTEL_GRADIENTS.length] ??
                    PASTEL_GRADIENTS[0];

                  return (
                    <motion.div
                      key={category.id}
                      className="relative shrink-0"
                      style={{ minWidth: `${slideWidthPercent}%` }}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CategoryTile
                        category={category}
                        bg={bg}
                        onSelect={handleCategorySelect}
                        onKeyDown={handleCardKeyDown}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        )}

        {/* Indicators (slider only) */}
        {!isMobile && !isLoadingResolved && maxIndex > 0 && (
          <div className="mt-6 flex justify-center">
            <div className="flex items-center gap-2">
              {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  aria-label={`Go to position ${idx + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    idx === safeIndex
                      ? "w-8 bg-black/70"
                      : "w-2 bg-black/20 hover:bg-black/35"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
