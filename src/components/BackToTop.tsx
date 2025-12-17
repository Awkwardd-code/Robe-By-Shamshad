"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

const SCROLL_THRESHOLD = 320;
const CIRC = 2 * Math.PI * 44; // r=44

export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );

      const p = Math.min((scrolled / maxScroll) * 100, 100);

      setVisible(scrolled > SCROLL_THRESHOLD);
      setProgress(p);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className={[
        "group fixed bottom-8 right-8 z-50",
        "grid place-items-center",
        "h-12 w-12 rounded-2xl",
        "border border-white/10",
        "bg-white/7 backdrop-blur-xl",
        "shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)]",
        "transition-all duration-300 ease-out",
        "hover:shadow-[0_18px_45px_-18px_rgba(0,0,0,0.7)] hover:scale-[1.04]",
        "active:scale-[0.98]",
        visible
          ? "opacity-100 translate-y-0"
          : "pointer-events-none opacity-0 translate-y-3",
      ].join(" ")}
    >
      {/* soft sheen */}
      <span className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-br from-white/12 via-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* progress ring */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* track */}
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="2"
        />

        {/* progress */}
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="url(#ring)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC - (CIRC * progress) / 100}
          transform="rotate(-90 50 50)"
          className="transition-[stroke-dashoffset] duration-200 ease-out"
        />
      </svg>

      {/* icon pill */}
      <span className="relative cursor-pointer grid place-items-center h-9 w-9 rounded-xl bg-black/35 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
        <ArrowUp className="h-4 w-4 text-white/90 transition-transform duration-200 group-hover:-translate-y-0.5" />
      </span>


    </button>
  );
}
