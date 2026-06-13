"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import { useSavedStore, SAVED_KEY } from "./store";

/** Fetch the signed-in user's saved ids from the proxy (empty on any failure). */
async function loadServerIds(): Promise<number[]> {
  try {
    const res = await fetch("/api/saved-items");
    if (!res.ok) return [];
    const data: unknown = await res.json();
    const ids = (data as { ids?: unknown })?.ids;
    return Array.isArray(ids)
      ? ids.filter((x): x is number => typeof x === "number")
      : [];
  } catch {
    return [];
  }
}

/**
 * Drives the saved-store across the auth lifecycle. Mounted once in Providers.
 *
 * - Signed in: load the server set; if there are guest (localStorage) saves,
 *   merge them up — POST each (fire-and-forget, mirroring mobile), clear local,
 *   reload the server set so the merged items appear.
 * - Signed out: drop the server set so reads fall back to guest localStorage,
 *   and hydrate guest ids from storage.
 * - Cross-tab: re-hydrate guest ids on a `storage` event for the saved key.
 *
 * The merge runs off `useAuth().signedIn`, which flips on the `auth-changed`
 * event dispatched by login `finish()` and `signOut()` — so no edit to the
 * auth modal is needed.
 */
export function SavedSync() {
  const { signedIn } = useAuth();

  useEffect(() => {
    const store = useSavedStore.getState();
    let cancelled = false;

    if (!signedIn) {
      store.setServerIds(null);
      store.hydrateGuest();
      return;
    }

    void (async () => {
      store.setServerIds(await loadServerIds());
      if (cancelled) return;

      const guestIds = useSavedStore.getState().guestIds;
      if (guestIds.length === 0) return;

      // Merge guest saves → server (fire-and-forget), then clear local + reload.
      await Promise.all(
        guestIds.map((id) =>
          fetch(`/api/saved-items/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }).catch(() => {}),
        ),
      );
      if (cancelled) return;
      store.clearGuest();
      store.setServerIds(await loadServerIds());
    })();

    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SAVED_KEY) useSavedStore.getState().hydrateGuest();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}
