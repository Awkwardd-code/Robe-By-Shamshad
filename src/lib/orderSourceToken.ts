/* eslint-disable @typescript-eslint/no-explicit-any */
const getWindow = () => (typeof window !== 'undefined' ? window : null);
const getSessionStorage = () => (typeof window !== 'undefined' ? window.sessionStorage : null);
const getLocalStorage = () => (typeof window !== 'undefined' ? window.localStorage : null);

type OrderSourceBase = 'buy_now' | 'cart';
export type OrderSource = OrderSourceBase | 'unknown';

export interface OrderSourceData {
  token: string;
  source: OrderSource;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
  }>;
  timestamp: number;
  expiresAt: number;
  orderId?: string;
  contextItems?: any[];
}

const getRandomString = () => {
  const timestamp = Date.now().toString(36);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const array = new Uint8Array(8);
    window.crypto.getRandomValues(array);
    return timestamp + Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return (
    timestamp +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

export const generateOrderSourceToken = (source: OrderSourceBase): string => {
  const timestamp = Date.now();
  const randomString = getRandomString();
  const token = `${source}_${timestamp}_${randomString}`;

  console.log('[Token Generation] Generated:', {
    token,
    source,
    timestamp,
    tokenLength: token.length,
  });

  return token;
};

export const storeOrderSourceData = (
  token: string,
  source: OrderSource,
  items: any[],
  orderId?: string,
  contextItems?: any[]
): OrderSourceData => {
  const data: OrderSourceData = {
    token,
    source,
    items: items.map((item) => ({
      productId: item.product?.id || item.productId,
      productName: item.product?.name || item.productName,
      quantity: item.quantity,
    })),
    contextItems: contextItems || items,
    timestamp: Date.now(),
    expiresAt: Date.now() + 30 * 60 * 1000,
    orderId,
  };

  console.log('[Token Storage] Storing:', {
    token,
    source,
    itemCount: items.length,
    orderId,
    hasContextItems: !!contextItems?.length,
  });

  const session = getSessionStorage();
  if (session) {
    try {
      session.setItem('order_source_token', token);
      session.setItem('order_source_data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to store in sessionStorage:', error);
    }
  }

  const local = getLocalStorage();
  if (local) {
    try {
      const storageKey = `order_source_${data.timestamp}`;
      local.setItem(storageKey, JSON.stringify(data));
      local.setItem(`token_${token}`, JSON.stringify(data));

      const recentTokensRaw = local.getItem('recent_order_tokens');
      const recentTokens = recentTokensRaw ? JSON.parse(recentTokensRaw) : [];
      recentTokens.push({ token, source, timestamp: data.timestamp });
      if (recentTokens.length > 10) recentTokens.shift();
      local.setItem('recent_order_tokens', JSON.stringify(recentTokens));
    } catch (error) {
      console.error('Failed to store in localStorage:', error);
    }
  }

  const win = getWindow();
  if (win) {
    (win as any).__lastOrderSourceToken = token;
    (win as any).__lastOrderSourceData = data;
  }

  cleanupOldOrderSources();

  return data;
};

export const getOrderSourceFromToken = (token: string | null): {
  source: OrderSource;
  data?: OrderSourceData;
  contextItems?: any[];
} => {
  if (!token) {
    console.log('[Token Validation] No token provided');
    return { source: 'unknown' };
  }

  console.log('[Token Validation] Validating token:', token);

  const win = getWindow();
  if (win) {
    if ((win as any).__lastOrderSourceToken === token) {
      const cached = (win as any).__lastOrderSourceData as OrderSourceData;
      if (cached && cached.expiresAt > Date.now()) {
        console.log('[Token Validation] Memory cache hit');
        return { source: cached.source, data: cached, contextItems: cached.contextItems };
      }
    }
  }

  const session = getSessionStorage();
  if (session) {
    try {
      const sessionToken = session.getItem('order_source_token');
      const sessionData = session.getItem('order_source_data');
      if (sessionToken === token && sessionData) {
        const data = JSON.parse(sessionData) as OrderSourceData;
        if (data.expiresAt > Date.now()) {
          console.log('[Token Validation] Session storage hit');
          return { source: data.source, data, contextItems: data.contextItems };
        }
      }
    } catch (error) {
      console.error('Error reading session storage:', error);
    }
  }

  const local = getLocalStorage();
  if (local) {
    try {
      const tokenData = local.getItem(`token_${token}`);
      if (tokenData) {
        const data = JSON.parse(tokenData) as OrderSourceData;
        if (data.expiresAt > Date.now()) {
          console.log('[Token Validation] Local storage direct hit');
          return { source: data.source, data, contextItems: data.contextItems };
        }
      }
    } catch (error) {
      console.error('Error in direct token lookup:', error);
    }

    try {
      const keys = Object.keys(local);
      for (const key of keys) {
        if (key.startsWith('order_source_') || key.startsWith('token_')) {
          try {
            const item = local.getItem(key);
            if (item) {
              const data = JSON.parse(item) as OrderSourceData;
              if (data.token === token && data.expiresAt > Date.now()) {
                console.log(`[Token Validation] Found entry in localStorage key: ${key}`);
                return { source: data.source, data, contextItems: data.contextItems };
              }
            }
          } catch {
            continue;
          }
        }
      }
    } catch (error) {
      console.error('Error scanning localStorage:', error);
    }
  }

  console.log('[Token Validation] Token not found');
  return { source: 'unknown' };
};

export const cleanupOldOrderSources = () => {
  const now = Date.now();

  const session = getSessionStorage();
  if (session) {
    try {
      const sessionData = session.getItem('order_source_data');
      if (sessionData) {
        const data = JSON.parse(sessionData) as OrderSourceData;
        if (data.expiresAt < now) {
          session.removeItem('order_source_token');
          session.removeItem('order_source_data');
        }
      }
    } catch {
      // ignore
    }
  }

  const local = getLocalStorage();
  if (local) {
    try {
      const keys = Object.keys(local);
      keys.forEach((key) => {
        if (key.startsWith('order_source_') || key.startsWith('token_')) {
          try {
            const item = local.getItem(key);
            if (item) {
              const data = JSON.parse(item) as OrderSourceData;
              if (data.expiresAt < now) {
                local.removeItem(key);
                if (key.startsWith('token_')) {
                  local.removeItem(`order_source_${data.timestamp}`);
                } else if (key.startsWith('order_source_')) {
                  local.removeItem(`token_${data.token}`);
                }
              }
            }
          } catch {
            local.removeItem(key);
          }
        }
      });

      const recentTokensRaw = local.getItem('recent_order_tokens');
      if (recentTokensRaw) {
        const recentTokens = JSON.parse(recentTokensRaw) as Array<{ timestamp: number }>;
        const validTokens = recentTokens.filter((t) => now - t.timestamp < 60 * 60 * 1000);
        if (validTokens.length !== recentTokens.length) {
          local.setItem('recent_order_tokens', JSON.stringify(validTokens));
        }
      }
    } catch {
      // ignore
    }
  }
};

export const clearCurrentOrderSource = () => {
  console.log('[Token Cleanup] Clearing session storage');
  const session = getSessionStorage();
  if (session) {
    try {
      session.removeItem('order_source_token');
      session.removeItem('order_source_data');
    } catch (error) {
      console.error('Error clearing sessionStorage:', error);
    }
  }
};

export const verifyTokenIntegrity = (token: string): boolean => {
  if (!token) return false;

  const lastUnderscore = token.lastIndexOf("_");
  if (lastUnderscore === -1) {
    console.log("[Token Integrity] Missing delimiters:", token);
    return false;
  }

  const beforeRandom = token.slice(0, lastUnderscore);
  const secondLastUnderscore = beforeRandom.lastIndexOf("_");
  if (secondLastUnderscore === -1) {
    console.log("[Token Integrity] Invalid format (timestamp separator):", token);
    return false;
  }

  const source = token.slice(0, secondLastUnderscore);
  const timestampPart = token.slice(secondLastUnderscore + 1, lastUnderscore);
  const timestamp = parseInt(timestampPart, 10);

  if (source !== 'buy_now' && source !== 'cart') {
    console.log('[Token Integrity] Invalid source:', source);
    return false;
  }

  const now = Date.now();
  const tokenAge = now - timestamp;
  if (isNaN(timestamp) || timestamp <= 0 || tokenAge > 30 * 60 * 1000) {
    console.log('[Token Integrity] Invalid timestamp:', { timestamp, tokenAge });
    return false;
  }

  return true;
};
