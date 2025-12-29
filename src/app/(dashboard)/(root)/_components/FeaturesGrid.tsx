"use client";

import React from "react";
import Link from "next/link";

type Feature = {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  href?: string;
  align?: "left" | "center";
  iconTone?: "primary" | "muted";
};

const TOKENS = {
  bg: "#FFFFFF",
  primary: "#5B1B1B", // burgundy/maroon
  body: "#4B4B4B", // body text
  muted: "#A9A9A9", // outline icon gray
};

function TruckSmallFilled({ className }: { className?: string }) {
  // Matches screenshot: simple filled truck silhouette
  return (
    <svg
      className={className}
      viewBox="0 0 64 40"
      fill="currentColor"
      aria-hidden="true"
    >
      {/* cargo */}
      <rect x="4" y="10" width="34" height="18" rx="2" />
      {/* cab */}
      <path d="M38 16h10c1 0 1.9.4 2.6 1.1l6 6c.7.7 1.1 1.6 1.1 2.6v2.3H38V16z" />
      {/* wheels */}
      <circle cx="18" cy="32" r="4.2" />
      <circle cx="48" cy="32" r="4.2" />
      {/* wheel cutouts (subtle) */}
      <circle cx="18" cy="32" r="2.1" fill={TOKENS.bg} opacity="0.22" />
      <circle cx="48" cy="32" r="2.1" fill={TOKENS.bg} opacity="0.22" />
    </svg>
  );
}

function TruckBigFilled({ className }: { className?: string }) {
  // Slightly chunkier variant for the bottom-left delivery item in screenshot
  return (
    <svg
      className={className}
      viewBox="0 0 64 48"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6" y="14" width="34" height="20" rx="2.5" />
      <path d="M40 20h11c1 0 2 .4 2.7 1.2l6.2 6.2c.8.8 1.2 1.7 1.2 2.7V34H40V20z" />
      <circle cx="20" cy="38" r="5" />
      <circle cx="50" cy="38" r="5" />
      <circle cx="20" cy="38" r="2.4" fill={TOKENS.bg} opacity="0.22" />
      <circle cx="50" cy="38" r="2.4" fill={TOKENS.bg} opacity="0.22" />
    </svg>
  );
}

function RotateArrows({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 22a18 18 0 1 1-2 22" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 14v10h10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M46 50V40H36" />
    </svg>
  );
}

function PhoneCard({ className }: { className?: string }) {
  // Gray outline icon similar to screenshot
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      aria-hidden="true"
    >
      <rect x="10" y="12" width="26" height="40" rx="3.5" />
      <path strokeLinecap="round" d="M18 20h10" />
      <rect x="28" y="22" width="26" height="30" rx="3.5" />
      <path strokeLinecap="round" d="M28 30h26" />
      <path strokeLinecap="round" d="M34 44h6" />
    </svg>
  );
}

function TshirtWithFb({ className }: { className?: string }) {
  // Matches screenshot: tshirt outline + small FB maroon badge
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      aria-hidden="true"
    >
      {/* tshirt */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M22 14l10 4 10-4 10 8-6 7v23H18V29l-6-7 10-8z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M26 18c0 3 3 5 6 5s6-2 6-5" />

      {/* fb badge */}
      <circle cx="52" cy="18" r="8" fill={TOKENS.primary} stroke="none" />
      <path
        d="M54.1 23v-6.2h2v-2.3h-2c0-2.1.8-3.2 3-3.2V9c-4.2 0-5.6 2.2-5.6 5.2h-1.8v2.3h1.8V23h2.6z"
        fill="#fff"
      />
    </svg>
  );
}

function Leaf({ className }: { className?: string }) {
  // Maroon outline leaf similar to screenshot
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 38C18 16 40 10 56 14c-2 20-16 38-36 38-6 0-10-4-8-14z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 46c10-10 20-16 30-18" />
    </svg>
  );
}

export default function FeaturesGrid() {
  // NOTE: The screenshot text contains some imperfect/placeholder copy.
  // Replace the description strings with your real content as needed.
  const features: Feature[] = [
    // Row 1
    {
      id: "deliveryTop",
      title: "FREE\nDELIVERY",
      description: "Time delivery in\n12:00DT\nDelivery",
      icon: <TruckSmallFilled className="h-11 w-11" />,
      align: "left",
      iconTone: "primary",
    },
    {
      id: "policiesTop",
      title: "EASY Policies",
      description: "Easy return in a city day",
      icon: <RotateArrows className="h-12 w-12" />,
      align: "center",
      iconTone: "muted",
    },
    {
      id: "paymentTop",
      title: "Socure\nPayment",
      description: "Cash / card / mobile",
      icon: <PhoneCard className="h-12 w-12" />,
      align: "left",
      iconTone: "muted",
    },
    {
      id: "stylesTop",
      title: "Over Thousands\nStyles",
      description: "",
      icon: <TshirtWithFb className="h-12 w-12" />,
      align: "center",
      iconTone: "muted",
      href: "/products",
    },

    // Row 2
    {
      id: "deliveryBottom",
      title: "",
      description: "The delivery\n16:00DT\nDelivery",
      icon: <TruckBigFilled className="h-12 w-12" />,
      align: "left",
      iconTone: "primary",
    },
    {
      id: "returnsBottom",
      title: "EASY Returns",
      description: "Easy return in city day",
      icon: <RotateArrows className="h-12 w-12" />,
      align: "center",
      iconTone: "primary",
    },
    {
      id: "paymentBottom",
      title: "Socure\nPayment",
      description: "Cash / card / mobile",
      icon: <PhoneCard className="h-12 w-12" />,
      align: "left",
      iconTone: "muted",
    },
    {
      id: "socialBottom",
      title: "Social Media",
      description: "Explore you need",
      icon: <Leaf className="h-12 w-12" />,
      align: "center",
      iconTone: "primary",
      href: "/social",
    },
  ];

  const FeatureItem = (f: Feature) => {
    const isLeft = f.align === "left";
    const iconColor = f.iconTone === "muted" ? TOKENS.muted : TOKENS.primary;

    return (
      <div className={isLeft ? "flex items-start gap-5" : "flex flex-col items-center text-center"}>
        {/* icon */}
        <div style={{ color: iconColor }} className={isLeft ? "mt-1" : "mb-2"}>
          {f.icon}
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
        <div className="grid grid-cols-2 gap-x-14 gap-y-16 md:grid-cols-4">
          {features.map((f) => {
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
