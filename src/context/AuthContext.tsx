"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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
  refreshUser: (force?: boolean) => Promise<AuthUser | null>;
  setUser: (next: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextState | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  /**
   * Optional preloaded user data (e.g. from server components)
   */
  initialUser?: AuthUser | null;
}

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [user, setUserState] = useState<AuthUser | null>(initialUser);
  const [isLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => user, [user]);

  const setUser = useCallback((next: AuthUser | null) => {
    setError(null);
    setUserState(next);
  }, []);

  const contextValue = useMemo<AuthContextState>(
    () => ({
      user,
      isLoading,
      error,
      refreshUser,
      setUser
    }),
    [user, isLoading, error, refreshUser, setUser]
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
