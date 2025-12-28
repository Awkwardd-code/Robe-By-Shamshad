"use client";

import Link from "next/link";
import { motion } from "framer-motion";

/**
 * Complete Newsletter Page Component (Next.js + Tailwind + Framer Motion)
 * - Full-width hero banner (like reference)
 * - Secondary promo strip
 * - Footer (unsubscribe)
 * - No empty placeholders / no “add something here” areas
 *
 * ✅ Data-driven: pass `data` from API/CMS (no hardcoded marketing copy required).
 */

type NewsletterData = {
  hero: {
    offerLine: string;
    brandLine: string;
    scopeLine: string;
    ctaText: string;
    ctaHref: string;
  };
  intro: {
    heading: string;
    body: string;
  };
  secondaryBanner?: {
    textLeft: string;
    textRight?: string;
    ctaText: string;
    ctaHref: string;
  };
  footer: {
    disclaimer: string;
    unsubscribeHref: string;
  };
};

const TOKENS = {
  bg: "#0B3D32",
  headline: "#DED46E",
  ornament: "#BCB667",
  ctaBg: "#F8F1B5",
  ctaBorder: "#C9B86A",
  ctaText: "#111111",
  pageBg: "#F5F6F7",
  text: "#111111",
  textLight: "#5A5A5A",
  divider: "rgba(17,17,17,.10)",
};

