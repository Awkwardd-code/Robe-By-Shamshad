/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import {
  cleanupOldOrderSources,
  clearCurrentOrderSource,
  generateOrderSourceToken,
  storeOrderSourceData,
  OrderSource,
  OrderSourceData,
} from "@/lib/orderSourceToken";

type ProductLike = Record<string, unknown>;

const isProductLike = (value: unknown): value is ProductLike => {
  if (!value || typeof value !== "object") return false;
  const product = value as ProductLike;
  return typeof product.id === "string";
};

const ensureString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const ensureFiniteNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const enrichProduct = (product: ProductLike): ProductLike => {
  const price = ensureFiniteNumber(product.price, 0);
  const oldPrice = ensureFiniteNumber(product.oldPrice, price);

  return {
    ...product,
    price,
    oldPrice,
    name: ensureString(product.name, "Product"),
    image: ensureString(product.image, ""),
    slug: ensureString(product.slug, product.id as string),
    delivery: product.delivery ?? undefined,
    deliveryCharge:
      product.deliveryCharge !== undefined
        ? ensureFiniteNumber(product.deliveryCharge, 0)
        : undefined,
  };
};

export type SelectionPayload<TData = Record<string, unknown>> = {
  data: TData;
  quantity: number;
  capturedAt: number;
};

export type BuyNowContextValue = {
  lastProductSelection: SelectionPayload | null;
  lastComboSelection: SelectionPayload | null;

  registerProductSelection: (data: unknown, quantity?: number) => void;
  registerComboSelection: (data: unknown, quantity?: number) => void;

  clearProductSelection: () => void;
  clearComboSelection: () => void;
  clearSelections: () => void;

  resetContext: () => void; // soft reset
  forceResetContext: () => void; // hard reset (confirmation)

  generateOrderToken: (source: "buy_now" | "cart") => string;
  storeOrderSourceSnapshot: (
    token: string,
    source: OrderSource,
    items: any[],
    orderId?: string,
    contextItems?: any[]
  ) => OrderSourceData;
  cleanupOrderTokenStorage: () => void;
  clearOrderTokenSession: () => void;

  getContextState: () => {
    productSelection: SelectionPayload | null;
    comboSelection: SelectionPayload | null;
  };
};

const BuyNowContext = createContext<BuyNowContextValue | undefined>(undefined);

/** Storage keys */
const STORAGE_KEY = "sn-buy-now-selection";
const EPOCH_KEY = "sn-buy-now-epoch";
const RESET_TS_KEY = "sn-buy-now-reset-ts"; // localStorage
const LOCK_UNTIL_KEY = "sn-buy-now-lock-until"; // sessionStorage

type PersistedSelections = {
  epoch: number;
  product?: SelectionPayload;
  combo?: SelectionPayload;
};

const buildSelection = (data: unknown, quantity = 1): SelectionPayload => ({
  data: (data ?? {}) as Record<string, unknown>,
  quantity: Math.max(1, Math.floor(quantity)),
  capturedAt: Date.now(),
});

export function ensureCombo(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  if (
    "pricing" in obj &&
    obj.pricing &&
    typeof obj.pricing === "object" &&
    "discountedPrice" in (obj.pricing as object)
  ) {
    return true;
  }
  if ("products" in obj && Array.isArray(obj.products)) return true;

  if (
    "inventory" in obj &&
    obj.inventory &&
    typeof obj.inventory === "object" &&
    "totalStock" in (obj.inventory as object)
  ) {
    return true;
  }

  return false;
}

export function isComboWithCartProduct(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return "comboOffer" in obj && "cartProduct" in obj;
}

const normalizeSelectionData = (data: unknown): Record<string, unknown> => {
  if (!data) return {};
  if (isProductLike(data)) return enrichProduct(data);
  if (isComboWithCartProduct(data)) return data as Record<string, unknown>;
  if (ensureCombo(data)) return data as Record<string, unknown>;
  return typeof data === "object" ? (data as Record<string, unknown>) : {};
};

const getEpoch = (): number => {
  if (typeof window === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem(EPOCH_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

const setEpoch = (next: number) => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(EPOCH_KEY, String(next));
  } catch {}
};

const markResetPending = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RESET_TS_KEY, String(Date.now()));
  } catch {}
};

