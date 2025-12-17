import { Suspense } from "react";
import ProductPage from "./_components/ProductPage";

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
    <div className="min-h-[400px] flex items-center justify-center">
      <span className="text-gray-500 animate-pulse">Loading products…</span>
    </div>
  );
}

export default page
