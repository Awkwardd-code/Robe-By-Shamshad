import type { Metadata } from "next";
import { Suspense } from "react";
import ProductPage from "./_components/ProductPage";

export const metadata: Metadata = {
  title: "Products | Robe by Shamshad",
  description:
    "Browse premium clothing and apparel by Robe by Shamshad, crafted for modern style in Dhaka, Bangladesh.",
  alternates: {
    canonical: "/products",
  },
};

const page = () => {
  return (
    <div>
      <Suspense fallback={<ProductPageFallback />}>
        <ProductPage />
      </Suspense>
    </div>
  );
};

function ProductPageFallback() {
  return (
    <div className="min-h-100 flex items-center justify-center">
      <span className="text-gray-500 animate-pulse">Loading products…</span>
    </div>
  );
}

export default page;
