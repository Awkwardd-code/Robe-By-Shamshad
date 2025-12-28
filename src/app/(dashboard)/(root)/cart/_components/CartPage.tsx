"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { X, Undo, Plus, Minus, Package } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  useCommerce,
  type AppliedCoupon,
  type CartEntry,
} from "@/context/CommerceContext";
import { Skeleton } from "@/components/ui/skeleton";

const currencyFormatter = new Intl.NumberFormat("bn-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

interface CouponSummary {
  _id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  discountPercentage?: number;
  discountedPrice?: number;
}

type AvailableCoupon = {
  id: string;
  code: string;
  name?: string;
  discountPercentage?: number;
  discountedPrice?: number;
};

// ---------- UI helpers for “Woo-style” cart ----------
const CART_COUPON_THRESHOLD_BDT = 20000;
const CART_COUPON_DISCOUNT_PERCENT = 10;
const CART_COUPON_SOURCE = "cart_threshold_10";
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const pct = (num: number, den: number) => (den <= 0 ? 0 : (num / den) * 100);

const formatCouponBenefit = (coupon: {
  discountPercentage?: number;
  discountedPrice?: number;
}) => {
  if (coupon.discountPercentage && coupon.discountPercentage > 0) {
    return `${coupon.discountPercentage}% off`;
  }
  if (coupon.discountedPrice && coupon.discountedPrice > 0) {
    return `Pay ${formatCurrency(coupon.discountedPrice)}`;
  }
  return "Coupon";
};

const formatAppliedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function CartPage() {
  const {
    cartItems,
    addToCart,
    removeFromCart,
    appliedCoupon,
    applyCoupon,
    clearCoupon,
  } = useCommerce();
  const { user, isLoading: isAuthLoading } = useAuth();
  const isAuthenticated = Boolean(user);

  const [couponCode, setCouponCode] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [availableCouponsError, setAvailableCouponsError] = useState<string | null>(
    null
  );
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isFetchingCoupons, setIsFetchingCoupons] = useState(false);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isCreatingThresholdCoupon, setIsCreatingThresholdCoupon] = useState(false);
  const [showUndoNotification, setShowUndoNotification] = useState(false);
  const [removedItem, setRemovedItem] = useState<CartEntry | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSuggestedCouponRef = useRef<string>("");
  const lastThresholdEligibilityRef = useRef(false);

  const subtotal = cartItems.reduce(
    (sum, entry) => sum + entry.product.price * entry.quantity,
    0
  );
  const discountAmount = (() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountPercentage && appliedCoupon.discountPercentage > 0) {
      return Math.round((subtotal * appliedCoupon.discountPercentage) / 100);
    }
    if (appliedCoupon.discountedPrice && appliedCoupon.discountedPrice > 0) {
      return Math.max(0, subtotal - appliedCoupon.discountedPrice);
    }
    return 0;
  })();
  const total = Math.max(0, subtotal - discountAmount);

  useEffect(() => {
    if (!appliedCoupon) return;
    if (appliedCoupon.discountAmount === discountAmount) return;
    applyCoupon({
      ...appliedCoupon,
      discountAmount,
    });
  }, [appliedCoupon, discountAmount, applyCoupon]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      if (appliedCoupon) clearCoupon();
      setCouponCode("");
      setCouponError(null);
      setAvailableCoupons([]);
      setAvailableCouponsError(null);
      lastSuggestedCouponRef.current = "";
    }
  }, [isAuthLoading, isAuthenticated, appliedCoupon, clearCoupon]);

  // Threshold coupon progress bar
  const remainingForCoupon = Math.max(0, CART_COUPON_THRESHOLD_BDT - subtotal);
  const progress = clamp(pct(subtotal, CART_COUPON_THRESHOLD_BDT), 0, 100);
  const isThresholdEligible = cartItems.length > 0 && remainingForCoupon <= 0;
  const showCouponSection =
    isAuthenticated &&
    (appliedCoupon ||
      isFetchingCoupons ||
      availableCouponsError ||
      availableCoupons.length > 0 ||
      isThresholdEligible ||
      isCreatingThresholdCoupon);

  const handleRemoveItem = (id: string) => {
    const entry = cartItems.find((item) => item.product.id === id);
    if (!entry) return;

    setRemovedItem(entry);
    removeFromCart(id);
    setShowUndoNotification(true);

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setShowUndoNotification(false);
      setRemovedItem(null);
    }, 5000);
  };

  const handleUndoRemove = () => {
    if (!removedItem) return;
    addToCart(removedItem.product, removedItem.quantity);
    setShowUndoNotification(false);
    setRemovedItem(null);
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    const entry = cartItems.find((item) => item.product.id === id);
    if (!entry || entry.quantity === newQuantity) return;

    // keeps your existing behaviour intact
    removeFromCart(id);
    addToCart(entry.product, newQuantity);
  };

  const applyCouponToCart = async (code: string) => {
    if (!user) {
      setCouponError("Please log in to apply coupons.");
      return;
    }
    const normalized = code.trim();
    if (!normalized) {
      setCouponError("Enter a coupon code.");
      return;
    }
    if (cartItems.length === 0) {
      setCouponError("Add items to the cart before applying a coupon.");
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError(null);
    try {
      const response = await fetch("/api/coupons/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalized, subtotal }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to apply coupon");
      }

      const data = await response.json();
      const coupon = data?.coupon as CouponSummary | undefined;
      const redemption = data?.redemption as
        | { appliedAt?: string; discountAmount?: number }
        | undefined;

      if (!coupon) {
        throw new Error("Invalid coupon response");
      }

      const applied: AppliedCoupon = {
        id: coupon._id,
        code: coupon.code,
        name: coupon.name,
        discountPercentage: coupon.discountPercentage,
        discountedPrice: coupon.discountedPrice,
        appliedAt: redemption?.appliedAt || new Date().toISOString(),
        discountAmount:
          typeof redemption?.discountAmount === "number"
            ? redemption.discountAmount
            : undefined,
      };

      applyCoupon(applied);
      setCouponCode("");
      void loadAvailableCoupons({ allowWhenApplied: true });
    } catch (error: any) {
      setCouponError(error?.message || "Failed to apply coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleApplyCoupon = () => {
    applyCouponToCart(couponCode);
  };

  const suggestCouponCode = useCallback(
    (nextCode: string, allowWhenApplied = false) => {
      if (appliedCoupon && !allowWhenApplied) return;
      const trimmed = couponCode.trim();
      const hasManualEntry =
        trimmed.length > 0 && trimmed !== lastSuggestedCouponRef.current;
      if (hasManualEntry) return;
      setCouponCode(nextCode);
      lastSuggestedCouponRef.current = nextCode;
    },
    [appliedCoupon, couponCode]
  );

  const loadAvailableCoupons = useCallback(
    async (options?: { allowWhenApplied?: boolean }) => {
      if (!isAuthenticated) {
        setAvailableCoupons([]);
        setAvailableCouponsError(null);
        lastSuggestedCouponRef.current = "";
        return;
      }

      setIsFetchingCoupons(true);
      setAvailableCouponsError(null);
      try {
        const response = await fetch("/api/coupons/available?limit=6", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || "Failed to load coupons");
        }
        const data = await response.json();
        const rawCoupons = Array.isArray(data?.coupons) ? data.coupons : [];
        const normalized = rawCoupons
          .map((coupon: any): AvailableCoupon => {
            const id =
              typeof coupon._id === "string" ? coupon._id : String(coupon._id ?? "");
            return {
              id,
              code: typeof coupon.code === "string" ? coupon.code : "",
              name: typeof coupon.name === "string" ? coupon.name : "",
              discountPercentage:
                typeof coupon.discountPercentage === "number"
                  ? coupon.discountPercentage
                  : undefined,
              discountedPrice:
                typeof coupon.discountedPrice === "number"
                  ? coupon.discountedPrice
                  : undefined,
            };
          })
          .filter((coupon: AvailableCoupon) => coupon.code.trim().length > 0);

        setAvailableCoupons(normalized);
        const nextCode = normalized[0]?.code ?? "";
        suggestCouponCode(nextCode, options?.allowWhenApplied ?? false);
      } catch (error: any) {
        setAvailableCoupons([]);
        setAvailableCouponsError(error?.message || "Failed to load coupons");
        if (!couponCode.trim() || couponCode === lastSuggestedCouponRef.current) {
          setCouponCode("");
          lastSuggestedCouponRef.current = "";
        }
      } finally {
        setIsFetchingCoupons(false);
      }
    },
    [isAuthenticated, suggestCouponCode, couponCode]
  );

  const ensureThresholdCoupon = useCallback(async () => {
    if (!isAuthenticated) return;
    if (!isThresholdEligible) return;
    if (appliedCoupon) return;
    if (isCreatingThresholdCoupon) return;

    setIsCreatingThresholdCoupon(true);
    try {
      const response = await fetch("/api/coupons/threshold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtotal, source: CART_COUPON_SOURCE }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to create coupon");
      }

      const data = await response.json();
      if (data?.coupon?.code) {
        await loadAvailableCoupons({ allowWhenApplied: true });
      }
    } catch (error) {
      console.warn("Unable to create threshold coupon", error);
    } finally {
      setIsCreatingThresholdCoupon(false);
    }
  }, [
    isAuthenticated,
    isThresholdEligible,
    appliedCoupon,
    isCreatingThresholdCoupon,
    subtotal,
    loadAvailableCoupons,
  ]);

  const handleRemoveCoupon = () => {
    clearCoupon();
    setCouponError(null);
    void loadAvailableCoupons({ allowWhenApplied: true });
  };

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      setAvailableCoupons([]);
      setAvailableCouponsError(null);
      lastSuggestedCouponRef.current = "";
      return;
    }

    void loadAvailableCoupons();
  }, [isAuthLoading, isAuthenticated, loadAvailableCoupons]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      lastThresholdEligibilityRef.current = false;
      return;
    }

    if (!isThresholdEligible || appliedCoupon) {
      lastThresholdEligibilityRef.current = false;
      return;
    }

    if (lastThresholdEligibilityRef.current) return;
    lastThresholdEligibilityRef.current = true;
    void ensureThresholdCoupon();
  }, [
    isAuthLoading,
    isAuthenticated,
    isThresholdEligible,
    appliedCoupon,
    ensureThresholdCoupon,
  ]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb (Woo-style) */}
      <div className="border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <nav className="text-sm text-gray-600">
            <Link href="/" className="hover:text-gray-900">
              Home
            </Link>
            <span className="mx-2 text-gray-400">›</span>
            <span className="text-gray-900">Cart</span>
          </nav>
        </div>
      </div>

      {/* Undo Notification (kept functional; styled to match simpler theme) */}
      <AnimatedNotification
        show={showUndoNotification}
        onUndo={handleUndoRemove}
        removedItem={removedItem}
      />

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* LEFT: Notices + Cart table + Coupon */}
          <div className="lg:col-span-2">
            {/* Remove notice area is handled by AnimatedNotification */}

            {/* Threshold coupon notice */}
            {cartItems.length > 0 && (
              <div className="mb-8 border border-red-200 bg-red-50 px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center border border-red-200 bg-white">
                    <Package className="h-4 w-4 text-gray-700" />
                  </div>
                  <div className="flex-1">
                    {remainingForCoupon > 0 ? (
                      <p className="text-sm font-semibold text-gray-900">
                        Add{" "}
                        <span className="text-red-600">
                          {formatCurrency(remainingForCoupon)}
                        </span>{" "}
                        to cart and unlock {CART_COUPON_DISCOUNT_PERCENT}% off!
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-gray-900">
                        You unlocked a{" "}
                        <span className="text-red-600">
                          {CART_COUPON_DISCOUNT_PERCENT}% off coupon!
                        </span>
                      </p>
                    )}

                    <div className="mt-3 h-2 w-full bg-red-200/50">
                      <div
                        className="h-2 bg-red-600"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cart table (classic, minimal radius) */}
            <div className="border border-gray-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-180 text-sm">
                  <thead className="border-b border-gray-200">
                    <tr className="text-gray-600">
                      <th className="px-5 py-4 text-left font-semibold">Product</th>
                      <th className="px-5 py-4 text-right font-semibold">Price</th>
                      <th className="px-5 py-4 text-center font-semibold">Quantity</th>
                      <th className="px-5 py-4 text-right font-semibold">Subtotal</th>
                      <th className="px-5 py-4 text-center font-semibold" aria-label="Remove" />
                    </tr>
                  </thead>

                  <tbody>
                    {cartItems.map((entry) => {
                      const p = entry.product;
                      const rowSubtotal = p.price * entry.quantity;

                      return (
                        <motion.tr
                          key={p.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border-b border-gray-200 last:border-b-0"
                        >
                          {/* Product */}
                          <td className="px-5 py-5">
                            <div className="flex items-center gap-4">
                              <div className="relative h-16 w-16 overflow-hidden bg-gray-100">
                                <Image
                                  src={p.image || "/images/placeholder.jpg"}
                                  alt={p.name}
                                  fill
                                  className="object-cover"
                                  sizes="64px"
                                />
                              </div>

                              <div className="min-w-0">
                                <div className="font-bold uppercase text-gray-900 line-clamp-2">
                                  {p.name}
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                  {p.category ? (
                                    <span className="mr-3">Category: {p.category}</span>
                                  ) : null}
                                  {p.unit ? <span>Unit: {p.unit}</span> : null}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Price */}
                          <td className="px-5 py-5 text-right font-semibold text-gray-900">
                            {formatCurrency(p.price)}
                          </td>

                          {/* Quantity */}
                          <td className="px-5 py-5">
                            <div className="mx-auto flex w-fit items-center border border-gray-300 bg-white">
                              <button
                                onClick={() => updateQuantity(p.id, entry.quantity - 1)}
                                className="flex h-9 w-9 items-center justify-center border-r border-gray-300 hover:bg-gray-50"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-4 w-4 text-gray-700" />
                              </button>
                              <div className="flex h-9 w-11 items-center justify-center font-semibold text-gray-900">
                                {entry.quantity}
                              </div>
                              <button
                                onClick={() => updateQuantity(p.id, entry.quantity + 1)}
                                className="flex h-9 w-9 items-center justify-center border-l border-gray-300 hover:bg-gray-50"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-4 w-4 text-gray-700" />
                              </button>
                            </div>
                          </td>

                          {/* Subtotal */}
                          <td className="px-5 py-5 text-right font-bold text-gray-900">
                            {formatCurrency(rowSubtotal)}
                          </td>

                          {/* Remove */}
                          <td className="px-5 py-5 text-center">
                            <button
                              onClick={() => handleRemoveItem(p.id)}
                              className="inline-flex h-7 w-7 items-center justify-center border border-gray-300 bg-white hover:bg-gray-50"
                              aria-label="Remove item"
                            >
                              <X className="h-4 w-4 text-gray-700" />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Empty state (kept functional but matches simpler style) */}
              {cartItems.length === 0 && (
                <div className="px-6 py-14 text-center">
                  <Package className="mx-auto mb-4 h-14 w-14 text-gray-300" />
                  <h3 className="text-lg font-bold text-gray-900">Your cart is empty</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Add some products to get started.
                  </p>
                  <Link
                    href="/products"
                    className="mt-6 inline-block border border-gray-900 bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-black"
                  >
                    Continue shopping
                  </Link>
                </div>
              )}

              {/* Coupon row + Clear all (layout similar to screenshot) */}
              {cartItems.length > 0 && (
                <div className="border-t border-gray-200 px-5 py-5">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      {isAuthenticated && showCouponSection && !appliedCoupon && (
                        <>
                          {isFetchingCoupons || isCreatingThresholdCoupon ? (
                            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                              <Skeleton className="h-10 w-full rounded-[3px] sm:w-72" />
                              <Skeleton className="h-10 w-32 rounded-[3px]" />
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <span className="text-sm text-gray-700">Coupon:</span>
                              <input
                                type="text"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                                placeholder="Coupon code"
                                className="h-10 w-full border border-gray-300 px-3 text-sm outline-none placeholder:text-gray-400 focus:border-gray-500 sm:w-72"
                              />
                              <button
                                onClick={handleApplyCoupon}
                                disabled={isApplyingCoupon}
                                className="h-10 border border-gray-900 bg-gray-900 px-5 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
                              >
                                {isApplyingCoupon ? "Applying..." : "Apply coupon"}
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      <button
                        onClick={() => {
                          // optional UX: remove items one by one (keeps your existing API)
                          cartItems.forEach((e) => removeFromCart(e.product.id));
                        }}
                        className="h-10 w-fit border border-gray-400 bg-white px-5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                      >
                        Clear All
                      </button>
                    </div>

                    {isAuthenticated && couponError && (
                      <p className="text-sm text-rose-600">{couponError}</p>
                    )}

                    {isAuthenticated && availableCouponsError && (
                      <p className="text-sm text-rose-600">{availableCouponsError}</p>
                    )}

                    {isAuthenticated && appliedCoupon && (
                      <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-semibold text-emerald-700">
                              Coupon applied: {appliedCoupon.code}
                            </div>
                            {appliedCoupon.name && (
                              <div className="text-sm text-gray-700">
                                {appliedCoupon.name}
                              </div>
                            )}
                            <div className="text-sm text-gray-700">
                              Benefit: {formatCouponBenefit(appliedCoupon)}
                            </div>
                            {discountAmount > 0 && (
                              <div className="text-sm text-gray-700">
                                You saved {formatCurrency(discountAmount)}.
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              Used at {formatAppliedAt(appliedCoupon.appliedAt)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="text-xs font-semibold text-gray-700 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}

                    {isAuthenticated && !appliedCoupon && showCouponSection && (
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-gray-700">
                          Recent unused coupons
                        </div>
                        {isFetchingCoupons || isCreatingThresholdCoupon ? (
                          <div className="space-y-2">
                            <Skeleton className="h-8 w-full rounded-[3px]" />
                            <Skeleton className="h-8 w-full rounded-[3px]" />
                          </div>
                        ) : availableCoupons.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {availableCoupons.map((coupon) => (
                              <button
                                key={coupon.id}
                                type="button"
                                onClick={() => applyCouponToCart(coupon.code)}
                                disabled={isApplyingCoupon}
                                className="flex w-full items-center justify-between gap-2 border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <span className="font-mono text-[11px] tracking-[0.2em]">
                                  {coupon.code}
                                </span>
                                <span className="text-[11px] text-gray-500">
                                  {formatCouponBenefit(coupon)}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Cart totals (boxed, simple, red checkout button) */}
          <div className="lg:col-span-1">
            <div className="border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-6 py-5">
                <h2 className="text-sm font-bold tracking-wide text-gray-900">
                  CART TOTALS
                </h2>
              </div>

              <div className="px-6 py-5">
                {/* Subtotal */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Subtotal</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                {/* Discount */}
                {discountAmount > 0 && (
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Discount{appliedCoupon?.code ? ` (${appliedCoupon.code})` : ""}
                    </span>
                    <span className="text-sm font-semibold text-emerald-600">
                      -{formatCurrency(discountAmount)}
                    </span>
                  </div>
                )}

                {/* Total */}
                <div className="mt-5 border-t border-gray-200 pt-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">Total</span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                {/* Checkout button */}
                <div className="mt-6">
                  <Link
                    href="/checkout"
                    className={`block w-full px-5 py-4 text-center text-sm font-bold text-white ${
                      cartItems.length
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-gray-300 cursor-not-allowed pointer-events-none"
                    }`}
                  >
                    Proceed to checkout
                  </Link>
                </div>
              </div>
            </div>

            {/* Optional small continue link (like many carts) */}
            <div className="mt-4">
              <Link href="/products" className="text-sm text-gray-700 hover:underline">
                ← Continue shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Notification Component (kept functional; styled closer to Woo “notice”)
function AnimatedNotification({
  show,
  onUndo,
  removedItem,
}: {
  show: boolean;
  onUndo: () => void;
  removedItem: CartEntry | null;
}) {
  if (!show || !removedItem) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className="fixed top-4 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 px-4"
    >
      <div className="border border-gray-200 bg-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-sm text-gray-900">
            <span className="font-semibold">“{removedItem.product.name}”</span>{" "}
            removed.{" "}
            <button
              onClick={onUndo}
              className="font-semibold text-red-600 hover:underline"
            >
              Undo?
            </button>
          </div>

          <button
            onClick={onUndo}
            className="inline-flex items-center gap-2 border border-red-600 bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
          >
            <Undo className="h-4 w-4" />
            UNDO
          </button>
        </div>
      </div>
    </motion.div>
  );
}
