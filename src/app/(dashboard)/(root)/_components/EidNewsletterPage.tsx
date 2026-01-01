
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Playfair_Display, Cormorant_Garamond, Poppins } from "next/font/google";

const headingFont = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });
const bodyFont = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500"] });
const uiFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"] });

type SeasonalImage = {
  url?: string;
  publicId?: string;
};

type SeasonalCollection = {
  _id?: string;
  title?: string;
  description?: string;
  offer?: string;
  offerDescription?: string;
  image?: SeasonalImage;
  createdAt?: string;
  updatedAt?: string;
};

const ENDPOINT = "/api/seasonal-collection?limit=1";
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1600&h=900&fit=crop";

const FALLBACK_ITEM = {
  title: "Eid Capsule 2025",
  description:
    "Light layers, soft tones, and festive detailing designed for the season.",
  offer: "Limited Eid Offer",
  offerDescription: "Fresh arrivals for the celebration.",
};

const THEME = {
  accent: "#D9B36B",
  accentDeep: "#B4833C",
  text: "#6B0F1A",
  muted: "#6B0F1A",
};

const MOTION_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function EidNewsletterSkeleton() {
  return (
    <section className="relative w-full overflow-hidden">
      <div className="relative w-full min-h-65 md:min-h-90 lg:min-h-105 bg-[#B9A08C]">
        <div className="absolute inset-0 bg-linear-to-br from-black/20 via-black/10 to-black/30" />
        <div className="absolute inset-0 animate-pulse bg-linear-to-r from-white/0 via-white/10 to-white/0" />

        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10">
            <div className="max-w-xl space-y-4">
              <div className="h-6 w-32 rounded-full bg-white/35" />
              <div className="h-10 w-[70%] rounded-md bg-white/25" />
              <div className="h-5 w-[58%] rounded-md bg-white/20" />
              <div className="h-4 w-[42%] rounded-md bg-white/15" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function EidNewsletterPage() {
  const reduceMotion = useReducedMotion();
  const [item, setItem] = useState<SeasonalCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(ENDPOINT, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || "Failed to load seasonal collection");
        }
        const payload = await response.json();
        const first = Array.isArray(payload?.seasonalCollections)
          ? payload.seasonalCollections[0]
          : null;
        if (!active) return;
        setItem(first ?? null);
      } catch (err: any) {
        if (!active) return;
        setItem(null);
        setError(err?.message || "Unable to load seasonal collection");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const content = useMemo(() => {
    const title = item?.title?.trim() || FALLBACK_ITEM.title;
    const description = item?.description?.trim() || FALLBACK_ITEM.description;
    const offer = item?.offer?.trim() || FALLBACK_ITEM.offer;
    const offerDescription =
      item?.offerDescription?.trim() || FALLBACK_ITEM.offerDescription;
    const imageUrl = item?.image?.url?.trim() || FALLBACK_IMAGE;

    return { title, description, offer, offerDescription, imageUrl };
  }, [item]);

  const motionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, ease: MOTION_EASE },
      };

  if (isLoading) return <EidNewsletterSkeleton />;

  return (
    <section className="relative w-full overflow-hidden">
      <div className="relative w-full min-h-65 md:min-h-90 lg:min-h-105">
        <Image
          src={content.imageUrl}
          alt={content.title}
          fill
          sizes="100vw"
          className="object-cover"
        />

      </div>

      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10">
          <motion.div
            {...motionProps}
            className="max-w-2xl text-left flex flex-col items-start space-y-2 sm:space-y-3"
          >
            {content.offer && (
              <p
                className={`${uiFont.className} text-xs sm:text-sm font-semibold uppercase tracking-[0.24em]`}
                style={{
                  color: THEME.text,
                }}
              >
                {content.offer}
              </p>
            )}

            <h2
              className={`${headingFont.className} text-3xl sm:text-4xl md:text-5xl font-semibold uppercase tracking-[0.08em]`}
              style={{ color: THEME.text }}
            >
              {content.title}
            </h2>

            <p
              className={`${bodyFont.className} text-sm sm:text-base md:text-lg leading-relaxed uppercase`}
              style={{ color: THEME.text }}
            >
              {content.description}
            </p>

            {content.offerDescription && (
              <p
                className={`${uiFont.className} text-xs sm:text-sm font-semibold uppercase tracking-[0.18em]`}
                style={{ color: THEME.muted }}
              >
                {content.offerDescription}
              </p>
            )}


          </motion.div>
        </div>
      </div>


    </section>
  );
}
