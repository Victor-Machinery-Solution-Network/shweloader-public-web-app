"use client";

import { useCallback, useMemo } from "react";
import { create } from "zustand";
import { useAuth } from "@/lib/auth/use-auth";

/**
 * Single client source of truth for saved-listing ids.
 *
 * - Signed out: `guestIds`, persisted to localStorage under the existing
 *   `shweloader.saved` key in the raw `number[]` JSON format (so saves made
 *   before this feature still work). Written manually (not zustand/persist) to
 *   preserve that exact on-disk shape.
 * - Signed in: `serverIds` (in-memory; `null` = not loaded). Loaded + merged by
 *   <SavedSync/> on the `auth-changed` event; toggles write through the
 *   /api/saved-items proxy with an optimistic local update.
 *
 * `useSaved()` picks the active set from `useAuth().signedIn`.
 */

export const SAVED_KEY = "shweloader.saved";

export function readGuestIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is number => typeof x === "number")
      : [];
  } catch {
    return [];
  }
}

function writeGuestIds(ids: number[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  } catch {
    // private mode / quota — ignore
  }
}

interface SavedState {
  guestIds: number[];
  /** null until the server set is loaded (or while signed out). */
  serverIds: number[] | null;
  /** Re-read guest ids from localStorage (mount + cross-tab `storage` event). */
  hydrateGuest: () => void;
  toggleGuest: (id: number) => void;
  clearGuest: () => void;
  setServerIds: (ids: number[] | null) => void;
  /** Optimistic single-item set/unset on the server list. */
  setServerSaved: (id: number, saved: boolean) => void;
}

export const useSavedStore = create<SavedState>((set) => ({
  // Start empty so SSR and the first client render match; <SavedSync/> calls
  // hydrateGuest() after mount to pull the persisted ids (SSR-safe, mirrors the
  // old SaveButton's useEffect hydration).
  guestIds: [],
  serverIds: null,
  hydrateGuest: () => set({ guestIds: readGuestIds() }),
  toggleGuest: (id) =>
    set((s) => {
      const next = s.guestIds.includes(id)
        ? s.guestIds.filter((x) => x !== id)
        : [...s.guestIds, id];
      writeGuestIds(next);
      return { guestIds: next };
    }),
  clearGuest: () => {
    writeGuestIds([]);
    return set({ guestIds: [] });
  },
  setServerIds: (ids) => set({ serverIds: ids }),
  setServerSaved: (id, saved) =>
    set((s) => {
      const cur = s.serverIds ?? [];
      const has = cur.includes(id);
      if (saved && !has) return { serverIds: [...cur, id] };
      if (!saved && has) return { serverIds: cur.filter((x) => x !== id) };
      return {};
    }),
}));

/** Stable empty reference so `savedIds` keeps a constant identity when the
 *  active set is empty (lets consumers use it as a useEffect dependency). */
const EMPTY: number[] = [];

export interface UseSaved {
  savedIds: number[];
  isSaved: (id: number) => boolean;
  toggle: (id: number) => void;
}

/** Auth-aware saved-items interface consumed by SaveButton + the Saved page. */
export function useSaved(): UseSaved {
  const { signedIn } = useAuth();
  const guestIds = useSavedStore((s) => s.guestIds);
  const serverIds = useSavedStore((s) => s.serverIds);
  const toggleGuest = useSavedStore((s) => s.toggleGuest);
  const setServerSaved = useSavedStore((s) => s.setServerSaved);

  const savedIds = signedIn ? (serverIds ?? EMPTY) : guestIds;
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);
  const isSaved = useCallback((id: number) => savedSet.has(id), [savedSet]);

  const toggle = useCallback(
    (id: number) => {
      if (!signedIn) {
        toggleGuest(id);
        return;
      }
      const next = !savedSet.has(id);
      setServerSaved(id, next); // optimistic
      fetch(`/api/saved-items/${id}`, {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
      })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
        })
        .catch(() => {
          setServerSaved(id, !next); // revert — the heart pops back
        });
    },
    [signedIn, savedSet, toggleGuest, setServerSaved],
  );

  return { savedIds, isSaved, toggle };
}
