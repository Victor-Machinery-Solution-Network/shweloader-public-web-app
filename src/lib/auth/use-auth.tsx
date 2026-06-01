"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Lightweight client auth-session state for the UI (header signed-in chip, etc.).
 *
 * Auth runs through Next route handlers (`/api/auth/*`) which proxy to the worker
 * and set an httpOnly `sl_token` cookie (never exposed to JS). A separate,
 * non-sensitive `sl_user` cookie holds display fields, which this hook reads.
 */
export interface WebUser {
  id?: number | string;
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  company?: string;
  partner?: boolean;
  businessType?: string;
  memberSince?: string;
}

interface AuthValue {
  signedIn: boolean;
  user: WebUser | null;
  refresh: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

function readUserCookie(): WebUser | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)sl_user=([^;]+)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1])) as WebUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<WebUser | null>(null);

  const refresh = useCallback(() => setUser(readUserCookie()), []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("auth-changed", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("auth-changed", onFocus);
    };
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setUser(null);
    window.dispatchEvent(new Event("auth-changed"));
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ signedIn: !!user, user, refresh, signOut }),
    [user, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  return (
    useContext(AuthContext) ?? {
      signedIn: false,
      user: null,
      refresh: () => {},
      signOut: async () => {},
    }
  );
}
