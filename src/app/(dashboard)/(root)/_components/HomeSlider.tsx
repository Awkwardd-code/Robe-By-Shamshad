/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, animate, useMotionValue, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, Star, Gift } from "lucide-react";

type HomeSlide = {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  accentColor: string;
  decorativeElement?: "crescent" | "star" | "ornament";
  brandText?: string;
  brandImage?: string;
};

type DecorativeElementProps = {
  type?: HomeSlide["decorativeElement"];
  color: string;
  gradientId: string;
};

const DecorativeElement = ({ type, color, gradientId }: DecorativeElementProps) => {
  switch (type) {
    case "crescent":
      return (
        <div className="relative">
          <svg width="120" height="120" viewBox="0 0 120 120" className="opacity-90">
            <defs>
              <radialGradient id={`crescent-glow-${gradientId}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </radialGradient>
            </defs>
            <path
              d="M70 20c-10 5-18 16-18 28 0 18 14 32 32 32 5 0 10-1 15-4-6 18-22 31-42 31-25 0-45-20-45-45 0-23 16-42 37-45 6-1 12-1 18 0z"
              fill={`url(#crescent-glow-${gradientId})`}
            />
          </svg>
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-white"
              style={{
                top: `${20 + i * 30}px`,
                left: `${80 + i * 10}px`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </div>
      );
    case "star":
      return (
        <div className="relative">
          <Sparkles className="w-24 h-24" style={{ color }} />
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-white"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: `rotate(${i * 60}deg) translateX(45px)`,
                }}
              />
            ))}
          </motion.div>
        </div>
      );
    case "ornament":
      return (
        <div className="relative">
          <Gift className="w-28 h-28" style={{ color }} />
          <div className="absolute -top-2 -right-2">
            <Star className="w-8 h-8" style={{ color }} fill={color} />
          </div>
        </div>
      );
    default:
      return null;
  }
};

const ACCENT_COLORS = ["#C9A96E", "#D4AF37", "#B76E79", "#2F855A", "#7C3AED"];
const DECORATIVE_TYPES: DecorativeElementProps["type"][] = [
  "crescent",
  "star",
  "ornament",
];
const SLIDE_MS = 8000;
const FALLBACK_BANNER_IMAGE =
  "https://images.unsplash.com/photo-1503342481797-1b6e3bd5f763?w=1600&h=900&fit=crop";

interface Particle {
  id: number;
  left: number;
  top: number;
  duration: number;
  delay: number;
}

