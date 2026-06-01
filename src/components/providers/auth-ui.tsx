"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type AuthMode = "closed" | "signin" | "register";

interface AuthUIValue {
  mode: AuthMode;
  open: (mode?: "signin" | "register") => void;
  close: () => void;
}

const AuthUIContext = createContext<AuthUIValue | null>(null);

/** Controls the global auth modal (sign-in / register). */
export function AuthUIProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AuthMode>("closed");
  const open = useCallback(
    (next: "signin" | "register" = "signin") => setMode(next),
    [],
  );
  const close = useCallback(() => setMode("closed"), []);
  const value = useMemo(() => ({ mode, open, close }), [mode, open, close]);
  return (
    <AuthUIContext.Provider value={value}>{children}</AuthUIContext.Provider>
  );
}

export function useAuthUI(): AuthUIValue {
  return (
    useContext(AuthUIContext) ?? {
      mode: "closed",
      open: () => {},
      close: () => {},
    }
  );
}
