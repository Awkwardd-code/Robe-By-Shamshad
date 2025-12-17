"use client";

import Link from "next/link";

type Feature = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
};

export default function FeaturesGrid() {
  const features: Feature[] = [
    {
      id: "delivery",
      title: "Free Delivery",
      description: "1–3 days delivery in your area",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h11v10H3V7Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4l3 3v4h-7v-7Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
        </svg>
      ),
    },
    {
      id: "returns",
      title: "Easy Returns",
      description: "Easy return in case of any issue",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 9-9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4v6h6" />
        </svg>
      ),
    },
    {
      id: "payment",
      title: "Secure Payment",
      description: "Cash / card / mobile banking",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 15h2" />
        </svg>
      ),
    },
    {
      id: "styles",
      title: "Thousands of Styles",
      description: "New arrivals every week",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l4-2 4 2v14l-4-2-4 2V7Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6" />
        </svg>
      ),
    },
    {
      id: "support",
      title: "24/7 Support",
      description: "We’re here whenever you need",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 10a6 6 0 0 0-12 0v5a2 2 0 0 0 2 2h1v-7H8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 10h-1v7h1a2 2 0 0 0 2-2v-5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 17v2a2 2 0 0 1-2 2H8" />
        </svg>
      ),
    },
  ];

  return (
    <section className="w-full bg-white py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Minimal header */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
              Why shop with us
            </p>
            <h2 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900">
              Shopping made simple
            </h2>
          </div>

          <Link
            href="/products"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-gray-700"
          >
            Browse products
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* New design: “stepper / timeline” feel */}
        <div className="relative">
          {/* line */}
          <div className="absolute left-4 top-3 bottom-3 hidden md:block w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((f, idx) => {
              const Card = (
                <div className="group relative flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                  {/* index chip */}
                  <div className="hidden md:flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-bold text-gray-700">
                    {String(idx + 1).padStart(2, "0")}
                  </div>

                  {/* icon */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 border border-gray-200 text-[#5b1b1b] transition-colors group-hover:bg-gray-100">
                    {f.icon}
                  </div>

                  {/* text */}
                  <div className="min-w-0">
                    <h3 className="text-sm md:text-base font-semibold text-gray-900">
                      {f.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                      {f.description}
                    </p>

                    {/* subtle underline */}
                    <div className="mt-3 h-px w-12 bg-gradient-to-r from-[#5b1b1b]/40 to-transparent transition-all duration-300 group-hover:w-20" />
                  </div>

                  {/* corner */}
                  <div className="pointer-events-none absolute right-4 top-4 h-2 w-2 rounded-full bg-[#5b1b1b]/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );

              return f.href ? (
                <Link key={f.id} href={f.href} className="block">
                  {Card}
                </Link>
              ) : (
                <div key={f.id}>{Card}</div>
              );
            })}
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 sm:hidden">
          <Link
            href="/products"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            Browse products
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
