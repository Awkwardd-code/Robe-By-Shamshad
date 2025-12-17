"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ComboOfferDetail, {
  ComboOffer as ComboOfferDetailType,
} from "@/components/ComboOffer/ComboOfferDetail";
import { mapComboOffer } from "@/lib/combo-detail-mapper";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string | undefined;

  const [comboDetailData, setComboDetailData] = useState<
    ComboOfferDetailType | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setComboDetailData(null);
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
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm font-medium text-gray-600">
          Loading product details...
        </p>
      </div>
    );
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
