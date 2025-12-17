/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Phone, Mail, Clock, Package } from "lucide-react";
import {
  useCommerce,
  type CartEntry,
  type Product,
} from "@/context/CommerceContext";
import { useBuyNow, type SelectionPayload } from "@/context/BuyNowContext";
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

export default function CheckoutPage() {
  const { clearCart, activeCheckoutItems } = useCommerce();
  const { lastProductSelection, lastComboSelection, clearSelections } =
    useBuyNow();

  const latestSelection = useMemo<LatestSelection>(() => {
    if (lastProductSelection && lastComboSelection) {
      return lastProductSelection.capturedAt >= lastComboSelection.capturedAt
        ? { type: "product", payload: lastProductSelection }
        : { type: "combo", payload: lastComboSelection };
    }
    if (lastProductSelection) {
      return { type: "product", payload: lastProductSelection };
    }
    if (lastComboSelection) {
      return { type: "combo", payload: lastComboSelection };
    }
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
      const comboData =
        latestSelection.payload.data as ComboSelectionData | null;
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
      const productData = asProductFromSelectionData(
        latestSelection.payload.data
      );
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

  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      button {
        cursor: pointer;
      }
    `;
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

  const formatPriceBDT = (price: number) => {
    return `৳${new Intl.NumberFormat("en-US").format(price)}`;
  };

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

  const getDeliveryDetail = (item: AnyDeliverable): DeliveryDetail | null => {
    // 1) delivery object with charge
    if (item.delivery && typeof item.delivery === "object") {
      const dbCharge = parseChargeValue(item.delivery.charge);
      if (dbCharge !== undefined) {
        const isFree = asBool(item.delivery.isFree) ?? dbCharge === 0;
        const detailSource: DeliveryDetail["source"] = item.isCombo
          ? "combo_offer"
          : "product";
        return {
          charge: dbCharge,
          isFree,
          message:
            (item.delivery.message as string) ||
            (isFree ? "Free Delivery" : `Delivery Charge: ${dbCharge} BDT`),
          isFixed: true,
          source: detailSource,
          dataSource: "db",
        };
      }
    }

    // 2) deliveryCharge field
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

    // 3) comboDeliveryCharge
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

    // 4) fallback from latestSelection comboOffer
    if (latestSelection?.type === "combo") {
      const comboData = latestSelection.payload.data as ComboSelectionData;
      if (comboData?.comboOffer) {
        const combo = comboData.comboOffer;

        if (combo.delivery && typeof combo.delivery === "object") {
          const dbCharge = parseChargeValue(combo.delivery.charge);
          const charge = dbCharge ?? 0;
          const isFree = asBool(combo.delivery.isFree) ?? charge === 0;

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

  // Delivery details maps
  const deliveryDetailsByProductId = new Map<string, DeliveryDetail>();
  const dbDeliveryDetails: DeliveryDetail[] = [];

  checkoutItems.forEach((item) => {
    const detail = getDeliveryDetail(item.product as unknown as AnyDeliverable);
    if (detail) {
      deliveryDetailsByProductId.set(item.product.id, detail);
      if (detail.dataSource === "db") dbDeliveryDetails.push(detail);
    }
  });

  const findSmallestDbCharge = (details: DeliveryDetail[]): number | null => {
    if (details.length === 0) return null;

    const paid = details.filter((d) => !d.isFree && d.charge > 0);
    if (paid.length === 0) return 0;

    return Math.min(...paid.map((d) => d.charge));
  };

  const smallestDbCharge = useMemo(
    () => findSmallestDbCharge(dbDeliveryDetails),
    [dbDeliveryDetails]
  );

  const shouldUseDbDelivery = smallestDbCharge !== null;

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Price calculations
  const baseSubtotal = checkoutItems.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const isMaintenanceAmount = (value: number | undefined): boolean => {
    if (value === undefined) return false;
    const normalized = Math.round(value);
    const priceStr = normalized.toString();
    return priceStr === "49" || priceStr.endsWith("99");
  };

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

  const total = baseSubtotal + maintenanceFeeTotal + deliveryCharge;

  const isDeliveryChargeSelected = () => {
    if (shouldUseDbDelivery) return true;
    return deliveryOption !== null;
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

  const validateForm = () => {
    if (!checkoutItems.length) return "Your order is empty. Add items before checking out.";
    if (!formData.fullName.trim()) return "Please enter your full name.";
    if (!formData.email.trim()) return "Please enter your email address.";
    if (!formData.phone.trim()) return "Please enter your phone number.";
    if (!formData.streetAddress.trim()) return "Please enter your street address.";
    if (!formData.city.trim()) return "Please enter your city.";
    if (!formData.zipCode.trim()) return "Please enter your ZIP/postal code.";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return "Please enter a valid email address.";

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

  // Initialize
  useEffect(() => {
    cleanupOldOrderSources();
    console.log("[Checkout] Page initialized:", {
      isBuyNowFlow,
      checkoutItemsCount: checkoutItems.length,
      hasSessionToken: !!sessionStorage.getItem("order_source_token"),
    });
  }, []);

  // ✅ Submit Order (redirect to /thank-you)
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
    console.log("[Checkout] Starting order submission...");

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
        total,
        deliveryOption,
        hasDbDelivery: shouldUseDbDelivery,
        dbDeliveryDetails,
        smallestDbCharge,
        deliverySource: shouldUseDbDelivery ? "database_smallest" : "manual_selection",

        orderSource,
        orderSourceToken: newOrderSourceToken,
        isBuyNowFlow,
        source: orderSource,
        contextItemsCount: contextItemsToClear.length,
      };

      console.log("[Checkout] Sending order to API...");
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
        console.warn("[Checkout] Token not found, re-storing...");
        storeOrderSourceData(
          newOrderSourceToken,
          orderSource,
          checkoutItems,
          orderNumber,
          contextItemsToClear
        );
      }

      // ✅ Redirect to /thank-you
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
      console.error("[Checkout] Order error:", error);

      clearCurrentOrderSource();
      setOrderSourceToken(null);
      setIsRedirecting(false);
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb navigation */}
        <div className="flex items-center text-sm text-gray-500 mb-8">
          <Link href="/cart" className="hover:text-amber-600 transition-colors">
            Cart
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="font-medium text-gray-900">Shipping</span>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-gray-400">Review</span>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Shipping Information
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmitOrder}>
              <div className="space-y-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="your@email.com"
                      required
                      className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="01XXXXXXXXX"
                      required
                      className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    We'll contact you for delivery coordination
                  </p>
                </div>

                {/* Street Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    name="streetAddress"
                    value={formData.streetAddress}
                    onChange={handleInputChange}
                    placeholder="House, Road, Area"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                {/* Apartment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apartment, suite, etc. (optional)
                  </label>
                  <input
                    type="text"
                    name="apartment"
                    value={formData.apartment}
                    onChange={handleInputChange}
                    placeholder="Apartment, suite, floor"
                    className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                {/* City + ZIP */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="City"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP/Postal Code *
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      placeholder="ZIP/Postal Code"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Delivery Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Time Preference
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      name="deliveryTime"
                      value={formData.deliveryTime}
                      onChange={handleInputChange}
                      className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 appearance-none"
                    >
                      <option value="anytime">Anytime (9 AM - 9 PM)</option>
                      <option value="morning">Morning (9 AM - 12 PM)</option>
                      <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                      <option value="evening">Evening (5 PM - 9 PM)</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Notes / Special Instructions (optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Any special instructions for delivery, gate code, etc."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                {/* Payment */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Payment Method
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:border-amber-400 transition-colors">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash_on_delivery"
                        checked={formData.paymentMethod === "cash_on_delivery"}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300"
                      />
                      <div className="ml-3 flex-1">
                        <span className="block text-sm font-medium text-gray-900">
                          Cash on Delivery
                        </span>
                        <span className="block text-sm text-gray-500">
                          Pay when you receive your order
                        </span>
                      </div>
                      <div className="ml-3">
                        <span className="text-sm font-semibold text-gray-900">
                          Available
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:border-amber-400 transition-colors opacity-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="online_payment"
                        checked={formData.paymentMethod === "online_payment"}
                        onChange={handleInputChange}
                        disabled
                        className="h-4 w-4 text-gray-300 focus:ring-gray-500 border-gray-300"
                      />
                      <div className="ml-3 flex-1">
                        <span className="block text-sm font-medium text-gray-900">
                          Online Payment
                        </span>
                        <span className="block text-sm text-gray-500">
                          Pay securely with bKash, Nagad, or Card
                        </span>
                      </div>
                      <div className="ml-3">
                        <span className="text-sm font-semibold text-gray-400">
                          Coming Soon
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Submit */}
                <div className="mt-8">
                  {submissionError ? (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{submissionError}</p>
                    </div>
                  ) : null}

                  {submissionMessage ? (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-600">
                        {submissionMessage}
                      </p>
                      <p className="mt-2 text-xs text-green-500">
                        Redirecting to thank you page...
                      </p>
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={!isFormValid() || isOrdering || isRedirecting}
                    className={`w-full py-3 px-4 ${
                      isFormValid()
                        ? "bg-amber-500 hover:bg-amber-600 cursor-pointer"
                        : "bg-gray-300 cursor-not-allowed"
                    } text-white font-medium rounded-md shadow transition-colors`}
                  >
                    {isOrdering || isRedirecting ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Processing Order...
                      </span>
                    ) : (
                      `Place Order - ${formatPriceBDT(total)}`
                    )}
                  </button>

                  {!isFormValid() && (
                    <p className="mt-2 text-xs text-gray-500">
                      Please fill in all required fields and select delivery option.
                    </p>
                  )}

                  <p className="mt-2 text-xs text-gray-500">
                    By placing your order, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </div>
              </div>
            </form>
          </div>

          {/* Right column - Order Summary */}
          <div>
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 sticky top-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Order Summary
              </h2>

              {/* Items */}
              <div className="space-y-4 mb-6">
                {checkoutItems.map((item) => {
                  const itemDeliveryDetail = deliveryDetailsByProductId.get(
                    item.product.id
                  );
                  const isCombo = (item.product as any)?.isCombo;

                  const itemMaintenanceUnits = countMaintenanceUnitsForItem(item);
                  const itemMaintenanceFee = getItemMaintenanceFee(item);
                  const itemTotalPrice = getItemTotalPrice(item);

                  return (
                    <div key={item.product.id} className="flex gap-4">
                      <div className="w-16 h-16 rounded-md bg-gray-200 overflow-hidden relative shrink-0">
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

                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800 leading-tight">
                          {item.product.name}
                          {isCombo && (
                            <span className="ml-2 text-xs text-amber-600 font-semibold">
                              (Combo Offer)
                            </span>
                          )}
                        </h3>

                        <p className="text-sm text-gray-500">
                          Quantity: {item.quantity}
                        </p>

                        <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                          <div className="flex justify-between">
                            <span>Unit Price:</span>
                            <span>{formatPriceBDT(item.product.price)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>
                              {formatPriceBDT(item.product.price * item.quantity)}
                            </span>
                          </div>

                          {itemMaintenanceUnits > 0 && (
                            <div className="flex justify-between text-amber-600">
                              <span className="font-medium">
                                + Maintenance Fee ({itemMaintenanceUnits} × {formatPriceBDT(1)}):
                              </span>
                              <span className="font-medium">
                                {formatPriceBDT(itemMaintenanceFee)}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between pt-0.5 border-t border-gray-200 mt-1">
                            <span className="font-medium">Item Total:</span>
                            <span className="font-medium">
                              {formatPriceBDT(itemTotalPrice)}
                            </span>
                          </div>
                        </div>

                        {itemDeliveryDetail ? (
                          <p className="text-xs text-gray-400 mt-1">
                            Delivery:{" "}
                            {itemDeliveryDetail.charge === 0
                              ? "Free"
                              : formatPriceBDT(itemDeliveryDetail.charge)}
                            {itemDeliveryDetail.dataSource === "db" && (
                              <span className="text-amber-600"> (DB)</span>
                            )}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 mt-1">
                            Delivery: Not specified
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatPriceBDT(itemTotalPrice)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Breakdown */}
              <div className="border-t border-gray-200 pt-4 space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Products Subtotal</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatPriceBDT(baseSubtotal)}
                  </span>
                </div>

                {maintenanceFeeTotal > 0 && (
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-amber-800">
                        Maintenance Fee
                      </span>
                      <span className="text-sm font-medium text-amber-800">
                        {formatPriceBDT(maintenanceFeeTotal)}
                      </span>
                    </div>
                    <p className="text-xs text-amber-700">
                      Extra ৳1 per qualifying item (prices like 49/99/etc or items with delivery included).
                    </p>
                  </div>
                )}

                {/* Delivery */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Delivery Charge
                  </h3>

                  {shouldUseDbDelivery ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      <p className="font-semibold">
                        {smallestDbCharge === 0
                          ? "✓ Free Delivery"
                          : "✓ Delivery Charge Applied"}
                      </p>
                      <p className="mt-1">
                        {smallestDbCharge === 0
                          ? "All items have free delivery."
                          : `Using smallest delivery charge: ${formatPriceBDT(
                              smallestDbCharge
                            )}`}
                      </p>
                    </div>
                  ) : (
                    <>
                      <label
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          deliveryOption === "inside_dhaka"
                            ? "border-amber-500 bg-amber-50"
                            : "border-gray-200 hover:border-amber-400"
                        }`}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="deliveryOption"
                            className="h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                            checked={deliveryOption === "inside_dhaka"}
                            onChange={(e) =>
                              e.target.checked && setDeliveryOption("inside_dhaka")
                            }
                          />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              Inside Dhaka
                            </p>
                            <p className="text-xs text-gray-500">
                              Standard delivery inside Dhaka city
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatPriceBDT(70)}
                        </span>
                      </label>

                      <label
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          deliveryOption === "outside_dhaka"
                            ? "border-amber-500 bg-amber-50"
                            : "border-gray-200 hover:border-amber-400"
                        }`}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="deliveryOption"
                            className="h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                            checked={deliveryOption === "outside_dhaka"}
                            onChange={(e) =>
                              e.target.checked && setDeliveryOption("outside_dhaka")
                            }
                          />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              Outside Dhaka
                            </p>
                            <p className="text-xs text-gray-500">
                              Delivery anywhere outside Dhaka
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatPriceBDT(130)}
                        </span>
                      </label>

                      {!deliveryOption && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-xs text-yellow-700 text-center">
                            Please select a delivery option
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Delivery Charge</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatPriceBDT(deliveryCharge)}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatPriceBDT(total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Estimated delivery: 2-3 business days</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Package className="w-4 h-4 mr-2" />
                    <span>
                      {checkoutItems.length} item{checkoutItems.length !== 1 ? "s" : ""} in your order
                    </span>
                  </div>
                  {formData.paymentMethod === "cash_on_delivery" && (
                    <div className="text-sm text-gray-600">
                      <p>You'll pay {formatPriceBDT(total)} upon delivery</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* end right */}
        </div>
      </div>
    </div>
  );
}