const isResetPending = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(RESET_TS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < 3000;
  } catch {
    return false;
  }
};

const clearResetFlag = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RESET_TS_KEY);
  } catch {}
};

const lockFor = (ms: number) => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(LOCK_UNTIL_KEY, String(Date.now() + ms));
  } catch {}
};

const isLocked = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(LOCK_UNTIL_KEY);
    const until = raw ? Number(raw) : 0;
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
};

const hydratePersistedSelections = (): {
  product: SelectionPayload | null;
  combo: SelectionPayload | null;
} => {
  if (typeof window === "undefined") return { product: null, combo: null };
  if (isResetPending() || isLocked()) {
    console.log("BuyNowContext: reset/lock pending, skipping hydration");
    return { product: null, combo: null };
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { product: null, combo: null };

    const parsed = JSON.parse(raw) as PersistedSelections;
    const currentEpoch = getEpoch();
    if (parsed?.epoch !== currentEpoch) {
      console.log("BuyNowContext: epoch mismatch, ignoring persisted selection");
      sessionStorage.removeItem(STORAGE_KEY);
      return { product: null, combo: null };
    }

    const now = Date.now();
    const MAX_AGE = 30 * 60 * 1000;

    const product =
      parsed.product && now - parsed.product.capturedAt < MAX_AGE
        ? parsed.product
        : null;
    const combo =
      parsed.combo && now - parsed.combo.capturedAt < MAX_AGE
        ? parsed.combo
        : null;

    if (product || combo) {
      console.log("BuyNowContext hydrated");
    }

    return { product, combo };
  } catch (e) {
    console.warn("BuyNowContext: hydrate failed", e);
    return { product: null, combo: null };
  }
};

/**
 * ✅ Clean all "four sessions":
 * 1) BuyNow selection session
 * 2) epoch session
 * 3) reset/lock control sessions
 * 4) order-source/token sessions (local + recent tokens + current session source)
 */
const cleanAllBuyNowSessions = () => {
  if (typeof window === "undefined") return;

  try {
    // 1) sessionStorage keys
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(EPOCH_KEY);
    sessionStorage.removeItem(LOCK_UNTIL_KEY);

    // 2) localStorage keys
    localStorage.removeItem(RESET_TS_KEY);

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("token_buy_now") || key.startsWith("sn-buy-now")) {
        localStorage.removeItem(key);
      }
    });

    // 3) recent tokens cleanup
    try {
      const recentTokens = JSON.parse(
        localStorage.getItem("recent_order_tokens") || "[]"
      );
      const filtered = (recentTokens as any[]).filter(
        (t) => !t?.token?.startsWith?.("buy_now_")
      );
      localStorage.setItem("recent_order_tokens", JSON.stringify(filtered));
    } catch {
      // ignore
    }

    // 4) order-source session cleanup
    clearCurrentOrderSource();
    cleanupOldOrderSources();

    console.log("BuyNowContext: all buy-now sessions cleaned");
  } catch (err) {
    console.error("BuyNowContext: failed to clean sessions", err);
  }
};