// Modern White/Silver Skeleton Loading Component
const SliderSkeleton = () => {
  return (
    <section className="relative w-full overflow-hidden rounded-2xl lg:rounded-3xl bg-linear-to-br from-slate-900 via-gray-900 to-slate-900 shadow-2xl min-h-[70vh]">
      <div className="relative h-[calc(70vh-15px)] max-h-175 min-h-135 w-full">
        {/* Animated shimmer background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-slate-800/50 via-gray-900/30 to-slate-800/50" />
          <motion.div
            className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Floating particles skeleton */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-white/20"
              style={{
                left: `${(i * 8) % 100}%`,
                top: `${(i * 7) % 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 3 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>

        {/* Main content skeleton */}
        <div className="absolute inset-0 flex items-center justify-center px-4 md:px-8">
          <div className="relative z-20 text-center max-w-4xl mx-auto w-full">
            {/* Decorative line skeleton */}
            <div className="flex justify-center mb-10">
              <div className="h-px w-40 bg-linear-to-r from-transparent via-white/30 to-transparent" />
            </div>

            {/* Title skeleton with shimmer effect */}
            <div className="space-y-6 mb-10">
              <div className="relative overflow-hidden rounded-lg">
                <div className="h-14 bg-linear-to-r from-gray-800/80 via-gray-700/60 to-gray-800/80 rounded-lg mx-auto w-3/4" />
                <motion.div
                  className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
              </div>
              <div className="relative overflow-hidden">
                <div className="h-14 bg-linear-to-r from-gray-700/60 via-gray-800/80 to-gray-700/60 rounded-lg mx-auto w-2/3" />
                <motion.div
                  className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
                />
              </div>
            </div>

            {/* Subtitle skeleton */}
            <div className="mt-8 space-y-4 max-w-2xl mx-auto">
              <div className="h-4 bg-linear-to-r from-gray-800/60 to-gray-700/60 rounded w-full" />
              <div className="h-4 bg-linear-to-r from-gray-700/60 to-gray-800/60 rounded w-5/6 mx-auto" />
              <div className="h-4 bg-linear-to-r from-gray-800/60 to-gray-700/60 rounded w-4/6 mx-auto" />
            </div>

            {/* CTA button skeleton with glow */}
            <div className="mt-12">
              <div className="relative inline-block">
                <div className="relative overflow-hidden rounded-full px-12 py-5 bg-linear-to-r from-gray-800/70 to-gray-700/70 backdrop-blur-sm border border-white/10">
                  <div className="w-36 h-5 bg-linear-to-r from-gray-600/60 to-gray-500/60 rounded" />
                  <motion.div
                    className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  />
                </div>
                {/* Pulsing glow effect */}
                <motion.div
                  className="absolute -inset-4 rounded-full bg-white/5 blur-xl"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Side decorative elements skeleton */}
        <div className="absolute left-8 md:left-16 top-1/2 -translate-y-1/2 opacity-60 z-20">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-linear-to-br from-gray-800/50 to-gray-700/40 backdrop-blur-sm border border-white/10" />
            <div className="absolute inset-0 rounded-full border border-white/5" />
          </div>
        </div>
        <div className="absolute right-8 md:right-16 top-1/2 -translate-y-1/2 opacity-60 z-20">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-linear-to-br from-gray-700/40 to-gray-800/50 backdrop-blur-sm border border-white/10" />
            <div className="absolute inset-0 rounded-full border border-white/5" />
          </div>
        </div>

        {/* Slide indicators skeleton */}
        <div className="absolute bottom-8 right-8 z-20">
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5].map((_, idx) => (
              <motion.div
                key={idx}
                className={`h-1.5 rounded-full ${
                  idx === 0 
                    ? 'w-10 bg-linear-to-r from-white/80 to-white/60' 
                    : 'w-2 bg-white/20'
                }`}
                animate={idx === 0 ? {
                  background: [
                    'linear-gradient(90deg, rgba(255,255,255,0.8), rgba(255,255,255,0.6))',
                    'linear-gradient(90deg, rgba(255,255,255,0.6), rgba(255,255,255,0.8))',
                  ]
                } : {}}
                transition={idx === 0 ? { duration: 2, repeat: Infinity } : {}}
              />
            ))}
          </div>
        </div>

        {/* Navigation arrows skeleton */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20">
          <div className="p-3 rounded-full bg-linear-to-br from-gray-800/40 to-gray-700/30 backdrop-blur-sm border border-white/10">
            <ChevronLeft className="w-6 h-6 text-white/40" />
          </div>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20">
          <div className="p-3 rounded-full bg-linear-to-br from-gray-700/30 to-gray-800/40 backdrop-blur-sm border border-white/10">
            <ChevronRight className="w-6 h-6 text-white/40" />
          </div>
        </div>

        {/* Progress bar skeleton */}
        <div className="absolute bottom-0 left-0 right-0 z-20 h-0.5 bg-linear-to-r from-transparent via-white/5 to-transparent">
          <motion.div
            className="h-full rounded-r-full bg-linear-to-r from-white/30 via-white/50 to-white/30"
            animate={{ width: ["0%", "100%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* Brand logo skeleton */}
        <div className="absolute bottom-8 left-8 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-linear-to-br from-gray-800/50 to-gray-700/40 backdrop-blur-sm border border-white/10" />
            <div className="space-y-2">
              <div className="h-2 w-24 rounded-full bg-linear-to-r from-gray-800/60 to-gray-700/50" />
              <div className="h-2 w-16 rounded-full bg-linear-to-r from-gray-700/50 to-gray-800/60" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default function ModernElegantSlider() {
  const reduceMotion = useReducedMotion();
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [isAuto, setIsAuto] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
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

      if (!response.ok) {
        throw new Error(`Failed to load collections (${response.status})`);
      }

      const payload = await response.json();
      return Array.isArray(payload?.collections) ? payload.collections : [];
    };

    const loadCollections = async () => {
      try {
        let collections = await fetchCollections("?status=public&limit=6");
        let validCollections = collections.filter(
          (item: any) => typeof item?.slug === "string" && item.slug
        );

        if (!validCollections.length) {
          collections = await fetchCollections("?limit=6");
          validCollections = collections.filter(
            (item: any) => typeof item?.slug === "string" && item.slug
          );
        }

        if (cancelled || !validCollections.length) {
          setSlides([]);
          return;
        }

        const mapped = validCollections.map((collection: any, index: number) => ({
          id: collection._id?.toString() ?? collection.slug ?? `collection-${index}`,
          image: collection.bannerImage?.trim()
            ? collection.bannerImage
            : FALLBACK_BANNER_IMAGE,
          title: collection.bannerTitle ?? "ROBE by Shamshad",
          subtitle: collection.bannerDescription ?? "",
          ctaText: "EXPLORE NOW",
          ctaLink: `/product-data?collectionSlug=${encodeURIComponent(collection.slug)}`,
          accentColor: ACCENT_COLORS[index % ACCENT_COLORS.length],
          decorativeElement:
            DECORATIVE_TYPES[index % DECORATIVE_TYPES.length] ?? "crescent",
          brandText: collection.bannerTitle ?? "ROBE by ShamShad",
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
        if (!cancelled) {
          setIsLoading(false);
        }
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

  // Generate particles once on mount and when slide changes
  useEffect(() => {
    const generateParticles = () => {
      const newParticles: Particle[] = [];
      for (let i = 0; i < 20; i++) {
        newParticles.push({
          id: i,
          left: Math.random() * 100,
          top: Math.random() * 100,
          duration: 2 + Math.random() * 3,
          delay: Math.random() * 5,
        });
      }
      setParticles(newParticles);
    };

    generateParticles();
  }, [slideIndex]); // Regenerate particles when slide changes

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

  // Autoplay with smooth progress
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

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) setIsAuto(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

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
        x: d === 1 ? 40 : -40,
        scale: 1.02,
        filter: "blur(10px)",
      }),
      center: { 
        opacity: 1, 
        x: 0, 
        scale: 1,
        filter: "blur(0px)",
      },
      exit: (d: 1 | -1) => ({
        opacity: 0,
        x: d === 1 ? -40 : 40,
        scale: 0.98,
        filter: "blur(10px)",
      }),
    }),
    []
  );

  // Show skeleton while loading
  if (isLoading) {
    return <SliderSkeleton />;
  }

  // Show empty state if no slides
  if (!totalSlides) {
    return (
      <section className="relative w-full overflow-hidden rounded-2xl lg:rounded-3xl bg-linear-to-br from-slate-900 via-gray-900 to-slate-900 shadow-2xl min-h-80">
        <div className="flex h-full min-h-55 items-center justify-center rounded-2xl border border-white/10 bg-linear-to-br from-black/80 to-gray-900 p-8 text-center">
          <div className="text-sm uppercase tracking-[0.4em] text-white/70">
            No featured collections available yet.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative w-full overflow-hidden rounded-2xl lg:rounded-3xl bg-linear-to-br from-slate-900 via-gray-900 to-slate-900 shadow-2xl"
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
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              "radial-gradient(circle at 20% 50%, rgba(201, 169, 110, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 50%, rgba(212, 175, 55, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 50% 20%, rgba(183, 110, 121, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 50%, rgba(201, 169, 110, 0.15) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        {/* Subtle shimmer overlay */}
        <motion.div
          className="absolute inset-0 bg-linear-to-r from-transparent via-white/2 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative h-[calc(70vh-15px)] max-h-175 min-h-135 w-full">
        <AnimatePresence initial={false} custom={dir} mode="wait">
          <motion.div
            key={active.id}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              duration: reduceMotion ? 0.2 : 0.8,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute inset-0"
          >
            {/* Parallax background image */}
            <motion.div
              className="absolute inset-0 overflow-hidden"
              initial={{ scale: 1.15 }}
              animate={{ scale: 1.05 }}
              transition={{ duration: reduceMotion ? 0.2 : 1.5, ease: "easeOut" }}
            >
              <Image
                src={active.image}
                alt={active.title}
                fill
                priority
                sizes="100vw"
                className="object-cover"
                quality={100}
              />

              {/* Sophisticated gradient overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-black/10" />
              <div className="absolute inset-0 bg-linear-to-r from-black/20 via-transparent to-black/20" />
              <div className="absolute inset-0" style={{
                background: `linear-gradient(45deg, transparent 40%, ${active.accentColor}22 50%, transparent 60%)`,
                opacity: 0.3
              }} />
              {/* Metallic sheen */}
              <div className="absolute inset-0 bg-linear-to-br from-transparent via-white/5 to-transparent" />
            </motion.div>

            {/* Enhanced particle effects */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {particles.map((particle) => (
                <motion.div
                  key={`${slideIndex}-${particle.id}`}
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{
                    left: `${particle.left}%`,
                    top: `${particle.top}%`,
                    background: `radial-gradient(circle, ${active.accentColor}88, transparent)`,
                  }}
                  animate={{
                    y: [0, -150],
                    opacity: [0, 0.8, 0],
                    scale: [0.5, 1.2, 0.5],
                  }}
                  transition={{
                    duration: particle.duration,
                    repeat: Infinity,
                    delay: particle.delay,
                    ease: "easeOut",
                  }}
                />
              ))}
            </div>

            {/* Floating decorative dots */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-white/20"
                  style={{
                    left: `${20 + (i * 10)}%`,
                    top: `${30 + (i * 5)}%`,
                  }}
                  animate={{
                    y: [0, -20, 0],
                    opacity: [0.3, 0.7, 0.3],
                  }}
                  transition={{
                    duration: 3 + i * 0.5,
                    repeat: Infinity,
                    delay: i * 0.4,
                  }}
                />
              ))}
            </div>

            {/* Left decorative element with glow */}
            <motion.div
              className="absolute left-8 md:left-16 top-1/2 -translate-y-1/2 z-20"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 0.8, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="relative">
                <DecorativeElement
                  type={active.decorativeElement}
                  color={active.accentColor || "#C9A96E"}
                  gradientId={active.id}
                />
                <motion.div
                  className="absolute -inset-4 rounded-full blur-xl"
                  style={{ backgroundColor: `${active.accentColor}40` }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </div>
            </motion.div>

            {/* Right decorative element (mirrored) with glow */}
            <motion.div
              className="absolute right-8 md:right-16 top-1/2 -translate-y-1/2 z-20"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 0.8, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="relative rotate-12">
                <DecorativeElement
                  type={active.decorativeElement}
                  color={active.accentColor || "#C9A96E"}
                  gradientId={active.id}
                />
                <motion.div
                  className="absolute -inset-4 rounded-full blur-xl"
                  style={{ backgroundColor: `${active.accentColor}40` }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                />
              </div>
            </motion.div>

            {/* Center content with enhanced glassmorphism */}
            <div className="absolute inset-0 flex items-center justify-center px-4 md:px-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative z-20 text-center max-w-4xl mx-auto"
              >
                {/* Accent line with glow */}
                <div className="flex justify-center mb-10">
                  <motion.div
                    className="h-px w-40 rounded-full"
                    style={{ background: `linear-gradient(90deg, transparent, ${active.accentColor}, transparent)` }}
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 160, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  />
                  <motion.div
                    className="absolute h-px w-60 rounded-full blur-sm"
                    style={{ background: active.accentColor }}
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 240, opacity: 0.3 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                  />
                </div>

                {/* Main title with enhanced gradient and glow */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="relative"
                >
                  <h2 className="font-bold tracking-wider text-white
                             text-4xl sm:text-5xl md:text-6xl lg:text-7xl
                             mb-4 md:mb-6 leading-tight">
                    <span className="bg-linear-to-r from-white via-white/95 to-white/90 bg-clip-text text-transparent">
                      {active.title.split(' ')[0]}
                    </span>
                    <br />
                    <span
                      className="bg-linear-to-r bg-clip-text text-transparent"
                      style={{
                        backgroundImage: `linear-gradient(45deg, ${active.accentColor}, ${active.accentColor}DD, #fff)`,
                      }}
                    >
                      {active.title.split(' ').slice(1).join(' ')}
                    </span>
                  </h2>
                  {/* Title glow effect */}
                  <motion.div
                    className="absolute -inset-8 -z-10 blur-3xl"
                    style={{ backgroundColor: `${active.accentColor}20` }}
                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  />
                </motion.div>

                {/* Subtitle with enhanced glass effect */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="relative"
                >
                  <p className="mt-4 text-white/90 font-light tracking-wide
                             text-lg sm:text-xl md:text-2xl
                             max-w-2xl mx-auto leading-relaxed
                             backdrop-blur-xl bg-white/5 rounded-3xl p-8 
                             border border-white/10 shadow-2xl">
                    {active.subtitle}
                  </p>
                  {/* Subtle border glow */}
                  <div className="absolute -inset-px rounded-3xl blur-sm"
                    style={{ background: `linear-gradient(45deg, transparent, ${active.accentColor}40, transparent)` }} />
                </motion.div>

                {/* Enhanced CTA button with glow effects */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="mt-8 md:mt-12"
                >
                  <Link href={active.ctaLink}>
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="group relative cursor-pointer overflow-hidden rounded-full px-10 py-4 md:px-12 md:py-5
                               font-semibold text-lg tracking-wider
                               shadow-2xl backdrop-blur-xl border border-white/20
                               transition-all duration-300"
                      style={{
                        background: `linear-gradient(45deg, ${active.accentColor}22, ${active.accentColor}11, transparent)`,
                        color: active.accentColor,
                      }}
                    >
                      <span className="relative z-10 flex items-center gap-3">
                        {active.ctaText}
                        <motion.span
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </motion.span>
                      </span>
                      
                      {/* Hover glow effect */}
                      <motion.div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100"
                        style={{
                          background: `linear-gradient(45deg, transparent, ${active.accentColor}33, transparent)`,
                        }}
                        initial={false}
                        transition={{ duration: 0.3 }}
                      />
                      
                      {/* Pulsing outer glow */}
                      <motion.div
                        className="absolute -inset-4 rounded-full blur-xl"
                        style={{ backgroundColor: `${active.accentColor}40` }}
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </motion.button>
                  </Link>
                </motion.div>
              </motion.div>
            </div>

            {/* Enhanced brand/Logo with glass effect */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="absolute bottom-6 left-6 md:bottom-8 md:left-8 z-20"
            >
              <div className="backdrop-blur-xl bg-black/30 rounded-2xl p-4 border border-white/10 shadow-lg">
                {active.brandImage ? (
                  <Image
                    src={active.brandImage}
                    alt="Brand"
                    width={160}
                    height={48}
                    className="h-auto w-30 md:w-40 object-contain"
                  />
                ) : (
                  <div className="text-white/90 font-light tracking-wider text-sm md:text-base">
                    {active.brandText}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Enhanced slide indicator with glow */}
            <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 z-20">
              <div className="flex items-center gap-3">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goTo(idx)}
                    className={`relative w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === slideIndex ? 'w-8' : 'hover:w-4'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  >
                    <div className={`absolute inset-0 rounded-full transition-colors duration-300 ${
                      idx === slideIndex 
                        ? 'bg-white' 
                        : 'bg-white/40 hover:bg-white/60'
                    }`} />
                    {idx === slideIndex && (
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ background: active.accentColor }}
                        layoutId="activeSlide"
                      />
                    )}
                    {/* Indicator glow */}
                    {idx === slideIndex && (
                      <motion.div
                        className="absolute -inset-2 rounded-full blur-sm"
                        style={{ backgroundColor: active.accentColor }}
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Enhanced navigation arrows with glow */}
        <button
          onClick={prev}
          aria-label="Previous slide"
          className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-20
                     group p-3 rounded-full backdrop-blur-xl bg-black/40 border border-white/20
                     hover:bg-black/60 hover:border-white/40 transition-all duration-300 cursor-pointer
                     shadow-lg"
        >
          <motion.div
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.9 }}
            className="relative"
          >
            <ChevronLeft className="w-6 h-6 text-white/90 group-hover:text-white relative z-10" />
            {/* Arrow glow */}
            <motion.div
              className="absolute -inset-2 rounded-full blur-sm bg-white/20"
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        </button>

        <button
          onClick={next}
          aria-label="Next slide"
          className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20
                     group p-3 rounded-full backdrop-blur-xl bg-black/40 border border-white/20
                     hover:bg-black/60 hover:border-white/40 transition-all duration-300 cursor-pointer
                     shadow-lg"
        >
          <motion.div
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.9 }}
            className="relative"
          >
            <ChevronRight className="w-6 h-6 text-white/90 group-hover:text-white relative z-10" />
            {/* Arrow glow */}
            <motion.div
              className="absolute -inset-2 rounded-full blur-sm bg-white/20"
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
          </motion.div>
        </button>

        {/* Enhanced progress indicator with gradient glow */}
        <div className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-linear-to-r from-transparent via-white/10 to-transparent">
          <motion.div
            className="h-full rounded-r-full relative"
            style={{
              width: progress.get() + "%",
            }}
          >
            <div 
              className="absolute inset-0 rounded-r-full"
              style={{
                background: `linear-gradient(90deg, ${active.accentColor}44, ${active.accentColor})`,
              }}
            />
            {/* Progress bar glow */}
            <motion.div
              className="absolute inset-0 rounded-r-full blur-sm"
              style={{ backgroundColor: active.accentColor }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
