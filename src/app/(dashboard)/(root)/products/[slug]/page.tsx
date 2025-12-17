import { notFound } from "next/navigation";
import ProductDetail from "@/components/Product/ProductDetail";
import { fetchProductBySlug, mapProduct } from "@/lib/product-detail";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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
