"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/providers/language-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { T } from "@/components/t";
import type { Listing } from "@/lib/api/types";
import { Results } from "./results";
import { pushBrowseUrl } from "./navigate";
import { useBrowseFilters } from "./use-browse-filters";
import { buildBrowseHref, filterAndSortSaved, PAGE_SIZE } from "./filters";

const SAVED_KEY = "shweloader.saved";
const SAVED_EVENT = "saved-changed";
const BASE_PATH = "/saved";

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
 * Saved listings rendered through the Browse chrome (sidebar + toolbar provided by
 * `BrowseShell`). Unlike Browse, the listing set is FIXED: it's hydrated once from
 * the localStorage favourites via the same-origin `/api/listings/by-ids`, then
 * filtered/sorted/paginated entirely CLIENT-SIDE off the live URL filters
 * (`useBrowseFilters`) — no API round-trip per filter. Works fully signed-out and
 * re-hydrates when a heart toggles anywhere (or another tab writes).
 */
export function SavedView() {
  const { t } = useI18n();
  const filters = useBrowseFilters();
  const [all, setAll] = useState<Listing[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  // Whether the user has ANY saved ids, independent of fetch success — keeps the
  // "nothing saved" empty state distinct from a network error.
  const [hasIds, setHasIds] = useState(true);

  const load = useCallback(async (signal?: AbortSignal) => {
    const ids = readSavedIds();
    setHasIds(ids.length > 0);
    if (ids.length === 0) {
      setAll([]);
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
      const rows = Array.isArray(data) ? (data as Listing[]) : [];
      setAll(rows.filter((l) => l && typeof l.id === "number"));
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

  useEffect(() => {
    const onChange = () => void load();
    window.addEventListener(SAVED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(SAVED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [load]);

  // Filter + sort off the live URL filters, then page locally.
  const pageListings = useMemo(() => {
    const matched = filterAndSortSaved(all, filters);
    const start = (filters.page - 1) * PAGE_SIZE;
    return matched.slice(start, start + PAGE_SIZE);
  }, [all, filters]);

  if (status === "loading") {
    return (
      <div className="brz-grid" aria-busy="true" aria-label={t("a11y.loadingListings")}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skel-card">
            <div className="skel-img" />
            <div className="skel-body">
              <div className="skel-line" />
              <div className="skel-line" style={{ width: "65%" }} />
              <div className="skel-price" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="brz-grid-error" role="alert">
        <p>{t("browse.loadError")}</p>
      </div>
    );
  }

  // No saved items at all — distinct from "no matches for the active filters",
  // which `Results` renders.
  if (!hasIds || all.length === 0) {
    return (
      <EmptyState
        title={<T path="saved.empty" />}
        hint={<T path="saved.emptyHint" />}
      />
    );
  }

  return (
    <Results
      listings={pageListings}
      filters={filters}
      basePath={BASE_PATH}
      onNavigate={(page) =>
        pushBrowseUrl(buildBrowseHref({ ...filters, page }, BASE_PATH), {
          scrollTop: true,
        })
      }
    />
  );
}
