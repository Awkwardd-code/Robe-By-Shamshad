/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Package,
  ShoppingCart,
  Home,
  Clock,
  Truck,
  Trash2,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

import { useCommerce } from "@/context/CommerceContext";
import { useBuyNow } from "@/context/BuyNowContext";
import {
  OrderSource,
  getOrderSourceFromToken,
  cleanupOldOrderSources,
  clearCurrentOrderSource,
} from "@/lib/orderSourceToken";

type OrderAnalyticsEntry = {
  orderId: string;
  source: OrderSource;
  timestamp: number;
  date: string;
};

type WindowWithGtag = Window & {
  gtag?: (...args: unknown[]) => void;
};

type ProductSuggestion = {
  _id: string;
  name: string;
  brand?: string;
  slug: string;
  media?: {
    thumbnail?: string;
    gallery?: string[];
  };
  pricing?: {
    current?: {
      currency?: string;
      value?: number;
    };
    original?: {
      value?: number;
    };
  };
};

const formatPrice = (value?: number): string => {
  if (typeof value !== "number") return "BDT 0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900&q=80&auto=format&fit=crop";

const trackOrderCompletion = (orderId: string, source: OrderSource) => {
  console.log(`Order ${orderId} completed from ${source} flow`);

  const storedAnalytics = localStorage.getItem("order_analytics");
  const orderAnalytics: OrderAnalyticsEntry[] = storedAnalytics
    ? (JSON.parse(storedAnalytics) as OrderAnalyticsEntry[])
    : [];

  orderAnalytics.push({
    orderId,
    source,
    timestamp: Date.now(),
    date: new Date().toISOString(),
  });

  if (orderAnalytics.length > 50) orderAnalytics.shift();
  localStorage.setItem("order_analytics", JSON.stringify(orderAnalytics));

  if (typeof window !== "undefined") {
    const win = window as WindowWithGtag;
    if (typeof win.gtag === "function") {
      win.gtag("event", "purchase", {
        transaction_id: orderId,
        currency: "BDT",
        items: [],
        order_source: source,
      });
    }
  }
};

/**
 * ✅ Safety-net cleanup (BuyNow "4 sessions")
 * This is in addition to BuyNowProvider.forceResetContext().
 */
const hardCleanBuyNowStorage = () => {
  if (typeof window === "undefined") return;

  const BUY_NOW_SESSION_KEYS = [
    "sn-buy-now-selection",
    "sn-buy-now-epoch",
    "sn-buy-now-lock-until",
  ];

  const BUY_NOW_LOCAL_KEYS = ["sn-buy-now-reset-ts"];

  try {
    BUY_NOW_SESSION_KEYS.forEach((k) => sessionStorage.removeItem(k));
    BUY_NOW_LOCAL_KEYS.forEach((k) => localStorage.removeItem(k));

    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("token_buy_now") || k.startsWith("sn-buy-now")) {
        localStorage.removeItem(k);
      }
    });

    try {
      const recentTokens = JSON.parse(
        localStorage.getItem("recent_order_tokens") || "[]"
      );
      const filtered = (recentTokens as any[]).filter(
        (t) => !t?.token?.startsWith?.("buy_now_")
      );
      localStorage.setItem("recent_order_tokens", JSON.stringify(filtered));
    } catch {}

    console.log("[BuyNow Reset] hardCleanBuyNowStorage done");
  } catch (err) {
    console.error("[BuyNow Reset] hardCleanBuyNowStorage failed:", err);
  }
};

/**
 * ✅ Clear ONLY directCheckout in CommerceContext persisted state
 * Key used by your CommerceProvider: "sn-commerce-state-v1"
 */
const hardCleanCommerceDirectCheckout = () => {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("sn-commerce-state-v1");
    if (!raw) return;

    const parsed = JSON.parse(raw) as any;

    const next = {
      ...parsed,
      version: 1,
      updatedAt: Date.now(),
      directCheckout: [],
    };

    localStorage.setItem("sn-commerce-state-v1", JSON.stringify(next));
    console.log("[Commerce Reset] directCheckout cleared in sn-commerce-state-v1");
  } catch (e) {
    console.warn("[Commerce Reset] failed clearing directCheckout", e);
  }
};

