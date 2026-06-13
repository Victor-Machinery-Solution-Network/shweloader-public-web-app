"use client";

import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/providers/language-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { T } from "@/components/t";
import type { Listing } from "@/lib/api/types";
import { useSaved } from "@/lib/saved/store";
import { Results } from "./results";
import { pushBrowseUrl } from "./navigate";
import { useBrowseFilters } from "./use-browse-filters";
import { buildBrowseHref, filterAndSortSaved, PAGE_SIZE } from "./filters";

const BASE_PATH = "/saved";

type Status = "loading" | "ready" | "error";

/**
 * Saved listings rendered through the Browse chrome (sidebar + toolbar provided by
 * `BrowseShell`). Unlike Browse, the listing set is FIXED: the saved ids come from
 * the shared saved-store (`useSaved` — localStorage when signed out, the account
 * when signed in), their details are fetched via the same-origin
 * `/api/listings/by-ids`, then filtered/sorted/paginated entirely CLIENT-SIDE off
 * the live URL filters (`useBrowseFilters`) — no API round-trip per filter.
 * Re-fetches whenever the saved set changes (heart toggled anywhere, login merge).
 */
export function SavedView() {
  const { t } = useI18n();
  const filters = useBrowseFilters();
  const { savedIds } = useSaved();
  const [all, setAll] = useState<Listing[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  // Whether the user has ANY saved ids, independent of fetch success — keeps the
  // "nothing saved" empty state distinct from a network error.
  const hasIds = savedIds.length > 0;
  // Stable primitive key: refetch only when the actual id set changes.
  const idsKey = useMemo(() => savedIds.join(","), [savedIds]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const ids = idsKey ? idsKey.split(",") : [];
      if (ids.length === 0) {
        setAll([]);
        setStatus("ready");
        return;
      }
      setStatus("loading");
      try {
        const res = await fetch(
          `/api/listings/by-ids?ids=${encodeURIComponent(ids.join(","))}`,
          { signal: controller.signal },
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
    })();
    return () => controller.abort();
  }, [idsKey]);

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
