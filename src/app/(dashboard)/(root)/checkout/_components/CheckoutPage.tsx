/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Phone,
  Mail,
  Clock,
  Package,
  Ticket,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  useCommerce,
  type AppliedCoupon,
  type CartEntry,
  type Product,
} from "@/context/CommerceContext";
import { useBuyNow, type SelectionPayload } from "@/context/BuyNowContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  cleanupOldOrderSources,
  clearCurrentOrderSource,
  generateOrderSourceToken,
  getOrderSourceFromToken,
  storeOrderSourceData,
  verifyTokenIntegrity,
} from "@/lib/orderSourceToken";

type LatestSelection =
  | { type: "product"; payload: SelectionPayload }
  | { type: "combo"; payload: SelectionPayload }
  | null;

type ComboSelectionData = {
  comboOffer?: {
    id?: string;
    name?: string;
    description?: string;
    thumbnail?: string;
    image?: string;
    delivery?: {
      isFree?: boolean;
      charge?: number;
      message?: string;
    };
    deliveryCharge?: number;
  };
  cartProduct?: Product;
};

type DeliveryDetail = {
  charge: number;
  isFree: boolean;
  message?: string;
  isFixed: boolean;
  source: "combo_offer" | "product" | "fallback";
  dataSource: "db" | "calculated";
};

type AnyDeliverable = {
  delivery?: {
    charge?: unknown;
    isFree?: unknown;
    message?: unknown;
    [key: string]: unknown;
  };
  deliveryCharge?: unknown;
  isCombo?: unknown;
  comboDeliveryCharge?: unknown;
  [key: string]: unknown;
};

type AvailableCoupon = {
  id: string;
  code: string;
  name?: string;
  discountPercentage?: number;
  discountedPrice?: number;
};

const currencyFormatter = new Intl.NumberFormat("en-US");

// ==================== HELPER FUNCTIONS ====================

const formatPriceBDT = (price: number) => `৳${currencyFormatter.format(price)}`;

const parseChargeValue = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  if (typeof value === "boolean") return value ? 0 : undefined;
  return undefined;
};

const asBool = (v: unknown): boolean | undefined =>
  typeof v === "boolean" ? v : undefined;

const hasDeliveryChargeIncluded = (product: Product) => {
  const dbCharge = parseChargeValue(product.delivery?.charge);
  const deliveryFieldCharge = parseChargeValue(product.deliveryCharge);
  const includedCharge = dbCharge ?? deliveryFieldCharge;
  return includedCharge !== undefined && includedCharge > 0;
};

const getDeliveryDetail = (
  item: AnyDeliverable,
  latestSelection?: LatestSelection | null
): DeliveryDetail | null => {
  if (item.delivery && typeof item.delivery === "object") {
    const dbCharge = parseChargeValue(item.delivery.charge);
    const isFreeFlag = asBool(item.delivery.isFree);
    const resolvedCharge = dbCharge !== undefined ? dbCharge : isFreeFlag ? 0 : undefined;
    if (resolvedCharge !== undefined) {
      const isFree = isFreeFlag ?? resolvedCharge === 0;
      const detailSource: DeliveryDetail["source"] = item.isCombo
        ? "combo_offer"
        : "product";
      return {
        charge: resolvedCharge,
        isFree,
        message:
          (item.delivery.message as string) ||
          (isFree ? "Free Delivery" : `Delivery Charge: ${resolvedCharge} BDT`),
        isFixed: true,
        source: detailSource,
        dataSource: "db",
      };
    }
  }

  if (item.deliveryCharge !== undefined) {
    const charge = parseChargeValue(item.deliveryCharge);
    if (charge !== undefined) {
      const isFree = charge === 0;
      const detailSource: DeliveryDetail["source"] = item.isCombo
        ? "combo_offer"
        : "product";
      return {
        charge,
        isFree,
        message: isFree ? "Free Delivery" : `Delivery Charge: ${charge} BDT`,
        isFixed: true,
        source: detailSource,
        dataSource: "db",
      };
    }
  }

  if (item.isCombo && item.comboDeliveryCharge !== undefined) {
    const charge = parseChargeValue(item.comboDeliveryCharge);
    if (charge !== undefined) {
      const isFree = charge === 0;
      return {
        charge,
        isFree,
        message: isFree
          ? "Free Delivery (Combo)"
          : `Delivery Charge: ${charge} BDT (Combo)`,
        isFixed: true,
        source: "combo_offer",
        dataSource: "db",
      };
    }
  }

  if (latestSelection?.type === "combo") {
    const comboData = latestSelection.payload.data as ComboSelectionData;
    if (comboData?.comboOffer) {
      const combo = comboData.comboOffer;

      if (combo.delivery && typeof combo.delivery === "object") {
        const dbCharge = parseChargeValue(combo.delivery.charge);
        const isFreeFlag = asBool(combo.delivery.isFree);
        const charge = dbCharge !== undefined ? dbCharge : isFreeFlag ? 0 : undefined;
        if (charge !== undefined) {
          const isFree = isFreeFlag ?? charge === 0;

          return {
            charge,
            isFree,
            message:
              combo.delivery.message ||
              (isFree
                ? "Free Delivery (Combo)"
                : `Delivery Charge: ${charge} BDT (Combo)`),
            isFixed: true,
            source: "combo_offer",
            dataSource: "db",
          };
        }
      }

      if (combo.deliveryCharge !== undefined) {
        const charge = parseChargeValue(combo.deliveryCharge) ?? 0;
        const isFree = charge === 0;
        return {
          charge,
          isFree,
          message: isFree
            ? "Free Delivery (Combo)"
            : `Delivery Charge: ${charge} BDT (Combo)`,
          isFixed: true,
          source: "combo_offer",
          dataSource: "db",
        };
      }
    }
  }

  return null;
};

