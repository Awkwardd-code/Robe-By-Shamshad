/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  animate,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Poppins, Great_Vibes, Playfair_Display, Cormorant_Garamond } from "next/font/google";

// ===== Fonts (close to reference) =====
const headlineFont = Poppins({ subsets: ["latin"], weight: ["700", "800"] });
const bodyFont = Poppins({ subsets: ["latin"], weight: ["300", "400", "500"] });
const brandScript = Great_Vibes({ subsets: ["latin"], weight: ["400"] });
const titleFont = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });
const descFont = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500"] });

type HomeSlide = {
  id: string;
  image: string;
  title: string; // <-- use this in center
  subtitle: string; // <-- use this as desc/description in center
  ctaText: string;
  ctaLink: string;
  brandText?: string;
  brandImage?: string;
};

const SLIDE_MS = 8000;
const FALLBACK_BANNER_IMAGE =
  "https://images.unsplash.com/photo-1503342481797-1b6e3bd5f763?w=1600&h=900&fit=crop";

// ===== Theme tokens to “maintain colors” =====
const THEME = {
  frameBg: "#A9876F", // warm beige
  gold: "rgba(212,175,55,0.9)",
  goldLine: "rgba(212,175,55,0.55)",
  overlayTop: "rgba(0,0,0,0.08)",
  overlayBottom: "rgba(0,0,0,0.18)",
  vignette: "rgba(0,0,0,0.28)",
  ctaRed: "#C52B2B",
};

// ===== Decorative hanging shapes (like the reference banner) =====
function HangingDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* Left hanging crescent */}
      <div className="absolute left-6 top-2 md:left-10 md:top-4">
        <svg width="92" height="160" viewBox="0 0 92 160" fill="none" aria-hidden>
          <path d="M46 0 V78" stroke={THEME.goldLine} strokeWidth="2" />
          <path
            d="M62 86c-10 5-16 16-16 28 0 17 13 30 30 30 4 0 8-1 12-3-5 15-18 25-35 25-22 0-40-18-40-40 0-20 14-36 33-39 5-1 10-1 16-1z"
            fill={THEME.gold}
          />
          <path
            d="M76 130l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z"
            fill="rgba(212,175,55,0.8)"
          />
        </svg>
      </div>

      {/* Right hanging star */}
      <div className="absolute right-6 top-2 md:right-10 md:top-4">
        <svg width="92" height="160" viewBox="0 0 92 160" fill="none" aria-hidden>
          <path d="M46 0 V78" stroke={THEME.goldLine} strokeWidth="2" />
          <path
            d="M46 92l6 14 14 6-14 6-6 14-6-14-14-6 14-6 6-14z"
            fill={THEME.gold}
          />
        </svg>
      </div>
    </div>
  );
}

// ===== Eid-style geometric background layer =====
function EidGeometricBg() {
  return (
    <div className="absolute inset-0 z-10">
      <div className="absolute inset-0" style={{ backgroundColor: THEME.frameBg }} />
      <div
        className="absolute inset-0 opacity-25 mix-blend-overlay"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(60deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          backgroundPosition: "0 0, 8px 12px",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle_at_center, transparent 40%, rgba(0,0,0,0.28) 100%)",
        }}
      />
    </div>
  );
}

