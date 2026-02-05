"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const META_CAPI_ENDPOINT = "/api/meta/conversion";

export default function MetaCapi() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = useMemo(
    () => (searchParams ? searchParams.toString() : ""),
    [searchParams]
  );
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    if (lastUrlRef.current === url) return;
    lastUrlRef.current = url;

    const payload = {
      eventName: "PageView",
      eventSourceUrl: window.location.href,
    };

    void fetch(META_CAPI_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
      keepalive: true,
    });
  }, [pathname, queryString]);

  return null;
}
