/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  cleanupOldOrderSources,
  clearCurrentOrderSource,
  generateOrderSourceToken,
  storeOrderSourceData,
  OrderSource,
  OrderSourceData,
} from "@/lib/orderSourceToken";

// Updated Product interface to match what components expect
export interface Product {
  oldPrice: number;
  id: string;
  name: string;
  price: number;
  image: string;
  slug: string;
  category?: string;
  categoryName?: string;
  description?: string;
  shortDescription?: string;
  tags?: string[];
  unit?: string;
  isCombo?: boolean;
  stock?: number;
  inventory?: {
    quantity?: number;
  };
  rating?: number;
  ratings?: {
    averageRating?: number;
    totalReviews?: number;
  };
  reviewsCount?: number;
  delivery?: {
    isFree: boolean;
    charge?: number;
    message?: string;
  };
  deliveryCharge?: number;
}

export type CartEntry = { product: Product; quantity: number };

export type CommerceContextValue = {
  cartItems: CartEntry[];
  activeCheckoutItems: CartEntry[];
  wishlistItems: Product[];
  userIp: string | null;
  isLoading: boolean;

  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;

  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  clearWishlist: () => void;
  toggleWishlist: (product: Product) => void;

  isInCart: (productId: string) => boolean;
  isInWishlist: (productId: string) => boolean;

  // Existing direct checkout API (for backwards compatibility)
  directCheckoutItems: CartEntry[];
  usingDirectCheckout: boolean;
  startDirectCheckout: (product: Product, quantity?: number) => void;
  clearDirectCheckout: () => void;

  // NEW: Superior / priority checkout session
  superiorCheckoutItems: CartEntry[];
  usingSuperiorCheckout: boolean;
  startSuperiorCheckout: (product: Product, quantity?: number) => void;
  clearSuperiorCheckout: () => void;
  generateOrderToken: (source: "buy_now" | "cart") => string;
  storeOrderSourceSnapshot: (
    token: string,
    source: OrderSource,
    items: CartEntry[],
    orderId?: string,
    contextItems?: any[]
  ) => OrderSourceData;
  cleanupOrderTokenStorage: () => void;
  clearOrderTokenSession: () => void;
};

const CommerceContext = createContext<CommerceContextValue | null>(null);

/**
 * ✅ Persist EVERYTHING here (no cookie size problems; no session reset).
 * Versioned for future migrations.
 */
const STORAGE_KEY = "RBS_COMMERCE_CONTEXT_V1";

type PersistedState = {
  version: 1;
  updatedAt: number;
  cart: CartEntry[];
  wishlist: Product[];
  ip: string | null;
  directCheckout: CartEntry[];
};

const ensureProduct = (product: unknown): product is Product => {
  if (typeof product !== "object" || product === null) return false;
  const maybe = product as Record<string, unknown>;
  if (!("id" in maybe) || typeof maybe.id !== "string") return false;
  return true;
};

const normalizeQuantity = (q: unknown, fallback = 1) => {
  if (typeof q !== "number" || !Number.isFinite(q)) return fallback;
  return Math.max(1, Math.floor(q));
};

const sanitizeCartEntries = (raw: unknown): CartEntry[] => {
  if (!Array.isArray(raw)) return [];
  const sanitized: CartEntry[] = [];
  raw.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const e = entry as any;
    const quantity = normalizeQuantity(e.quantity, 1);
    if (ensureProduct(e.product)) {
      sanitized.push({ product: e.product, quantity });
    }
  });
  return sanitized;
};

const sanitizeWishlist = (raw: unknown): Product[] => {
  if (!Array.isArray(raw)) return [];
  const sanitized: Product[] = [];
  raw.forEach((item) => {
    if (ensureProduct(item)) sanitized.push(item);
  });
  return sanitized;
};

const readFromStorage = (): PersistedState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedState> | null;
    if (!parsed || parsed.version !== 1) return null;

    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
      cart: sanitizeCartEntries(parsed.cart),
      wishlist: sanitizeWishlist(parsed.wishlist),
      ip: typeof parsed.ip === "string" ? parsed.ip : null,
      directCheckout: sanitizeCartEntries(parsed.directCheckout),
    };
  } catch (e) {
    console.warn("Failed to read commerce state from localStorage.", e);
    return null;
  }
};

const writeToStorage = (state: PersistedState) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to persist commerce state to localStorage.", e);
  }
};