// STRICT verification (no generic includes("selection"))
const verifyBuyNowCleared = (): boolean => {
  try {
    const sessionHasSelection = !!sessionStorage.getItem("sn-buy-now-selection");

    const localKeys = Object.keys(localStorage);
    const hasBuyNowLocalKeys = localKeys.some(
      (k) => k.startsWith("token_buy_now") || k.startsWith("sn-buy-now")
    );

    let hasBuyNowRecentTokens = false;
    try {
      const recentTokens = JSON.parse(
        localStorage.getItem("recent_order_tokens") || "[]"
      ) as any[];
      hasBuyNowRecentTokens = recentTokens.some((t) =>
        t?.token?.startsWith?.("buy_now_")
      );
    } catch {}

    return !sessionHasSelection && !hasBuyNowLocalKeys && !hasBuyNowRecentTokens;
  } catch {
    return false;
  }
};

const verifyCartCleared = (): boolean => {
  try {
    const sessionKeys = Object.keys(sessionStorage);
    const cartSessionKeys = sessionKeys.filter(
      (k) => k.includes("cart") || k.includes("commerce") || k.includes("checkout")
    );

    const localKeys = Object.keys(localStorage);
    const cartLocalKeys = localKeys.filter(
      (k) =>
        k.includes("cart") ||
        k.includes("commerce") ||
        k.startsWith("token_cart") ||
        k === "sn-commerce-state-v1"
    );

    let hasCartRecentTokens = false;
    try {
      const recentTokens = JSON.parse(
        localStorage.getItem("recent_order_tokens") || "[]"
      ) as any[];
      hasCartRecentTokens = recentTokens.some((t) =>
        t?.token?.startsWith?.("cart_")
      );
    } catch {}

    return cartSessionKeys.length === 0 && cartLocalKeys.length === 0 && !hasCartRecentTokens;
  } catch {
    return false;
  }
};

