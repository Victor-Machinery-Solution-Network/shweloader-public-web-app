"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthUI } from "./auth-ui";
import { useAuth } from "@/lib/auth/use-auth";

// Where to send the user once they finish signing in — captured from the
// `?next=` param middleware adds when it bounces an unauthenticated visitor off
// a private route. Module-level so it survives the modal's open/close. It does
// NOT leak across visits: middleware redirects with a full navigation, which
// re-initialises this module.
let pendingNext: string | null = null;

/**
 * Bridges the server-side gate (middleware) to the client auth modal:
 *  - On landing at `/?signin=1&next=…`, auto-open the sign-in modal and stash
 *    `next`, then strip the params so refresh/back is clean.
 *  - After a successful sign-in, return the user to that intended page.
 *
 * Reads `window.location` (not `useSearchParams`) to avoid forcing a Suspense
 * boundary / client-rendering deopt on every page. Renders nothing.
 */
export function AuthIntent() {
  const { open } = useAuthUI();
  const { signedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("signin") !== "1") return;

    const next = params.get("next");
    pendingNext = next && next.startsWith("/") ? next : null;
    open("signin");

    params.delete("signin");
    params.delete("next");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash,
    );
  }, [open]);

  useEffect(() => {
    if (signedIn && pendingNext) {
      const dest = pendingNext;
      pendingNext = null;
      router.replace(dest);
    }
  }, [signedIn, router]);

  return null;
}
