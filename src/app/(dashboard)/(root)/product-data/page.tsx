import type { Metadata } from "next";
import ProductGridWithSidebar from "./_components/ProductData";

type ProductDataSearchParams = {
  collectionSlug?: string;
  slug?: string;
  collection?: string;
};

function formatCollectionName(slugValue: string) {
  const normalized = slugValue
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  if (!normalized) return "Collection";
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<ProductDataSearchParams>;
}): Promise<Metadata> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const collectionSlug =
    resolvedSearchParams?.collectionSlug ??
    resolvedSearchParams?.slug ??
    resolvedSearchParams?.collection;

  if (collectionSlug) {
    const collectionName = formatCollectionName(collectionSlug);
    return {
      title: `${collectionName} Collection | Robe by Shamshad`,
      description: `Explore the ${collectionName} collection from Robe by Shamshad, a premium clothing brand in Dhaka, Bangladesh.`,
      alternates: {
        canonical: `/product-data?collectionSlug=${encodeURIComponent(collectionSlug)}`,
      },
    };
  }

  return {
    title: "Shop by Category | Robe by Shamshad",
    description:
      "Shop by category and discover premium men and women apparel from Robe by Shamshad in Dhaka, Bangladesh.",
    alternates: {
      canonical: "/product-data",
    },
  };
}

const page = async ({
  searchParams,
}: {
  searchParams?: Promise<ProductDataSearchParams>;
}) => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const collectionSlug =
    resolvedSearchParams?.collectionSlug ??
    resolvedSearchParams?.slug ??
    resolvedSearchParams?.collection;

  return (
    <div>
      <ProductGridWithSidebar collectionSlug={collectionSlug ?? undefined} />
    </div>
  );
};

export default page;
