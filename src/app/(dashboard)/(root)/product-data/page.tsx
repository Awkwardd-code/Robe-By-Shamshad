import React from "react";
import ProductGridWithSidebar from "./_components/ProductData";

const page = async ({
  searchParams,
}: {
  searchParams?: Promise<{ collectionSlug?: string; slug?: string; collection?: string }>;
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