function CornerFlourish({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="92"
      height="42"
      viewBox="0 0 92 42"
      fill="none"
      aria-hidden
    >
      <path
        d="M8 36C23 19 40 13 86 9"
        stroke={TOKENS.ornament}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M58 13c9 6 15 13 20 25"
        stroke={TOKENS.ornament}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

function CrescentStar({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="98"
      height="74"
      viewBox="0 0 98 74"
      fill="none"
      aria-hidden
    >
      <path
        d="M34 8c-10 5-16 14-16 25 0 14 11 25 25 25 4 0 9-1 13-3-5 12-17 19-31 19C12 74 0 62 0 48 0 33 11 20 26 17c3-1 6-1 8-1z"
        transform="translate(14,-12)"
        stroke={TOKENS.ornament}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M72 21l2.7 6.4 6.4 2.7-6.4 2.7L72 40l-2.7-6.4-6.4-2.7 6.4-2.7L72 21z"
        fill={TOKENS.ornament}
      />
      <circle cx="32" cy="21" r="2.3" fill={TOKENS.ornament} opacity="0.7" />
      <circle cx="20" cy="36" r="1.6" fill={TOKENS.ornament} opacity="0.55" />
    </svg>
  );
}

export default function EidNewsletterPage({
  data,
}: {
  data: NewsletterData;
}) {
  return (
    <main className="min-h-screen w-full" style={{ backgroundColor: TOKENS.pageBg }}>
      {/* ===== FULL-WIDTH HERO + FOOTER STRIP ===== */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full overflow-hidden"
        style={{ backgroundColor: TOKENS.bg }}
      >
        {/* Decorative layer */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_35%,rgba(255,255,255,0.07),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_50%,rgba(255,255,255,0.05),transparent_60%)]" />
          <motion.div
            className="absolute inset-0 opacity-[0.14]"
            style={{
              background:
                "linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.22) 35%, transparent 55%)",
            }}
            animate={{ x: ["-35%", "35%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.10),transparent_30%,transparent_70%,rgba(0,0,0,0.12))]" />
        </div>

        {/* Corner flourishes */}
        <div className="pointer-events-none absolute right-4 top-3 opacity-90">
          <CornerFlourish />
        </div>
        <div className="pointer-events-none absolute left-4 top-3 opacity-70 rotate-180">
          <CornerFlourish />
        </div>

        {/* Floating gold dots */}
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full"
              style={{
                backgroundColor: TOKENS.ornament,
                left: `${8 + (i * 9) % 92}%`,
                top: `${20 + (i * 7) % 60}%`,
                opacity: 0.18,
              }}
              animate={{ y: [0, -8, 0], opacity: [0.12, 0.22, 0.12] }}
              transition={{ duration: 3 + i * 0.35, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>

        {/* Inner content container */}
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* HERO ROW */}
          <div className="flex items-center gap-3 py-5 sm:py-6">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="shrink-0"
            >
              <CrescentStar />
            </motion.div>

            <div className="min-w-0 flex-1">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.12 }}
                className="font-extrabold uppercase tracking-[0.06em] leading-[1.05] text-[15px] sm:text-[20px] md:text-[22px]"
                style={{ color: TOKENS.headline }}
              >
                {data.hero.offerLine}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.18 }}
                className="mt-1 font-extrabold uppercase tracking-[0.06em] text-white text-[12px] sm:text-[14px] md:text-[15px]"
              >
                {data.hero.brandLine}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.24 }}
                className="mt-0.5 uppercase tracking-widest text-[10px] sm:text-[11px] text-white/85"
              >
                {data.hero.scopeLine}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="shrink-0"
            >
              <Link
                href={data.hero.ctaHref}
                className="inline-flex items-center justify-center rounded-md border px-3 py-2 sm:px-5 sm:py-3
                           text-[11px] sm:text-[12px] font-bold uppercase tracking-widest
                           shadow-[0_10px_20px_rgba(0,0,0,0.14)]
                           transition-transform hover:scale-[1.02] active:scale-[0.99]"
                style={{
                  backgroundColor: TOKENS.ctaBg,
                  borderColor: TOKENS.ctaBorder,
                  color: TOKENS.ctaText,
                }}
              >
                {data.hero.ctaText}
              </Link>
            </motion.div>
          </div>

          {/* Gold divider */}
          <div className="h-px w-full" style={{ backgroundColor: `${TOKENS.ornament}55` }} />

          {/* FOOTER ROW (inside teal banner) */}
          <div className="flex flex-col gap-2 py-4 sm:py-5">
            <div
              className="text-[12px] font-bold uppercase tracking-widest"
              style={{ color: TOKENS.headline }}
            >
              {data.footer.disclaimer}
            </div>

            <div className="text-sm text-white/85 leading-relaxed">
              <Link
                href={data.footer.unsubscribeHref}
                className="underline underline-offset-2"
                style={{ color: TOKENS.ctaBg }}
              >
                Unsubscribe
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom fade into page */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-[linear-gradient(to_bottom,transparent,#F5F6F7)]" />
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full py-12 sm:py-16 lg:py-20"
      >
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(188,182,103,0.18),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(11,61,50,0.08),transparent_50%)]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.55, delay: 0.05 }}
            >
              <div
                className="text-xs font-semibold uppercase tracking-[0.4em]"
                style={{ color: TOKENS.ornament }}
              >
                {data.hero.scopeLine}
              </div>
              <h2
                className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold"
                style={{ color: TOKENS.text }}
              >
                {data.intro.heading}
              </h2>
              <p className="mt-4 text-base leading-relaxed" style={{ color: TOKENS.textLight }}>
                {data.intro.body}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span
                  className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ borderColor: TOKENS.ctaBorder, color: TOKENS.text }}
                >
                  {data.hero.offerLine}
                </span>
                <span
                  className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ borderColor: TOKENS.ctaBorder, color: TOKENS.text }}
                >
                  {data.hero.brandLine}
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.55, delay: 0.1 }}
            >
              <div
                className="rounded-2xl border bg-white/90 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.08)] backdrop-blur"
                style={{ borderColor: TOKENS.divider }}
              >
                <div
                  className="text-xs font-semibold uppercase tracking-[0.3em]"
                  style={{ color: TOKENS.textLight }}
                >
                  {data.hero.brandLine}
                </div>
                <div className="mt-3 text-2xl sm:text-3xl font-bold" style={{ color: TOKENS.text }}>
                  {data.hero.offerLine}
                </div>
                <div className="mt-2 text-sm" style={{ color: TOKENS.textLight }}>
                  {data.hero.scopeLine}
                </div>
                <Link
                  href={data.hero.ctaHref}
                  className="mt-6 inline-flex items-center justify-center rounded-md border px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-transform hover:scale-[1.02]"
                  style={{
                    backgroundColor: TOKENS.ctaBg,
                    borderColor: TOKENS.ctaBorder,
                    color: TOKENS.ctaText,
                  }}
                >
                  {data.hero.ctaText}
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

    </main>
  );
}