export function CommerceProvider({ children }: { children: React.ReactNode }) {
  const [persistedState] = useState<PersistedState | null>(() => {
    if (typeof window === "undefined") return null;
    return readFromStorage();
  });

  const [cartItems, setCartItems] = useState<CartEntry[]>(
    persistedState?.cart ?? []
  );
  const [wishlistItems, setWishlistItems] = useState<Product[]>(
    persistedState?.wishlist ?? []
  );
  const [userIp, setUserIp] = useState<string | null>(
    persistedState?.ip ?? null
  );
  const [directCheckoutItems, setDirectCheckoutItems] = useState<CartEntry[]>(
    persistedState?.directCheckout ?? []
  );

  // Persist whenever anything changes
  useEffect(() => {

    const payload: PersistedState = {
      version: 1,
      updatedAt: Date.now(),
      cart: cartItems,
      wishlist: wishlistItems,
      ip: userIp ?? null,
      directCheckout: directCheckoutItems,
    };

    writeToStorage(payload);
  }, [cartItems, wishlistItems, userIp, directCheckoutItems]);

  // Fetch user IP once (won't erase anything)
  useEffect(() => {
    if (userIp) return;

    let cancelled = false;
    const resolveIp = async () => {
      try {
        const response = await fetch("/api/user-ip", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && data?.ip) setUserIp(data.ip);
      } catch (error) {
        console.warn("Unable to fetch user IP address.", error);
      }
    };

    resolveIp();
    return () => {
      cancelled = true;
    };
  }, [userIp]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    cleanupOldOrderSources();
  }, []);

  // Cart operations
  const addToCart = useCallback((product: Product, quantity = 1) => {
    if (!ensureProduct(product)) return;
    const q = normalizeQuantity(quantity, 1);

    setCartItems((previous) => {
      const existingIndex = previous.findIndex(
        (entry) => entry.product.id === product.id
      );

      if (existingIndex === -1) return [...previous, { product, quantity: q }];

      const updated = [...previous];
      const current = updated[existingIndex];
      updated[existingIndex] = { ...current, quantity: current.quantity + q };
      return updated;
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCartItems((previous) =>
      previous.filter((entry) => entry.product.id !== productId)
    );
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  // Wishlist operations
  const addToWishlist = useCallback((product: Product) => {
    if (!ensureProduct(product)) return;
    setWishlistItems((previous) => {
      if (previous.some((entry) => entry.id === product.id)) return previous;
      return [...previous, product];
    });
  }, []);

  const removeFromWishlist = useCallback((productId: string) => {
    setWishlistItems((previous) => previous.filter((p) => p.id !== productId));
  }, []);

  const clearWishlist = useCallback(() => setWishlistItems([]), []);

  const toggleWishlist = useCallback((product: Product) => {
    if (!ensureProduct(product)) return;
    setWishlistItems((previous) => {
      const exists = previous.some((entry) => entry.id === product.id);
      if (exists) return previous.filter((entry) => entry.id !== product.id);
      return [...previous, product];
    });
  }, []);

  const isInCart = useCallback(
    (productId: string) => cartItems.some((e) => e.product.id === productId),
    [cartItems]
  );

  const isInWishlist = useCallback(
    (productId: string) => wishlistItems.some((p) => p.id === productId),
    [wishlistItems]
  );

  // Direct checkout (persisted, no auto reset)
  const startDirectCheckout = useCallback((product: Product, quantity = 1) => {
    if (!ensureProduct(product)) return;
    const q = normalizeQuantity(quantity, 1);
    setDirectCheckoutItems([{ product, quantity: q }]);
  }, []);

  const clearDirectCheckout = useCallback(() => {
    setDirectCheckoutItems([]);
  }, []);

  // Superior checkout is the same thing here (priority checkout)
  const usingSuperiorCheckout = directCheckoutItems.length > 0;
  const superiorCheckoutItems = directCheckoutItems;

  const startSuperiorCheckout = useCallback(
    (product: Product, quantity = 1) => startDirectCheckout(product, quantity),
    [startDirectCheckout]
  );

  const clearSuperiorCheckout = useCallback(
    () => clearDirectCheckout(),
    [clearDirectCheckout]
  );

  const generateOrderToken = useCallback(
    (source: "buy_now" | "cart") => generateOrderSourceToken(source),
    []
  );

  const storeOrderSourceSnapshot = useCallback(
    (
      token: string,
      source: OrderSource,
      items: CartEntry[],
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

  const usingDirectCheckout = usingSuperiorCheckout;

  const isLoading = false;

  const activeCheckoutItems = usingSuperiorCheckout
    ? superiorCheckoutItems
    : cartItems;

  const value = useMemo(
    () => ({
      cartItems,
      wishlistItems,
      activeCheckoutItems,
      addToCart,
      removeFromCart,
      clearCart,
      addToWishlist,
      removeFromWishlist,
      clearWishlist,
      toggleWishlist,
      isInCart,
      isInWishlist,
      userIp,
      isLoading,

      directCheckoutItems,
      usingDirectCheckout,
      startDirectCheckout,
      clearDirectCheckout,

      superiorCheckoutItems,
      usingSuperiorCheckout,
      startSuperiorCheckout,
      clearSuperiorCheckout,
      generateOrderToken,
      storeOrderSourceSnapshot,
      cleanupOrderTokenStorage,
      clearOrderTokenSession,
    }),
    [
      cartItems,
      wishlistItems,
      activeCheckoutItems,
      addToCart,
      removeFromCart,
      clearCart,
      addToWishlist,
      removeFromWishlist,
      clearWishlist,
      toggleWishlist,
      isInCart,
      isInWishlist,
      userIp,
      isLoading,
      directCheckoutItems,
      usingDirectCheckout,
      startDirectCheckout,
      clearDirectCheckout,
      superiorCheckoutItems,
      usingSuperiorCheckout,
      startSuperiorCheckout,
      clearSuperiorCheckout,
      generateOrderToken,
      storeOrderSourceSnapshot,
      cleanupOrderTokenStorage,
      clearOrderTokenSession,
    ]
  );

  return (
    <CommerceContext.Provider value={value}>
      {children}
    </CommerceContext.Provider>
  );
}

export const useCommerce = () => {
  const context = useContext(CommerceContext);
  if (!context) {
    throw new Error("useCommerce must be used within a CommerceProvider");
  }
  return context;
};

export default CommerceContext;
