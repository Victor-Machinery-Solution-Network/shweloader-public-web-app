"use client";

import { useEffect } from "react";

/**
 * Back/forward-cache (bfcache) auth guard for the private app area.
 *
 * A bfcache restore (e.g. logging out, then pressing Back) re-shows the page's
 * HTML *without re-running the server* — so it could expose stale authenticated
 * content (name, email, chat) after logout. On a persisted `pageshow`, if the
 * readable `sl_user` cookie is gone (logout clears it), force a reload so the
 * server gate (middleware) re-evaluates and redirects to sign-in. Logged-in
 * restores are left untouched, preserving bfcache's instant back-nav.
 */
export function BfcacheGuard() {
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return; // only bfcache restores re-run no server code
      const signedIn = /(?:^|;\s*)sl_user=/.test(document.cookie);
      if (!signedIn) window.location.reload();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);
  return null;
}