function ThankYouInner() {
  const searchParams = useSearchParams();

  const brand = { name: "ROBE", sub: "BY SHAMSHAD" };

  const [productSuggestions, setProductSuggestions] = useState<ProductSuggestion[]>([]);
  const [productLoading, setProductLoading] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);

  const [orderSource, setOrderSource] = useState<OrderSource>("unknown");
  const [isValidating, setIsValidating] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<{
    buyNow: boolean;
    cart: boolean;
    message?: string;
  }>({ buyNow: false, cart: false });

  const {
    clearCart,
    clearDirectCheckout,
    cleanupOrderTokenStorage: cleanupCommerceTokens,
    clearOrderTokenSession: clearCommerceTokenSession,
  } = useCommerce();

  const { forceResetContext: forceResetBuyNow } = useBuyNow();

  const orderIdFromQuery = searchParams.get("orderId");
  const sourceFromQuery = searchParams.get("source") as OrderSource;
  const tokenFromQuery = searchParams.get("token");

  const orderNumber =
    orderIdFromQuery || `ORD-${Math.floor(Math.random() * 900000) + 100000}`;

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadProducts = async () => {
      setProductLoading(true);
      setProductError(null);
      try {
        const response = await fetch("/api/products?limit=4", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Failed to load featured products");
        }
        const data = await response.json();
        if (!isMounted) return;
        const products = Array.isArray(data.products) ? data.products : [];
        setProductSuggestions(products);
      } catch (error: unknown) {
        if (!isMounted) return;
        const message =
          error instanceof Error
            ? error.message
            : "Failed to fetch featured products";
        setProductError(message);
      } finally {
        if (!isMounted) return;
        setProductLoading(false);
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const scheduleReset = (fn: () => void) => {
    if (typeof window === "undefined") {
      fn();
      return;
    }
    window.setTimeout(fn, 0);
  };

  const performResetForSource = (source: OrderSource) => {
    scheduleReset(() => {
      console.log(`[ThankYou] Resetting context for source: ${source}`);

      if (source === "buy_now") {
        forceResetBuyNow();
        hardCleanBuyNowStorage();

        clearDirectCheckout();
        hardCleanCommerceDirectCheckout();

        setTimeout(() => {
          const ok = verifyBuyNowCleared();
          setVerificationStatus((prev) => ({ ...prev, buyNow: ok }));
        }, 250);

        return;
      }

      if (source === "cart") {
        clearCart();
        clearDirectCheckout();
        cleanupCommerceTokens();
        clearCommerceTokenSession();

        setTimeout(() => {
          const ok = verifyCartCleared();
          setVerificationStatus((prev) => ({ ...prev, cart: ok }));
        }, 250);

        return;
      }

      // unknown: reset both defensively
      forceResetBuyNow();
      hardCleanBuyNowStorage();
      clearCart();
      clearDirectCheckout();
      hardCleanCommerceDirectCheckout();
      cleanupCommerceTokens();
      clearCommerceTokenSession();

      setTimeout(() => {
        const buyOk = verifyBuyNowCleared();
        const cartOk = verifyCartCleared();
        setVerificationStatus({
          buyNow: buyOk,
          cart: cartOk,
          message: "Both contexts reset as precaution",
        });
      }, 350);
    });
  };

  useEffect(() => {
    const validateAndTrack = () => {
      cleanupOldOrderSources();

      let validatedSource: OrderSource = "unknown";

      if (tokenFromQuery) {
        const tokenData = getOrderSourceFromToken(tokenFromQuery);
        validatedSource = tokenData.source;

        if (validatedSource === "unknown") {
          if (tokenFromQuery.startsWith("cart_")) validatedSource = "cart";
          if (tokenFromQuery.startsWith("buy_now_")) validatedSource = "buy_now";
        }
      } else if (sourceFromQuery === "buy_now" || sourceFromQuery === "cart") {
        validatedSource = sourceFromQuery;
      }

      setOrderSource(validatedSource);

      performResetForSource(validatedSource);

      trackOrderCompletion(orderNumber, validatedSource);

      clearCurrentOrderSource();

      const confirmedOrders = JSON.parse(
        localStorage.getItem("confirmed_orders") || "[]"
      ) as string[];
      if (!confirmedOrders.includes(orderNumber)) {
        confirmedOrders.push(orderNumber);
        localStorage.setItem(
          "confirmed_orders",
          JSON.stringify(confirmedOrders.slice(-20))
        );
      }

      setIsValidating(false);

      console.log("[ThankYou] Validation complete:", {
        source: validatedSource,
        orderId: orderNumber,
      });
    };

    validateAndTrack();
  }, [orderNumber, sourceFromQuery, tokenFromQuery]);

  // Delivery date
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + Math.floor(Math.random() * 3) + 5);

  const formattedDeliveryDate = deliveryDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const currentDate = new Date();
  const formattedOrderTime = currentDate.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7efe3] px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5a1f2a] mx-auto"></div>
          <p className="mt-4 text-[#6b4b4b]">Validating your order...</p>
          <p className="text-xs text-[#7a5b5b] mt-2">Clearing shopping context...</p>
        </div>
      </div>
    );
  }

  const contextBadge =
    orderSource === "buy_now" ? (
      verificationStatus.buyNow ? (
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-4 py-2 text-xs font-semibold text-emerald-800 border border-emerald-600/20">
          <ShieldCheck className="h-4 w-4" />
          Buy Now Context Cleared
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-600/10 px-4 py-2 text-xs font-semibold text-amber-900 border border-amber-700/20">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Clearing Buy Now Context...
        </div>
      )
    ) : orderSource === "cart" ? (
      verificationStatus.cart ? (
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-4 py-2 text-xs font-semibold text-emerald-800 border border-emerald-600/20">
          <ShieldCheck className="h-4 w-4" />
          Cart Cleared
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-600/10 px-4 py-2 text-xs font-semibold text-amber-900 border border-amber-700/20">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Clearing Cart...
        </div>
      )
    ) : (
      <div className="inline-flex items-center gap-2 rounded-full bg-[#fbf4ea] px-4 py-2 text-xs font-semibold text-[#6b4b4b] border border-[#e4d4c6]">
        <AlertCircle className="h-4 w-4" />
        Order source unknown
      </div>
    );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7efe3]">
      {/* subtle floral corners */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.18]">
        <div
          className="absolute -left-24 -top-24 h-72 w-72 rotate-12"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 30%, rgba(120,53,15,0.20) 0, transparent 55%), radial-gradient(circle at 70% 70%, rgba(120,53,15,0.12) 0, transparent 60%)",
          }}
        />
        <div
          className="absolute -right-24 -top-24 h-72 w-72 -rotate-12"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 30%, rgba(120,53,15,0.16) 0, transparent 58%), radial-gradient(circle at 70% 70%, rgba(120,53,15,0.10) 0, transparent 62%)",
          }}
        />
        <div
          className="absolute -left-28 -bottom-28 h-80 w-80 -rotate-12"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 30%, rgba(120,53,15,0.14) 0, transparent 58%), radial-gradient(circle at 70% 70%, rgba(120,53,15,0.08) 0, transparent 62%)",
          }}
        />
        <div
          className="absolute -right-28 -bottom-28 h-80 w-80 rotate-12"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 30%, rgba(120,53,15,0.14) 0, transparent 58%), radial-gradient(circle at 70% 70%, rgba(120,53,15,0.08) 0, transparent 62%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Top brand */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex flex-col items-center">
            <div className="text-3xl font-semibold tracking-[0.25em] text-[#4a1f1f]">
              {brand.name}
            </div>
            <div className="mt-1 text-[10px] font-medium tracking-[0.35em] text-[#6b4b4b]">
              {brand.sub}
            </div>
          </div>
        </motion.header>

        {/* Main message */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="mt-10 text-center"
        >
          <div className="mx-auto inline-flex items-center justify-center rounded-full bg-[#fbf4ea] px-4 py-2 border border-[#e4d4c6] shadow-[0_16px_40px_-30px_rgba(0,0,0,0.35)]">
            <CheckCircle className="h-5 w-5 text-[#5a1f2a]" />
            <span className="ml-2 text-sm font-semibold text-[#4a1f1f]">
              Order Confirmed
            </span>
          </div>

          <h1 className="mt-6 font-serif text-5xl leading-none text-[#4a1f1f] sm:text-6xl">
            Thank You
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-[#6b4b4b] sm:text-base">
            We truly appreciate your trust in{" "}
            <span className="font-semibold">ROBE by Shamshad</span>.
            Your order has been placed successfully.
          </p>

          {/* Order info card */}
          <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-[#e4d4c6] bg-white p-6 text-left shadow-[0_16px_40px_-30px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs font-semibold tracking-[0.22em] text-[#a9877a] uppercase">
                  Order Number
                </div>
                <div className="mt-2 inline-flex items-center rounded-lg bg-[#f7efe3] px-4 py-2 font-semibold text-[#4a1f1f]">
                  #{orderNumber}
                </div>

                <div className="mt-4 space-y-2 text-sm text-[#6b4b4b]">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#a9877a]" />
                    <span>Placed: {formattedOrderTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-[#a9877a]" />
                    <span>Estimated delivery: {formattedDeliveryDate}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {orderSource === "buy_now" ? (
                      <>
                        <Package className="h-4 w-4 text-[#a9877a]" />
                        <span>Source: Buy Now Fast Checkout</span>
                      </>
                    ) : orderSource === "cart" ? (
                      <>
                        <ShoppingCart className="h-4 w-4 text-[#a9877a]" />
                        <span>Source: Shopping Cart</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-[#a9877a]" />
                        <span>Source: Unknown</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3">
                {contextBadge}

                {(orderSource === "buy_now" || orderSource === "cart") && (
                  <div className="inline-flex items-center gap-2 text-xs text-[#7a5b5b]">
                    <Trash2 className="h-4 w-4 text-[#a9877a]" />
                    <span>Selections, tokens & storage cleanup applied</span>
                  </div>
                )}

                {verificationStatus.message && (
                  <div className="text-xs text-[#7a5b5b]">{verificationStatus.message}</div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/products" className="flex-1">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-full bg-[#5a1f2a] px-8 py-3 text-sm font-semibold tracking-wide text-white shadow-[0_12px_30px_-18px_rgba(90,31,42,0.75)] transition hover:bg-[#6a2331] flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Continue Shopping
                </motion.button>
              </Link>

              <div className="grid flex-1 grid-cols-2 gap-3">
                <Link
                  href="/"
                  className="rounded-full border border-[#e4d4c6] bg-white px-6 py-3 text-sm font-semibold text-[#4a1f1f] hover:bg-[#fbf4ea] transition flex items-center justify-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Home
                </Link>
                <Link
                  href="/cart"
                  className="rounded-full border border-[#e4d4c6] bg-white px-6 py-3 text-sm font-semibold text-[#4a1f1f] hover:bg-[#fbf4ea] transition flex items-center justify-center gap-2"
                >
                  <Package className="h-4 w-4" />
                  View Cart
                </Link>
              </div>
            </div>

            <div className="mt-6 border-t border-[#e4d4c6] pt-4 text-center text-xs text-[#7a5b5b]">
              Need help?{" "}
              <a href="tel:+8801756266616" className="font-semibold text-[#5a1f2a] hover:underline">
                +880 1756 266616
              </a>{" "}
              or{" "}
              <a href="mailto:mangoesofrajshahi@gmail.com" className="font-semibold text-[#5a1f2a] hover:underline">
                mangoesofrajshahi@gmail.com
              </a>
            </div>
          </div>

          {/* Ornamental divider */}
          <div className="mx-auto mt-10 flex max-w-3xl items-center gap-4">
            <div className="h-px flex-1 bg-[#d8c6b7]" />
            <div className="flex items-center gap-2 text-[#a9877a]">
              <span className="h-1.5 w-1.5 rotate-45 bg-[#a9877a]" />
              <span className="h-2.5 w-2.5 rotate-45 bg-[#a9877a]" />
              <span className="h-1.5 w-1.5 rotate-45 bg-[#a9877a]" />
            </div>
            <div className="h-px flex-1 bg-[#d8c6b7]" />
          </div>
        </motion.section>

        {/* Featured products */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mt-10"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#4a1f1f]">
              Handpicked inspirations
            </h2>
            <Link
              href="/products"
              className="text-xs font-semibold uppercase tracking-[0.3em] text-[#a9877a] hover:text-[#5a1f2a]"
            >
              Browse catalogue
            </Link>
          </div>

          <div className="mt-6">
            {productLoading ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-[#d8c6b7] bg-white/70 p-6 text-sm font-medium text-[#7a5b5b]">
                Loading curated products...
              </div>
            ) : productError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                {productError}
              </div>
            ) : !productSuggestions.length ? (
              <div className="rounded-2xl border border-[#d8c6b7] bg-white/70 p-6 text-sm text-[#7a5b5b]">
                No featured products available right now.
              </div>
            ) : (
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-4 snap-x snap-mandatory px-1">
                  {productSuggestions.map((product) => {
                    const thumbnail =
                      product.media?.thumbnail ||
                      product.media?.gallery?.[0] ||
                      DEFAULT_PRODUCT_IMAGE;
                    const price =
                      product.pricing?.current?.value ?? product.pricing?.original?.value;

                    return (
                      <Link
                        href={`/products/${product.slug || product._id}`}
                        key={product._id}
                        className="snap-start shrink-0 overflow-hidden rounded-2xl border border-[#d8c6b7] bg-white p-4 shadow-[0_18px_42px_-30px_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:shadow-[0_20px_48px_-28px_rgba(0,0,0,0.35)]"
                        style={{
                          minWidth:
                            "min(220px, calc((100vw - 4rem) / 4))",
                        }}
                      >
                        <div className="relative aspect-5/4 w-full overflow-hidden rounded-xl bg-[#f0ede8]">
                          <Image
                            src={thumbnail}
                            alt={product.name}
                            fill
                            sizes="(max-width: 640px) 100vw, 50vw"
                            className="object-cover transition duration-500 group-hover:scale-[1.03]"
                          />
                        </div>
                        <div className="mt-4 space-y-1 text-left">
                          <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#a9877a]">
                            {product.brand || "RBS"}
                          </p>
                          <h3 className="text-base font-semibold text-[#4a1f1f]">
                            {product.name}
                          </h3>
                          <p className="text-sm font-semibold text-[#4a1f1f]">
                            {formatPrice(price)}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.section>




      </div>
    </div>
  );
}

export default function ThankYouPageWithOrderLogic() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f7efe3]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5a1f2a] mx-auto"></div>
            <p className="mt-4 text-[#6b4b4b]">Loading confirmation...</p>
          </div>
        </div>
      }
    >
      <ThankYouInner />
    </Suspense>
  );
}