// ===== Proper skeleton (correct aspect ratio + size, matching colors) =====
function EidSliderSkeleton() {
  return (
    <section
      className="relative z-0 mt-3 w-full overflow-hidden rounded-2xl lg:rounded-3xl shadow-2xl md:mt-0 aspect-4/3 md:aspect-22/9"
      style={{ backgroundColor: THEME.frameBg }}
    >
      <EidGeometricBg />
      <HangingDecor />

      {/* shimmer */}
      <div className="absolute inset-0 z-30 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
          }}
          animate={{ x: ["-120%", "120%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* content placeholders (title + desc center bottom like reference) */}
      <div className="absolute inset-0 z-40 flex items-end justify-center pb-10 md:pb-12 px-4">
        <div className="w-full max-w-3xl text-center">
          <div className="mx-auto h-10 sm:h-12 md:h-14 w-[70%] rounded-md bg-white/18" />
          <div className="mx-auto mt-4 h-4 sm:h-5 w-[46%] rounded bg-white/14" />
        </div>
      </div>

      {/* CTA placeholder bottom-right */}
      <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 z-40">
        <div
          className="h-10 md:h-11 w-28 md:w-32 rounded-md"
          style={{ backgroundColor: "rgba(197,43,43,0.55)" }}
        />
      </div>

      {/* brand placeholder bottom-left */}
      <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 z-40">
        <div className="h-8 w-40 rounded bg-white/12" />
      </div>

      {/* arrows placeholders */}
      <div className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-40 h-10 w-10 rounded-full bg-black/10" />
      <div className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-40 h-10 w-10 rounded-full bg-black/10" />

      {/* progress placeholder */}
      <div className="absolute bottom-0 left-0 right-0 z-40 h-0.75 bg-black/10" />
    </section>
  );
}

export default function ModernElegantSlider_EidBannerFrame() {
  const reduceMotion = useReducedMotion();

  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [isAuto, setIsAuto] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [slides, setSlides] = useState<HomeSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const progress = useMotionValue(0);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);
  const touchStartX = useRef<number | null>(null);

  const totalSlides = slides.length;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchCollections = async (query: string) => {
      const response = await fetch(`/api/collections${query}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Failed to load collections (${response.status})`);
      const payload = await response.json();
      return Array.isArray(payload?.collections) ? payload.collections : [];
    };

    const loadCollections = async () => {
      try {
        let collections = await fetchCollections("?status=public&limit=6");
        let validCollections = collections.filter((item: any) => typeof item?.slug === "string" && item.slug);

        if (!validCollections.length) {
          collections = await fetchCollections("?limit=6");
          validCollections = collections.filter((item: any) => typeof item?.slug === "string" && item.slug);
        }

        if (cancelled || !validCollections.length) {
          setSlides([]);
          return;
        }

        // ✅ Use title + description (desc) in the center:
        const mapped: HomeSlide[] = validCollections.map((collection: any, index: number) => ({
          id: collection._id?.toString() ?? collection.slug ?? `collection-${index}`,
          image: collection.bannerImage?.trim() ? collection.bannerImage : FALLBACK_BANNER_IMAGE,

          // Center text:
          title: (collection.bannerTitle ?? collection.title ?? "CELEBRATE EID").toString(),
          subtitle: (collection.bannerDescription ?? collection.description ?? "Explore Our New Collection").toString(),

          // CTA like reference
          ctaText: (collection.bannerCtaText ?? "SHOP NOW").toString(),
          ctaLink: `/product-data?collectionSlug=${encodeURIComponent(collection.slug)}`,

          // Brand
          brandText: "ROBE by Shamshad",
          brandImage: collection.brandImage ?? undefined,
        }));

        if (cancelled) return;
        setSlides(mapped);
        setCurrent(0);
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load featured collections for slider:", error);
        setSlides([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadCollections();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    setCurrent(0);
  }, [slides.length, isLoading]);

  const slideIndex = current % (totalSlides || 1);
  const active = slides[slideIndex];

  const goTo = useCallback(
    (idx: number) => {
      setDir(idx > current ? 1 : -1);
      setCurrent(idx);
      progress.set(0);
    },
    [current, progress]
  );

  const next = useCallback(() => {
    setDir(1);
    setCurrent((p) => (p + 1) % totalSlides);
    progress.set(0);
  }, [totalSlides, progress]);

  const prev = useCallback(() => {
    setDir(-1);
    setCurrent((p) => (p - 1 + totalSlides) % totalSlides);
    progress.set(0);
  }, [totalSlides, progress]);

  useEffect(() => {
    animRef.current?.stop();

    if (!isAuto || reduceMotion || totalSlides <= 1 || isHovering) {
      progress.set(0);
      return;
    }

    progress.set(0);
    animRef.current = animate(progress, 100, {
      duration: SLIDE_MS / 1000,
      ease: "linear",
      onComplete: () => next(),
    });

    return () => animRef.current?.stop();
  }, [isAuto, reduceMotion, totalSlides, next, progress, slideIndex, isHovering]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsAuto(false);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const endX = e.changedTouches[0].clientX;
    const dx = endX - touchStartX.current;
    touchStartX.current = null;

    const threshold = 40;
    if (dx > threshold) prev();
    else if (dx < -threshold) next();
  };

  const slideVariants = useMemo(
    () => ({
      enter: (d: 1 | -1) => ({
        opacity: 0,
        x: d === 1 ? 30 : -30,
        filter: "blur(8px)",
      }),
      center: { opacity: 1, x: 0, filter: "blur(0px)" },
      exit: (d: 1 | -1) => ({
        opacity: 0,
        x: d === 1 ? -30 : 30,
        filter: "blur(8px)",
      }),
    }),
    []
  );

  // ✅ proper skeleton size + colors
  if (isLoading) return <EidSliderSkeleton />;

  if (!totalSlides) {
    return (
      <section
        className="relative z-0 mt-3 w-full overflow-hidden rounded-2xl lg:rounded-3xl shadow-2xl md:mt-0 aspect-4/3 md:aspect-22/9"
        style={{ backgroundColor: THEME.frameBg }}
      >
        <EidGeometricBg />
        <div className="relative z-30 flex h-full items-center justify-center px-6 text-center">
          <div className={`${bodyFont.className} text-white/90 tracking-widest uppercase text-xs sm:text-sm`}>
            No featured collections available yet.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative z-0 mt-3 w-full overflow-hidden  shadow-2xl md:mt-0 aspect-4/3 md:aspect-22/9"
      onMouseEnter={() => {
        setIsHovering(true);
        setIsAuto(false);
      }}
      onMouseLeave={() => {
        setIsHovering(false);
        setIsAuto(true);
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Frame background */}
      <EidGeometricBg />
      <HangingDecor />

      <div className="relative z-30 h-full w-full">
        <AnimatePresence initial={false} custom={dir} mode="wait">
          <motion.div
            key={active.id}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduceMotion ? 0.2 : 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {/* Main slide image */}
            <div className="absolute -inset-x-6 -inset-y-4 overflow-hidden md:inset-y-0">
              <Image
                src={active.image}
                alt={active.title}
                fill
                priority
                sizes="100vw"
                className="object-cover"
                quality={100}
              />

              {/* Warm + soft overlays like reference */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to_bottom, ${THEME.overlayTop}, ${THEME.overlayBottom})`,
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle_at_center, rgba(0,0,0,0.02), rgba(0,0,0,0.22))`,
                }}
              />
            </div>

            {/* ✅ Center texts = title + desc (subtitle) */}
            <div className="absolute inset-0 flex items-center justify-center px-4 pb-10  md:items-end md:pb-12 lg:pb-26">
              <div className="mx-auto text-center max-w-[92%] sm:max-w-3xl md:max-w-4xl">
                <h2
                  className={`${titleFont.className} text-white font-semibold uppercase tracking-[0.06em] sm:tracking-widest leading-tight sm:leading-none drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)]`}
                >
                  <span className="text-xl sm:text-3xl md:text-5xl lg:text-6xl">
                    {active.title}
                  </span>
                </h2>

                <p
                  className={`${descFont.className} mt-2 sm:mt-3 text-white/95 font-medium tracking-[0.02em] sm:tracking-[0.05em] leading-snug sm:leading-normal drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]`}
                >
                  <span className="text-[11px] sm:text-sm md:text-lg">
                    {active.subtitle}
                  </span>
                </p>
              </div>
            </div>

            {/* CTA bottom-right (red) */}
            <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8">
              <Link href={active.ctaLink}>
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className={`${headlineFont.className} rounded-md px-3 py-2 text-[11px] sm:px-5 sm:py-3 sm:text-sm md:text-base font-extrabold uppercase tracking-wider text-white shadow-[0_12px_26px_rgba(0,0,0,0.35)]`}
                  style={{ backgroundColor: THEME.ctaRed }}
                >
                  {active.ctaText}
                </motion.button>
              </Link>
            </div>

            {/* Brand bottom-left (script) */}
            <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8">
              {active.brandImage ? (
                <Image
                  src={active.brandImage}
                  alt="Brand"
                  width={160}
                  height={48}
                  className="h-auto w-28 object-contain sm:w-36"
                />
              ) : (
                <div
                  className={`${brandScript.className} text-white/95 text-xl sm:text-2xl md:text-3xl drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)]`}
                >
                  {active.brandText ?? "Brand"}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Arrows (subtle like reference) */}
        <button
          onClick={prev}
          aria-label="Previous slide"
          className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-40 grid h-10 w-10 place-items-center rounded-full bg-black/15 hover:bg-black/25 transition"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>

        <button
          onClick={next}
          aria-label="Next slide"
          className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-40 grid h-10 w-10 place-items-center rounded-full bg-black/15 hover:bg-black/25 transition"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>

        {/* Dots (subtle) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
          {slides.slice(0, 6).map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                idx === slideIndex ? "w-8 bg-white/90" : "w-2 bg-white/45 hover:bg-white/65"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
