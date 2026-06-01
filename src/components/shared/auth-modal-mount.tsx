"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { useAuthUI } from "@/components/providers/auth-ui";

// Defer the ~1KLOC AuthModal (+ sonner toast, auth.css) until the user first
// opens it. Statically rendering it in the layout shipped its whole bundle to
// every route and hydrated it on every page load for nothing.
const AuthModal = dynamic(
  () => import("@/components/shared/auth-modal").then((m) => m.AuthModal),
  { ssr: false },
);

/** Mounts the auth modal lazily the first time it is opened, then keeps it
 *  mounted (so closing doesn't re-fetch the chunk). */
export function AuthModalMount() {
  const { mode } = useAuthUI();
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (mode !== "closed") setLoaded(true);
  }, [mode]);
  return loaded ? <AuthModal /> : null;
}
