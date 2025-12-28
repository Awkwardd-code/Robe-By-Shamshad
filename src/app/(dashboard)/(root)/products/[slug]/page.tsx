import { Suspense } from "react";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/Product/ProductDetail";
import { fetchProductBySlug, mapProduct } from "@/lib/product-detail";

function ProductDetailSkeleton() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #FBF3E8, #ffffff)" }}
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-3 w-12 rounded bg-gray-200" />
          <div className="h-3 w-3 rounded-full bg-gray-200" />
          <div className="h-3 w-20 rounded bg-gray-200" />
          <div className="h-3 w-3 rounded-full bg-gray-200" />
          <div className="h-3 w-32 rounded bg-gray-200" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="aspect-square rounded-2xl border border-gray-200 bg-gray-100" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`thumb-skeleton-${index}`}
                  className="aspect-square rounded-xl bg-gray-100"
                />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="h-8 w-3/4 rounded bg-gray-200" />
            <div className="h-4 w-1/2 rounded bg-gray-200" />
            <div className="space-y-3">
              <div className="h-6 w-44 rounded bg-gray-200" />
              <div className="h-5 w-56 rounded bg-gray-200" />
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="h-11 w-36 rounded-none bg-gray-200" />
              <div className="h-11 w-36 rounded-none bg-gray-200" />
            </div>
            <div className="space-y-3 border-t border-gray-200 pt-6">
              <div className="h-4 w-2/3 rounded bg-gray-200" />
              <div className="h-4 w-5/6 rounded bg-gray-200" />
              <div className="h-4 w-3/4 rounded bg-gray-200" />
            </div>
          </div>
        </div>

        <div className="mt-12 space-y-4">
          <div className="h-5 w-48 rounded bg-gray-200" />
          <div className="h-24 w-full rounded-2xl bg-gray-100" />
          <div className="h-24 w-full rounded-2xl bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

async function ProductDetailSection({ slug }: { slug: string }) {
  let apiProduct: Record<string, unknown> | null = null;

  try {
    apiProduct = await fetchProductBySlug(slug);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    console.error(`[product-page] Unable to load "${slug}": ${errorMessage}`);
    notFound();
  }

  if (!apiProduct) {
    notFound();
  }

  const product = mapProduct(apiProduct);
  return <ProductDetail product={product} />;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetailSection slug={slug} />
    </Suspense>
  );
}