export function BuyNowProvider({ children }: { children: React.ReactNode }) {
  const [initialSelections] = useState(() => hydratePersistedSelections());
  const [productSelection, setProductSelection] = useState<SelectionPayload | null>(
    initialSelections.product
  );
  const [comboSelection, setComboSelection] = useState<SelectionPayload | null>(
    initialSelections.combo
  );

  const resetInProgressRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    cleanupOldOrderSources();
  }, []);

  const persistSelections = useCallback(
    (nextProduct: SelectionPayload | null, nextCombo: SelectionPayload | null) => {
      if (typeof window === "undefined") return;
      if (resetInProgressRef.current || isResetPending() || isLocked()) return;

      try {
        if (!nextProduct && !nextCombo) {
          sessionStorage.removeItem(STORAGE_KEY);
          return;
        }

        const payload: PersistedSelections = { epoch: getEpoch() };
        if (nextProduct) payload.product = nextProduct;
        if (nextCombo) payload.combo = nextCombo;

        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {
        console.warn("BuyNowContext: persist failed", e);
      }
    },
    []
  );

  useEffect(() => {
    persistSelections(productSelection, comboSelection);
  }, [productSelection, comboSelection, persistSelections]);

  // Register (blocked during reset/lock)
  const registerProductSelection = useCallback((data: unknown, quantity = 1) => {
    if (!data) return;

    if (isLocked() || isResetPending() || resetInProgressRef.current) {
      console.log("BuyNowContext: blocked product selection (reset/lock active)");
      return;
    }

    const normalizedData = normalizeSelectionData(data);
    const selection = buildSelection(normalizedData, quantity);

    setProductSelection(selection);
    setComboSelection(null);
  }, []);

  const registerComboSelection = useCallback((data: unknown, quantity = 1) => {
    if (!data) return;

    if (isLocked() || isResetPending() || resetInProgressRef.current) {
      console.log("BuyNowContext: blocked combo selection (reset/lock active)");
      return;
    }

    const normalizedData = normalizeSelectionData(data);
    const selection = buildSelection(normalizedData, quantity);

    setComboSelection(selection);
    setProductSelection(null);
  }, []);

  const clearProductSelection = useCallback(() => setProductSelection(null), []);
  const clearComboSelection = useCallback(() => setComboSelection(null), []);
  const clearSelections = useCallback(() => {
    setProductSelection(null);
    setComboSelection(null);
  }, []);

  // Soft reset
  const resetContext = useCallback(() => {
    clearSelections();
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    cleanupOldOrderSources();
    clearCurrentOrderSource();
  }, [clearSelections]);

  // Hard reset: clears state NOW + cleans all four sessions
  const forceResetContext = useCallback(() => {
    if (typeof window === "undefined") return;

    console.log("BuyNowContext: force reset started");

    resetInProgressRef.current = true;
    markResetPending();
    lockFor(3000);

    // bump epoch (invalidate persisted payloads)
    const nextEpoch = getEpoch() + 1;
    setEpoch(nextEpoch);

    // clear state immediately so consumers see null now
    flushSync(() => {
      setProductSelection(null);
      setComboSelection(null);
    });

    // ✅ clean all sessions + token/session source data
    cleanAllBuyNowSessions();

    // release flags
    setTimeout(() => {
      resetInProgressRef.current = false;
      clearResetFlag();
      console.log("BuyNowContext: force reset finished");
    }, 500);
  }, []);

  const generateOrderToken = useCallback(
    (source: "buy_now" | "cart") => generateOrderSourceToken(source),
    []
  );

  const storeOrderSourceSnapshot = useCallback(
    (
      token: string,
      source: OrderSource,
      items: any[],
      orderId?: string,
      contextItems?: any[]
    ) => storeOrderSourceData(token, source, items, orderId, contextItems),
    []
  );

  const cleanupOrderTokenStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    cleanupOldOrderSources();
  }, []);

  const clearOrderTokenSession = useCallback(() => {
    if (typeof window === "undefined") return;
    clearCurrentOrderSource();
  }, []);

  const getContextState = useCallback(
    () => ({ productSelection, comboSelection }),
    [productSelection, comboSelection]
  );

  const value = useMemo(
    () => ({
      lastProductSelection: productSelection,
      lastComboSelection: comboSelection,
      registerProductSelection,
      registerComboSelection,
      clearProductSelection,
      clearComboSelection,
      clearSelections,
      resetContext,
      forceResetContext,
      generateOrderToken,
      storeOrderSourceSnapshot,
      cleanupOrderTokenStorage,
      clearOrderTokenSession,
      getContextState,
    }),
    [
      productSelection,
      comboSelection,
      registerProductSelection,
      registerComboSelection,
      clearProductSelection,
      clearComboSelection,
      clearSelections,
      resetContext,
      forceResetContext,
      generateOrderToken,
      storeOrderSourceSnapshot,
      cleanupOrderTokenStorage,
      clearOrderTokenSession,
      getContextState,
    ]
  );

  return <BuyNowContext.Provider value={value}>{children}</BuyNowContext.Provider>;
}

export const useBuyNow = () => {
  const context = useContext(BuyNowContext);
  if (!context) {
    throw new Error("useBuyNow must be used within a BuyNowProvider");
  }
  return context;
};

export default BuyNowContext;
