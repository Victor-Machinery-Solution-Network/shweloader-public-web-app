"use client";

import { useCallback, useEffect, useState } from "react";

import { ListingCard } from "@/components/shared/listing-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { Listing } from "@/lib/api/types";

const SAVED_KEY = "shweloader.saved";
const SAVED_EVENT = "saved-changed";

/** Read the saved-listing id array from localStorage (resilient to bad data). */
function readSavedIds(): number[] {
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

type Status = "loading" | "ready" | "error";

/**
 * Client grid for the Saved page. Mirrors Browse's grid (`.brz-grid` of
 * `ListingCard`s) but is fed entirely by localStorage favourites:
 *
 *  - on mount (and on every `saved-changed` / cross-tab `storage` event) we
 *    read the saved ids and hydrate via the same-origin route
 *    `GET /api/listings/by-ids?ids=<csv>` → normalized `Listing[]`;
 *  - empty state when nothing is saved (no fetch needed);
 *  - a graceful error state if the hydrate request fails.
 *
 * Works fully signed-out — no auth/token involved.
 */
export function SavedGrid() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  // Track whether the user has any saved ids at all, independent of fetch
  // success, so the empty state is distinct from a network error.
  const [hasIds, setHasIds] = useState(true);

  const load = useCallback(async (signal?: AbortSignal) => {
    const ids = readSavedIds();
    setHasIds(ids.length > 0);

    if (ids.length === 0) {
      setListings([]);
      setStatus("ready");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch(
        `/api/listings/by-ids?ids=${encodeURIComponent(ids.join(","))}`,
        { signal },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json();
      const fetched = Array.isArray(data) ? (data as Listing[]) : [];

      // Preserve the user's save order (newest saves last in localStorage).
      const order = new Map(ids.map((id, i) => [id, i]));
      const ordered = [...fetched]
        .filter((l) => l && typeof l.id === "number")
        .sort(
          (a, b) =>
            (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
        );

      setListings(ordered);
      setStatus("ready");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // Re-hydrate when a heart toggles anywhere (same tab) or another tab writes.
  useEffect(() => {
    const onChange = () => void load();
    window.addEventListener(SAVED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(SAVED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [load]);

  if (status === "loading") {
    return (
      <div className="container" aria-busy="true">
        <div className="brz-grid" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="container">
        <EmptyState
          title="Couldn't load your saved items"
          hint="Something went wrong fetching your saved listings. Check your connection and try again."
        />
      </div>
    );
  }

  if (!hasIds || listings.length === 0) {
    return (
      <div className="container">
        <EmptyState
          title="No saved items yet"
          hint="Tap the heart on any listing to save it for later. Saved items appear here on this device."
        />
      </div>
    );
  }

  return (
    <div className="container">
      <div className="brz-grid">
        {listings.map((l) => (
          <ListingCard
            key={l.id}
            listing={l}
            mode={l.isRent && !l.isSale ? "rent" : "sale"}
          />
        ))}
      </div>
    </div>
  );
}
