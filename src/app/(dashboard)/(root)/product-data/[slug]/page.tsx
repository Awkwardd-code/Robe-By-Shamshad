"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ComboOfferDetail, {
  ComboOffer as ComboOfferDetailType,
} from "@/components/ComboOffer/ComboOfferDetail";
import { mapComboOffer } from "@/lib/combo-detail-mapper";

function ComboOfferDetailSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <div className="aspect-square bg-gray-100 border border-gray-200 animate-pulse" />

          <div className="space-y-4 animate-pulse">
            <div className="h-6 w-2/3 bg-gray-200 rounded" />
            <div className="h-4 w-1/2 bg-gray-200 rounded" />
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-5/6 bg-gray-200 rounded" />

            <div className="flex flex-wrap gap-3 pt-2">
              <div className="h-11 w-36 bg-gray-200 rounded-none" />
              <div className="h-11 w-36 bg-gray-200 rounded-none" />
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-3 animate-pulse">
          <div className="h-5 w-48 bg-gray-200 rounded" />
          <div className="h-20 w-full bg-gray-200 rounded" />
          <div className="h-20 w-full bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string | undefined;

  const [comboDetailData, setComboDetailData] = useState<
    ComboOfferDetailType | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setComboDetailData(null);
      setLoading(false);
      setError("Invalid product slug.");
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/resolve-slug/${encodeURIComponent(slug)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Product or combo not found");
          }
          throw new Error(`Failed to load data (${response.status})`);
        }

        const result = await response.json();

        if (!isMounted) return;

        if (result.type === "combo") {
          setComboDetailData(mapComboOffer(result.data));
        } else if (result.type === "product") {
          const productSlug = result?.data?.slug ?? result?.data?._id ?? slug;
          router.replace(`/products/${encodeURIComponent(String(productSlug))}`);
          return;
        } else {
          const target =
            result.type === "collection"
              ? `/product-data?collectionSlug=${encodeURIComponent(slug)}`
              : `/product-data`;

          router.replace(target);
          return;
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Combo fetch failed:", err);
        setComboDetailData(null);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load combo offer details."
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [slug]);

  if (loading) {
    return <ComboOfferDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm font-medium text-red-600">{error}</p>
      </div>
    );
  }

  if (!comboDetailData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm font-medium text-gray-600">
          No combo offer found for this slug.
        </p>
      </div>
    );
  }

  return <ComboOfferDetail comboOffer={comboDetailData} />;
}
