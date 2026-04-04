import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Press Kit | Robe by Shamshad",
  description:
    "Media resources and brand information for press and partnership inquiries.",
  alternates: {
    canonical: "/press-kit",
  },
};

export default function PressKitPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-16 text-[#2f2520]">
      <h1 className="text-3xl font-semibold tracking-tight">Press Kit</h1>
      <p className="mt-4 text-sm leading-7 text-[#5f4f45]">
        This page contains official brand information for editorial features,
        collaborations, and media coverage requests.
      </p>
      <p className="mt-4 text-sm leading-7 text-[#5f4f45]">
        For logo files, product imagery, and interview requests, please contact
        us via the Contact page.
      </p>
    </main>
  );
}
