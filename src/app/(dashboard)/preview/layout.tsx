import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Style Course Preview | Robe by Shamshad",
  description:
    "Preview page for the free 5-day style email course by Robe by Shamshad.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PreviewLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F5EFEA] text-[#2f2622]">
      {children}
    </div>
  );
}
