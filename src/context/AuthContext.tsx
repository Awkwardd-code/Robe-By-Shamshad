"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";



export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  avatarPublicId?: string;
  role?: string;
  isAdmin?: number;
}

interface AuthContextState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: (force?: boolean) => Promise<void>;
  setUser: (next: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextState | undefined>(undefined);

async function requestCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error ?? "Unable to load profile");
    }

    const data = await response.json();
    return data?.user ?? null;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unable to load profile");
  }
}

interface AuthProviderProps {
  children: React.ReactNode;
  /**
   * Optional preloaded user data (e.g. from server components)
   */
  initialUser?: AuthUser | null;
}

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser);
  const [error, setError] = useState<string | null>(null);
  const isRefreshingRef = useRef(false);

  const refreshUser = useCallback(
    async (force = false) => {
      if (isRefreshingRef.current || (!force && user === null && !isLoading)) {
        return;
      }
      isRefreshingRef.current = true;
      setIsLoading(true);
      setError(null);
      try {
        const profile = await requestCurrentUser();
        setUser(profile);
      } catch (refreshError) {
        const message =
          refreshError instanceof Error
            ? refreshError.message
            : "Unable to refresh user session";
        setError(message);
        setUser(null);
      } finally {
        isRefreshingRef.current = false;
        setIsLoading(false);
      }
    },
    [user, isLoading]
  );

  useEffect(() => {
    if (!initialUser) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contextValue = useMemo<AuthContextState>(
    () => ({
      user,
      isLoading,
      error,
      refreshUser,
      setUser
    }),
    [user, isLoading, error, refreshUser]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