const findSmallestDbCharge = (details: DeliveryDetail[]): number | null => {
  if (details.length === 0) return null;

  const paidDetails = details.filter(
    (detail) => !detail.isFree && detail.charge > 0
  );

  if (paidDetails.length === 0) return 0;

  return Math.min(...paidDetails.map((detail) => detail.charge));
};

const isMaintenanceAmount = (value: number | undefined): boolean => {
  if (value === undefined) return false;
  const normalized = Math.round(value);
  const priceStr = normalized.toString();
  return priceStr === "49" || priceStr.endsWith("99");
};

const formatCouponBenefit = (coupon: AppliedCoupon) => {
  if (coupon.discountPercentage && coupon.discountPercentage > 0) {
    return `${coupon.discountPercentage}% off`;
  }
  if (coupon.discountedPrice && coupon.discountedPrice > 0) {
    return `Pay ${formatPriceBDT(coupon.discountedPrice)}`;
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

// ==================== MAIN COMPONENT ====================

export default function CheckoutPage() {
  const { clearCart, activeCheckoutItems, appliedCoupon, applyCoupon, clearCoupon } =
    useCommerce();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { lastProductSelection, lastComboSelection } = useBuyNow();
  const isAuthenticated = Boolean(user);
  const effectiveAppliedCoupon = isAuthenticated ? appliedCoupon : null;

  const latestSelection = useMemo<LatestSelection>(() => {
    if (lastProductSelection && lastComboSelection) {
      return lastProductSelection.capturedAt >= lastComboSelection.capturedAt
        ? { type: "product", payload: lastProductSelection }
        : { type: "combo", payload: lastComboSelection };
    }
    if (lastProductSelection)
      return { type: "product", payload: lastProductSelection };
    if (lastComboSelection) return { type: "combo", payload: lastComboSelection };
    return null;
  }, [lastProductSelection, lastComboSelection]);

  const isBuyNowFlow = !!latestSelection;

  const asProductFromSelectionData = (
    data: SelectionPayload["data"]
  ): Product | null => {
    if (!data || typeof data !== "object") return null;
    const candidate = data as unknown as Product;
    if (
      typeof candidate.id === "string" &&
      typeof candidate.name === "string" &&
      typeof candidate.price === "number"
    ) {
      return candidate;
    }
    return null;
  };

  const checkoutItems = useMemo<CartEntry[]>(() => {
    if (latestSelection?.type === "combo") {
      const comboData = latestSelection.payload.data as ComboSelectionData | null;
      if (comboData?.cartProduct) {
        return [
          {
            product: comboData.cartProduct,
            quantity: latestSelection.payload.quantity,
          },
        ];
      }
    }

    if (latestSelection?.type === "product") {
      const productData = asProductFromSelectionData(latestSelection.payload.data);
      if (productData?.id) {
        return [
          {
            product: productData,
            quantity: latestSelection.payload.quantity,
          },
        ];
      }
    }

    if (activeCheckoutItems.length) return activeCheckoutItems;
    return [];
  }, [activeCheckoutItems, latestSelection]);

  // Ensure buttons always show pointer cursor
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = `button { cursor: pointer; }`;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    streetAddress: "",
    apartment: "",
    city: "",
    zipCode: "",
    notes: "",
    deliveryTime: "anytime",
    paymentMethod: "cash_on_delivery",
  });

  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [orderSourceToken, setOrderSourceToken] = useState<string | null>(null);

  const [deliveryOption, setDeliveryOption] = useState<
    "db_fixed" | "inside_dhaka" | "outside_dhaka" | null
  >(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [isLoadingCouponsList, setIsLoadingCouponsList] = useState(false);
  const [availableCouponsError, setAvailableCouponsError] = useState<string | null>(
    null
  );
  const lastSuggestedCouponRef = useRef<string>("");

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      if (appliedCoupon) clearCoupon();
      setCouponCode("");
      setCouponMessage(null);
      setCouponError(null);
    }
  }, [user, isAuthLoading, appliedCoupon, clearCoupon]);

  const suggestCouponCode = useCallback(
    (nextCode: string, allowWhenApplied = false) => {
      if (effectiveAppliedCoupon && !allowWhenApplied) return;
      const trimmed = couponCode.trim();
      const hasManualEntry =
        trimmed.length > 0 && trimmed !== lastSuggestedCouponRef.current;
      if (hasManualEntry) return;
      setCouponCode(nextCode);
      lastSuggestedCouponRef.current = nextCode;
    },
    [couponCode, effectiveAppliedCoupon]
  );

  const loadAvailableCoupons = useCallback(
    async (options?: { allowWhenApplied?: boolean }) => {
      if (!isAuthenticated) {
        setAvailableCoupons([]);
        setAvailableCouponsError(null);
        lastSuggestedCouponRef.current = "";
        return;
      }

      setIsLoadingCouponsList(true);
      setAvailableCouponsError(null);
      try {
        const response = await fetch("/api/coupons/available?limit=6", {
          cache: "no-store",
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || "Failed to load coupons.");
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
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load available coupons.";
        setAvailableCoupons([]);
        setAvailableCouponsError(message);
        if (!couponCode.trim() || couponCode === lastSuggestedCouponRef.current) {
          setCouponCode("");
          lastSuggestedCouponRef.current = "";
        }
      } finally {
        setIsLoadingCouponsList(false);
      }
    },
    [isAuthenticated, suggestCouponCode, couponCode]
  );

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      setAvailableCoupons([]);
      setAvailableCouponsError(null);
      lastSuggestedCouponRef.current = "";
      return;
    }

    void loadAvailableCoupons();
  }, [isAuthLoading, isAuthenticated]);

  const handleApplyCoupon = async () => {
    setCouponMessage(null);
    setCouponError(null);

    const code = couponCode.trim();
    if (!code) {
      setCouponError("Please enter a coupon code.");
      return;
    }

    if (!user) {
      setCouponError("Please log in to apply a coupon.");
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const response = await fetch("/api/coupons/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to apply coupon.");
      }

      const data = await response.json();
      const coupon = data?.coupon as {
        _id?: string;
        name?: string;
        code?: string;
        discountPercentage?: number;
        discountedPrice?: number;
      };

      if (!coupon?._id || !coupon.code) {
        throw new Error("Invalid coupon response.");
      }

      const applied: AppliedCoupon = {
        id: coupon._id,
        code: coupon.code,
        name: coupon.name ?? "",
        discountPercentage: coupon.discountPercentage,
        discountedPrice: coupon.discountedPrice,
        appliedAt: data?.redemption?.appliedAt || new Date().toISOString(),
        discountAmount:
          typeof data?.redemption?.discountAmount === "number"
            ? data.redemption.discountAmount
            : undefined,
      };

      applyCoupon(applied);
      setCouponMessage(`Coupon "${coupon.code}" applied!`);
      setCouponCode("");
      void loadAvailableCoupons({ allowWhenApplied: true });
    } catch (error: any) {
      setCouponError(error?.message || "Failed to apply coupon.");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    clearCoupon();
    setCouponMessage(null);
    setCouponError(null);
    void loadAvailableCoupons({ allowWhenApplied: true });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ==================== PRICE CALCULATIONS ====================

  const baseSubtotal = checkoutItems.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const countMaintenanceUnitsForItem = (item: CartEntry) => {
    const productPrice =
      typeof item.product.price === "number"
        ? Math.round(item.product.price)
        : undefined;

    const qualifies =
      isMaintenanceAmount(productPrice) || hasDeliveryChargeIncluded(item.product);
    return qualifies ? item.quantity : 0;
  };

  const getItemMaintenanceFee = (item: CartEntry) => {
    const units = countMaintenanceUnitsForItem(item);
    return units * 1;
  };

  const getItemTotalPrice = (item: CartEntry) => {
    const base = item.product.price * item.quantity;
    const fee = getItemMaintenanceFee(item);
    return base + fee;
  };

  const maintenanceUnitCount = checkoutItems.reduce(
    (acc, item) => acc + countMaintenanceUnitsForItem(item),
    0
  );
  const maintenanceFeeTotal = maintenanceUnitCount;

  const subtotal = baseSubtotal + maintenanceFeeTotal;

  const discountAmount = (() => {
    if (!effectiveAppliedCoupon) return 0;
    if (
      effectiveAppliedCoupon.discountPercentage &&
      effectiveAppliedCoupon.discountPercentage > 0
    ) {
      return Math.round((subtotal * effectiveAppliedCoupon.discountPercentage) / 100);
    }
    if (
      effectiveAppliedCoupon.discountedPrice &&
      effectiveAppliedCoupon.discountedPrice > 0
    ) {
      return Math.max(0, subtotal - effectiveAppliedCoupon.discountedPrice);
    }
    return 0;
  })();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!appliedCoupon) return;
    if (appliedCoupon.discountAmount === discountAmount) return;
    applyCoupon({
      ...appliedCoupon,
      discountAmount,
    });
  }, [isAuthenticated, appliedCoupon, discountAmount, applyCoupon]);

  // ==================== ✅ DELIVERY (UPDATED) ====================

  const deliverySummary = useMemo(() => {
    const deliveryDetailsByProductId = new Map<string, DeliveryDetail>();
    const dbDeliveryDetails: DeliveryDetail[] = [];

    for (const item of checkoutItems) {
      const detail = getDeliveryDetail(
        item.product as unknown as AnyDeliverable,
        latestSelection
      );
      if (detail) {
        deliveryDetailsByProductId.set(item.product.id, detail);
        if (detail.dataSource === "db") dbDeliveryDetails.push(detail);
      }
    }

    // ✅ Only lock DB delivery if EVERY checkout item has a DB delivery detail
    const allItemsHaveDbDelivery =
      checkoutItems.length > 0 &&
      checkoutItems.every((item) => deliveryDetailsByProductId.has(item.product.id));

    const smallestDbCharge = findSmallestDbCharge(dbDeliveryDetails);

    return {
      deliveryDetailsByProductId,
      dbDeliveryDetails,
      smallestDbCharge,
      allItemsHaveDbDelivery,
    };
  }, [checkoutItems, latestSelection]);

  const deliveryDetailsByProductId = deliverySummary.deliveryDetailsByProductId;
  const dbDeliveryDetails = deliverySummary.dbDeliveryDetails;
  const smallestDbCharge = deliverySummary.smallestDbCharge;

  const shouldUseDbDelivery =
    deliverySummary.allItemsHaveDbDelivery && smallestDbCharge !== null;

  useEffect(() => {
    if (shouldUseDbDelivery) {
      setDeliveryOption("db_fixed");
    } else if (deliveryOption === "db_fixed") {
      setDeliveryOption(null);
    }
  }, [shouldUseDbDelivery, deliveryOption]);

  let deliveryCharge = 0;
  if (shouldUseDbDelivery && smallestDbCharge !== null) {
    deliveryCharge = smallestDbCharge;
  } else if (deliveryOption === "inside_dhaka") {
    deliveryCharge = 70;
  } else if (deliveryOption === "outside_dhaka") {
    deliveryCharge = 130;
  } else {
    deliveryCharge = 0;
  }

  const total = Math.max(0, subtotal - discountAmount + deliveryCharge);

  const isDeliveryChargeSelected = () => {
    if (shouldUseDbDelivery) return true;
    return (
      deliveryOption === "inside_dhaka" || deliveryOption === "outside_dhaka"
    );
  };

  const validateForm = () => {
    if (!checkoutItems.length)
      return "Your order is empty. Add items before checking out.";
    if (!formData.fullName.trim()) return "Please enter your full name.";
    if (!formData.email.trim()) return "Please enter your email address.";
    if (!formData.phone.trim()) return "Please enter your phone number.";
    if (!formData.streetAddress.trim()) return "Please enter your street address.";
    if (!formData.city.trim()) return "Please enter your city.";
    if (!formData.zipCode.trim()) return "Please enter your ZIP/postal code.";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email))
      return "Please enter a valid email address.";

    const cleanedPhone = formData.phone.replace(/\D/g, "");
    if (!/^\d{10,}$/.test(cleanedPhone))
      return "Please enter a valid phone number (at least 10 digits).";

    if (!isDeliveryChargeSelected()) {
      return shouldUseDbDelivery
        ? "Please wait while we load delivery information..."
        : "Please select your delivery location (inside Dhaka or outside Dhaka).";
    }

    return null;
  };

  const isFormValid = () => {
    return (
      checkoutItems.length > 0 &&
      formData.fullName.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.phone.trim() !== "" &&
      formData.streetAddress.trim() !== "" &&
      formData.city.trim() !== "" &&
      formData.zipCode.trim() !== "" &&
      isDeliveryChargeSelected()
    );
  };

  // Initialize
  useEffect(() => {
    cleanupOldOrderSources();
    console.log("[Checkout] Page initialized:", {
      isBuyNowFlow,
      checkoutItemsCount: checkoutItems.length,
      hasSessionToken: !!sessionStorage.getItem("order_source_token"),
    });
  }, []);

  // Submit Order
  const handleSubmitOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setSubmissionMessage(null);
    setSubmissionError(null);

    const validationError = validateForm();
    if (validationError) {
      setSubmissionError(validationError);
      return;
    }

    setIsOrdering(true);

    try {
      const orderSource: "buy_now" | "cart" = isBuyNowFlow ? "buy_now" : "cart";
      const newOrderSourceToken = generateOrderSourceToken(orderSource);
      setOrderSourceToken(newOrderSourceToken);

      if (!verifyTokenIntegrity(newOrderSourceToken)) {
        throw new Error("Failed to generate valid order token. Please try again.");
      }

      const contextItemsToClear = isBuyNowFlow
        ? [
            {
              type: latestSelection?.type,
              payload: latestSelection?.payload,
              items: checkoutItems,
            },
          ]
        : checkoutItems;

      storeOrderSourceData(
        newOrderSourceToken,
        orderSource,
        checkoutItems,
        undefined,
        contextItemsToClear
      );

      const orderData = {
        items: checkoutItems.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.product.price,
          image: item.product.image,
          isCombo: Boolean((item.product as any)?.isCombo),
          deliveryDetail: deliveryDetailsByProductId.get(item.product.id),
          maintenanceFee: getItemMaintenanceFee(item),
        })),
        shippingAddress: {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          streetAddress: formData.streetAddress,
          apartment: formData.apartment,
          city: formData.city,
          zipCode: formData.zipCode,
        },
        payment: {
          method: formData.paymentMethod,
          status:
            formData.paymentMethod === "cash_on_delivery" ? "pending" : "pending",
          amount: total,
          currency: "BDT",
        },
        notes: formData.notes,
        deliveryTime: formData.deliveryTime,

        productsSubtotal: baseSubtotal,
        maintenanceFee: maintenanceFeeTotal,
        shippingCost: deliveryCharge,
        deliveryCharge,
        subtotal,
        discountAmount,
        total,
        deliveryOption,
        hasDbDelivery: shouldUseDbDelivery,
        dbDeliveryDetails,
        smallestDbCharge,
        deliverySource: shouldUseDbDelivery
          ? isBuyNowFlow
            ? "database_buy_now"
            : "database_smallest"
          : "manual_selection",

        orderSource,
        orderSourceToken: newOrderSourceToken,
        isBuyNowFlow,
        source: orderSource,
        contextItemsCount: contextItemsToClear.length,

        coupon: effectiveAppliedCoupon
          ? {
              id: effectiveAppliedCoupon.id,
              code: effectiveAppliedCoupon.code,
              name: effectiveAppliedCoupon.name,
              discountPercentage: effectiveAppliedCoupon.discountPercentage,
              discountedPrice: effectiveAppliedCoupon.discountedPrice,
              appliedAt: effectiveAppliedCoupon.appliedAt,
              discountAmount: effectiveAppliedCoupon.discountAmount ?? discountAmount,
            }
          : undefined,
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (!response.ok) {
        clearCurrentOrderSource();
        setOrderSourceToken(null);
        throw new Error(data.error || "Failed to place order. Please try again.");
      }

      const orderNumber =
        data.order?.orderId || `RBS${Date.now().toString().slice(-6)}`;

      const addressLines = [
        formData.streetAddress,
        formData.apartment,
        formData.city,
        formData.zipCode,
      ].filter(Boolean);

      setSubmissionMessage(
        `Order #${orderNumber} confirmed! Your order will be delivered to ${addressLines.join(
          ", "
        )}. Total: ${formatPriceBDT(total)}. ${
          formData.paymentMethod === "cash_on_delivery"
            ? "You'll pay on delivery."
            : "Payment pending."
        }`
      );

      if (effectiveAppliedCoupon) {
        clearCoupon();
        setCouponCode("");
        setCouponMessage(null);
        setCouponError(null);
        void loadAvailableCoupons({ allowWhenApplied: true });
      }

      // Update stored data with orderId
      try {
        const sessionData = sessionStorage.getItem("order_source_data");
        if (sessionData) {
          const stored = JSON.parse(sessionData);
          stored.orderId = orderNumber;
          sessionStorage.setItem("order_source_data", JSON.stringify(stored));
        }

        const tokenKey = `token_${newOrderSourceToken}`;
        const tokenData = localStorage.getItem(tokenKey);
        if (tokenData) {
          const stored = JSON.parse(tokenData);
          stored.orderId = orderNumber;
          localStorage.setItem(tokenKey, JSON.stringify(stored));
        }
      } catch (err) {
        console.error("Error updating order ID:", err);
      }

      // Verify token exists before redirect, re-store if needed
      const verification = getOrderSourceFromToken(newOrderSourceToken);
      if (verification.source === "unknown") {
        storeOrderSourceData(
          newOrderSourceToken,
          orderSource,
          checkoutItems,
          orderNumber,
          contextItemsToClear
        );
      }

      setIsRedirecting(true);
      setTimeout(() => {
        const params = new URLSearchParams({
          orderId: orderNumber,
          source: orderSource,
          token: newOrderSourceToken,
          verified: "true",
          t: Date.now().toString(),
        });

        window.location.href = `/thank-you?${params.toString()}`;
      }, 3000);
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Something went wrong while placing your order. Please try again.";

      setSubmissionError(msg);

      clearCurrentOrderSource();
      setOrderSourceToken(null);
      setIsRedirecting(false);
    } finally {
      setIsOrdering(false);
    }
  };

  const hasItems = checkoutItems.length > 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center text-sm text-gray-500">
          <Link href="/cart" className="hover:text-gray-900">
            Home
          </Link>
          <ChevronRight className="mx-2 h-4 w-4" />
          <span className="text-gray-900 font-medium">Checkout</span>
        </div>

        <h1 className="text-xl font-bold text-gray-900 tracking-wide mb-3">
          CHECKOUT
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Please fill in the fields below and place order to complete your purchase!
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* LEFT */}
          <div className="space-y-6">
            {/* SHIPPING ADDRESS */}
            <section className="border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 bg-[#3f3f3f] px-4 py-2 text-white">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/60 text-xs font-bold">
                  1
                </span>
                <h2 className="text-sm font-bold tracking-wide">SHIPPING ADDRESS</h2>
              </div>

              <form onSubmit={handleSubmitOrder} className="p-4">
                {/* Email */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-800">
                    Email Address <span className="text-red-600">*</span>
                  </label>
                  <div className="mt-1 relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="you@email.com"
                      className="w-full h-10 pl-9 pr-3 border border-gray-200 rounded-[3px] text-sm outline-none focus:border-gray-400"
                      required
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">
                    You can create an account after checkout
                  </p>
                </div>

                {/* Name row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-800">
                      Full Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Your name"
                      className="mt-1 w-full h-10 px-3 border border-gray-200 rounded-[3px] text-sm outline-none focus:border-gray-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-800">
                      Phone Number <span className="text-red-600">*</span>
                    </label>
                    <div className="mt-1 relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="01XXXXXXXXX"
                        className="w-full h-10 pl-9 pr-3 border border-gray-200 rounded-[3px] text-sm outline-none focus:border-gray-400"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Street */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-800">
                    Street Address <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="streetAddress"
                    value={formData.streetAddress}
                    onChange={handleInputChange}
                    placeholder="House, Road, Area"
                    className="mt-1 w-full h-10 px-3 border border-gray-200 rounded-[3px] text-sm outline-none focus:border-gray-400"
                    required
                  />
                </div>

                {/* Apartment */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-800">
                    Apartment, suite, etc.{" "}
                    <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    name="apartment"
                    value={formData.apartment}
                    onChange={handleInputChange}
                    placeholder="Apartment, suite, floor"
                    className="mt-1 w-full h-10 px-3 border border-gray-200 rounded-[3px] text-sm outline-none focus:border-gray-400"
                  />
                </div>

                {/* City + ZIP */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-800">
                      City <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="City"
                      className="mt-1 w-full h-10 px-3 border border-gray-200 rounded-[3px] text-sm outline-none focus:border-gray-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-800">
                      ZIP/Postal Code <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      placeholder="ZIP/Postal Code"
                      className="mt-1 w-full h-10 px-3 border border-gray-200 rounded-[3px] text-sm outline-none focus:border-gray-400"
                      required
                    />
                  </div>
                </div>

                {/* Delivery time */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-800">
                    Delivery Time Preference
                  </label>
                  <div className="mt-1 relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      name="deliveryTime"
                      value={formData.deliveryTime}
                      onChange={handleInputChange}
                      className="w-full h-10 pl-9 pr-3 border border-gray-200 rounded-[3px] text-sm outline-none focus:border-gray-400 appearance-none bg-white"
                    >
                      <option value="anytime">Anytime (9 AM - 9 PM)</option>
                      <option value="morning">Morning (9 AM - 12 PM)</option>
                      <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                      <option value="evening">Evening (5 PM - 9 PM)</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-gray-800">
                    Order Notes / Special Instructions{" "}
                    <span className="text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Any special instructions for delivery, gate code, etc."
                    rows={3}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-[3px] text-sm outline-none focus:border-gray-400"
                  />
                </div>

                {/* PAYMENT METHOD */}
                <div className="border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center gap-3 bg-[#3f3f3f] px-4 py-2 text-white">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/60 text-xs font-bold">
                      3
                    </span>
                    <h3 className="text-sm font-bold tracking-wide">PAYMENT METHOD</h3>
                  </div>

                  <div className="p-4 space-y-3">
                    <label className="flex items-start gap-3 text-sm">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash_on_delivery"
                        checked={formData.paymentMethod === "cash_on_delivery"}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">
                          Cash On Delivery
                        </div>
                        <div className="text-xs text-gray-500">
                          Pay any time while receiving the product.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 text-sm opacity-60">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="online_payment"
                        checked={formData.paymentMethod === "online_payment"}
                        onChange={handleInputChange}
                        disabled
                        className="mt-1 h-4 w-4"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">
                          Online Payment
                        </div>
                        <div className="text-xs text-gray-500">Coming soon</div>
                      </div>
                    </label>

                    {/* ✅ Delivery options row (UPDATED) */}
                    <div className="pt-3 border-t border-gray-200">
                      {shouldUseDbDelivery ? (
                        <div className="text-xs text-gray-700">
                          <span className="font-semibold">Shipping:</span>{" "}
                          {smallestDbCharge === 0
                            ? "Free Delivery"
                            : formatPriceBDT(smallestDbCharge ?? 0)}
                          <span className="text-gray-500"></span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setDeliveryOption("inside_dhaka")}
                              className={`h-10 px-3 border rounded-[3px] text-sm text-left ${
                                deliveryOption === "inside_dhaka"
                                  ? "border-gray-700"
                                  : "border-gray-200 hover:border-gray-400"
                              }`}
                            >
                              Inside Dhaka — {formatPriceBDT(70)}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeliveryOption("outside_dhaka")}
                              className={`h-10 px-3 border rounded-[3px] text-sm text-left ${
                                deliveryOption === "outside_dhaka"
                                  ? "border-gray-700"
                                  : "border-gray-200 hover:border-gray-400"
                              }`}
                            >
                              Outside Dhaka — {formatPriceBDT(130)}
                            </button>
                          </div>

                          {!(
                            deliveryOption === "inside_dhaka" ||
                            deliveryOption === "outside_dhaka"
                          ) && (
                            <div className="text-xs text-red-600 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              Please select delivery option
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="mt-3 text-xs text-gray-700 underline underline-offset-2 hover:text-gray-900"
                    >
                      Add instructions for Delivery
                    </button>
                  </div>
                </div>

                {isAuthenticated &&
                  (appliedCoupon ||
                    isLoadingCouponsList ||
                    availableCouponsError ||
                    availableCoupons.length > 0) && (
                  <div className="border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center gap-3 bg-[#3f3f3f] px-4 py-2 text-white">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/60 text-xs font-bold">
                        2
                      </span>
                      <h3 className="text-sm font-bold tracking-wide">COUPON</h3>
                    </div>

                    <div className="p-4">
                      {appliedCoupon ? (
                        <div className="flex items-start justify-between gap-3 rounded-[3px] border border-gray-200 bg-gray-50 p-3">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                Coupon Applied:{" "}
                                <span className="font-bold">{appliedCoupon.code}</span>
                              </div>
                              {appliedCoupon.name && (
                                <div className="text-xs text-gray-600">
                                  {appliedCoupon.name}
                                </div>
                              )}
                              <div className="text-xs text-gray-600">
                                Benefit: {formatCouponBenefit(appliedCoupon)}
                              </div>
                              {discountAmount > 0 && (
                                <div className="text-xs text-gray-600">
                                  You saved {formatPriceBDT(discountAmount)}.
                                </div>
                              )}
                              <div className="text-[11px] text-gray-500">
                                Used at {formatAppliedAt(appliedCoupon.appliedAt)}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                            Remove
                          </button>
                        </div>
                      ) : isLoadingCouponsList ? (
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Skeleton className="h-10 w-full rounded-[3px]" />
                            <Skeleton className="h-10 w-32 rounded-[3px]" />
                          </div>
                          <Skeleton className="h-3 w-40" />
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                              <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input
                                type="text"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                                placeholder="Coupon code"
                                className="w-full h-10 pl-9 pr-3 border border-gray-200 rounded-[3px] text-sm outline-none focus:border-gray-400"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleApplyCoupon}
                              disabled={isApplyingCoupon}
                              className="h-10 px-5 bg-black text-white text-sm font-bold rounded-[3px] hover:bg-[#222] transition-colors disabled:cursor-not-allowed disabled:bg-gray-300"
                            >
                              {isApplyingCoupon ? "Applying..." : "Apply coupon"}
                            </button>
                          </div>

                          {couponError && (
                            <p className="mt-2 text-xs text-red-600 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              {couponError}
                            </p>
                          )}
                          {couponMessage && (
                            <p className="mt-2 text-xs text-green-700 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" />
                              {couponMessage}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit area */}
                <div className="pt-2">
                  {submissionError ? (
                    <div className="mb-4 p-3 border border-red-200 bg-red-50 rounded-[3px]">
                      <p className="text-sm text-red-700">{submissionError}</p>
                    </div>
                  ) : null}

                  {submissionMessage ? (
                    <div className="mb-4 p-3 border border-green-200 bg-green-50 rounded-[3px]">
                      <p className="text-sm text-green-700">{submissionMessage}</p>
                      <p className="mt-1 text-[11px] text-green-600">
                        Redirecting to thank you page...
                      </p>
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={!isFormValid() || isOrdering || isRedirecting}
                    className={`w-full h-11 rounded-[3px] text-white font-bold tracking-wide ${
                      isFormValid()
                        ? "bg-black hover:bg-[#222]"
                        : "bg-gray-300 cursor-not-allowed"
                    } transition-colors`}
                  >
                    {isOrdering || isRedirecting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Processing Order...
                      </span>
                    ) : (
                      "PLACE ORDER"
                    )}
                  </button>

                  {!isFormValid() && (
                    <p className="mt-2 text-[11px] text-gray-500">
                      Please fill all required fields and select delivery option.
                    </p>
                  )}

                  <p className="mt-2 text-[11px] text-gray-500">
                    By placing your order, you agree to our Terms and Conditions.
                  </p>
                </div>
              </form>
            </section>
          </div>

          {/* RIGHT: ORDER REVIEW */}
          <aside className="border border-gray-200 bg-white shadow-sm h-fit">
            <div className="flex items-center gap-3 bg-[#3f3f3f] px-4 py-2 text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/60 text-xs font-bold">
                4
              </span>
              <h2 className="text-sm font-bold tracking-wide">ORDER REVIEW</h2>
            </div>

            <div className="p-4">
              {/* Table Head */}
              <div className="flex justify-between text-xs font-bold text-gray-700 pb-2 border-b border-gray-200">
                <span>PRODUCT</span>
                <span>SUBTOTAL</span>
              </div>

              {/* Items */}
              <div className="divide-y divide-gray-200">
                {checkoutItems.map((item) => {
                  const isCombo = Boolean((item.product as any)?.isCombo);
                  const itemMaintenanceUnits = countMaintenanceUnitsForItem(item);
                  const itemMaintenanceFee = getItemMaintenanceFee(item);
                  const itemTotalPrice = getItemTotalPrice(item);
                  const itemDeliveryDetail = deliveryDetailsByProductId.get(
                    item.product.id
                  );

                  return (
                    <div key={item.product.id} className="py-4 flex gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-gray-200 bg-gray-50">
                        <Image
                          src={item.product.image}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                        {isCombo && (
                          <div className="absolute top-1 left-1 bg-amber-500 text-white text-xs px-1 py-0.5 rounded">
                            Combo
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-900 leading-snug">
                          {item.product.name}
                          {isCombo && (
                            <span className="ml-2 text-xs text-amber-600 font-semibold">
                              (Combo Offer)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Quantity: {item.quantity}
                        </div>

                        {itemMaintenanceUnits > 0 && (
                          <div className="text-[11px] text-gray-500 mt-1">
                            Maintenance: {itemMaintenanceUnits} × {formatPriceBDT(1)} ={" "}
                            <span className="font-semibold">
                              {formatPriceBDT(itemMaintenanceFee)}
                            </span>
                          </div>
                        )}

                        {itemDeliveryDetail && (
                          <div className="text-[11px] text-gray-500 mt-1">
                            Delivery:{" "}
                            {itemDeliveryDetail.charge === 0
                              ? "Free"
                              : formatPriceBDT(itemDeliveryDetail.charge)}
                            {itemDeliveryDetail.dataSource === "db" && (
                              <span className="text-amber-600"> (DB)</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatPriceBDT(itemTotalPrice)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="mt-4 border-t border-gray-200 pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">SUBTOTAL</span>
                  <span className="font-semibold text-gray-900">
                    {formatPriceBDT(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700">SHIPPING</span>
                  <span className="font-semibold text-gray-900">
                    {formatPriceBDT(deliveryCharge)}
                    {shouldUseDbDelivery &&
                      smallestDbCharge !== null &&
                      smallestDbCharge > 0 && (
                        <span className="text-xs text-amber-600 ml-1">(DB)</span>
                      )}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">
                      DISCOUNT
                      {effectiveAppliedCoupon?.code
                        ? ` (${effectiveAppliedCoupon.code})`
                        : ""}
                    </span>
                    <span className="font-semibold text-emerald-600">
                      -{formatPriceBDT(discountAmount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-700">VAT</span>
                  <span className="font-semibold text-gray-900">{formatPriceBDT(0)}</span>
                </div>

                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-900 font-bold">TOTAL</span>
                  <span className="font-bold text-[#e05a3a]">
                    {formatPriceBDT(total)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div className="mt-4 text-[11px] text-gray-700 leading-relaxed">
                <div className="font-bold underline underline-offset-2 mb-1">
                  Important note:
                </div>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>
                    Your order may be split into multiple shipments based on warehouse
                    location.
                  </li>
                  <li>
                    By clicking Place Order, you agree to our Terms and Conditions.
                  </li>
                  <li>For COD orders, pay only after receiving the product.</li>
                </ol>
              </div>

              {/* Secondary info */}
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Estimated delivery: 2-3 business days</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span>
                    {checkoutItems.length} item{checkoutItems.length !== 1 ? "s" : ""}{" "}
                    in your order
                  </span>
                </div>
                {formData.paymentMethod === "cash_on_delivery" && (
                  <div className="text-xs text-gray-600">
                    You'll pay{" "}
                    <span className="font-semibold">{formatPriceBDT(total)}</span> upon
                    delivery.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
