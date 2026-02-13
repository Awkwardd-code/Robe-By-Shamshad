"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Feature = {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  href?: string;
  align?: "left" | "center";
  iconTone?: "primary" | "muted";
  order?: number;
};

type FeatureApiItem = {
  id: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  imagePublicId?: string;
  href?: string;
  align?: "left" | "center";
  iconTone?: "primary" | "muted";
  order?: number;
  isActive?: boolean;
};

const TOKENS = {
  bg: "#FFFFFF",
  primary: "#5B1B1B", // burgundy/maroon
  body: "#4B4B4B", // body text
};

export default function FeaturesGrid() {
  const [features, setFeatures] = useState<Feature[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadFeatures = async () => {
      try {
        const response = await fetch("/api/features-grid?active=true&limit=100", {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { features?: FeatureApiItem[] };
        if (!isMounted || !Array.isArray(data.features)) return;
        if (data.features.length === 0) {
          setFeatures([]);
          return;
        }

        const mapped = data.features
          .map((item) => ({
            id: item.id,
            title: item.title ?? "",
            description: item.description ?? "",
            imageUrl: item.imageUrl?.trim() ?? "",
            href: item.href?.trim() ? item.href : undefined,
            align: item.align ?? "left",
            iconTone: item.iconTone ?? "primary",
            order: item.order ?? 0,
          }))
          .filter((item) => item.imageUrl);

        setFeatures(mapped);
      } catch (error) {
        console.error("Failed to load features grid:", error);
      }
    };

    void loadFeatures();

    return () => {
      isMounted = false;
    };
  }, []);

  const orderedFeatures = useMemo(() => {
    return [...features].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [features]);

  const gridStyle = useMemo(() => {
    const count = orderedFeatures.length;
    if (count === 1) {
      return { gridTemplateColumns: "minmax(0, 100%)" };
    }
    if (count === 2) {
      return { gridTemplateColumns: "repeat(2, minmax(0, 50%))" };
    }
    if (count === 3) {
      return { gridTemplateColumns: "repeat(3, minmax(0, 30%))" };
    }
    return undefined;
  }, [orderedFeatures.length]);

  const FeatureItem = (f: Feature) => {
    const isLeft = f.align === "left";
    const imageToneClass = f.iconTone === "muted" ? "grayscale opacity-70" : "";
    const imageAlt = f.title ? f.title.replace(/\s+/g, " ").trim() : "Feature";

    return (
      <div className={isLeft ? "flex items-start gap-5" : "flex flex-col items-center text-center"}>
        {/* image */}
        <div className={`relative h-11 w-11 ${isLeft ? "mt-1" : "mb-2"}`}>
          <Image
            src={f.imageUrl}
            alt={imageAlt}
            fill
            sizes="44px"
            className={`object-contain ${imageToneClass}`}
          />
        </div>

        {/* text */}
        <div className={isLeft ? "" : "flex flex-col items-center"}>
          {f.title ? (
            <div
              className="whitespace-pre-line text-[15px] font-semibold leading-[1.1] tracking-wide"
              style={{ color: TOKENS.primary }}
            >
              {f.title}
            </div>
          ) : null}

          {f.description ? (
            <div
              className="mt-2 whitespace-pre-line text-[12px] leading-5"
              style={{ color: TOKENS.body }}
            >
              {f.description}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <section className="w-full" style={{ backgroundColor: TOKENS.bg }}>
      <div className="mx-auto max-w-6xl px-6 py-14">
        {/* Matches screenshot: 4 columns x 2 rows (8 items) */}
        <div
          className={`grid gap-x-14 gap-y-16 ${
            orderedFeatures.length >= 4 ? "grid-cols-2 md:grid-cols-4" : "justify-center"
          }`}
          style={gridStyle}
        >
          {orderedFeatures.map((f) => {
            const content = FeatureItem(f);

            return f.href ? (
              <Link key={f.id} href={f.href} className="block no-underline">
                {content}
              </Link>
            ) : (
              <div key={f.id}>{content}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
