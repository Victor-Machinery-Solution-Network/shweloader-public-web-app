"use client";

import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/components/providers/language-provider";
import type {
  Brand,
  Category,
  ConditionType,
  Listing,
  StateRegion,
} from "@/lib/api/types";
import { fetchBrowseListings } from "@/lib/api/listings-client";
import { Results } from "./results";
import { pushBrowseUrl } from "./navigate";
import { useBrowseFilters } from "./use-browse-filters";
import {
  buildBrowseHref,
  toListingQuery,
  type BrowseFilters,
} from "./filters";

export interface ListingsViewCatalogs {
  categories: Category[];
  attachmentCategories: Category[];
  brands: Brand[];
  conditionTypes: ConditionType[];
  locations: StateRegion[];
}

/**
 * Client listings region for /browse.
 *
 * First render (SSR + hydration) shows `initialListings` — the unfiltered first
 * page the server prerendered into the static HTML (instant, indexable, no cold
 * start). Filter state comes from `useBrowseFilters` (NOT `useSearchParams`), so
 * this stays in the static prerender (no Suspense fallback / skeleton flash). The
 * hook returns the default on first render then syncs to the URL after mount;
 * when the active filters differ from default it fetches the same-origin
 * /api/listings proxy and swaps the grid.
 */
export function ListingsView({
  initialListings,
  initialTotal,
  initialFilters,
  catalogs,
}: {
  initialListings: Listing[];
  initialTotal: number | null;
  initialFilters: BrowseFilters;
  catalogs: ListingsViewCatalogs;
}) {
  const { t } = useI18n();
  const filters = useBrowseFilters();
  // Key the fetch on the actual API request (mode + resolved query), NOT the raw
  // filters: presentational-only params like `view` (grid/list) aren't part of
  // `toListingQuery`, so flipping them must not trigger a refetch / skeleton.
  const queryKey = JSON.stringify({
    mode: filters.mode,
    query: toListingQuery(filters, catalogs),
  });
  const defaultKey = useRef(
    JSON.stringify({
      mode: initialFilters.mode,
      query: toListingQuery(initialFilters, catalogs),
    }),
  );

  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [total, setTotal] = useState<number | null>(initialTotal);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);

    // Default query → reuse the prerendered listings, no network.
    if (queryKey === defaultKey.current) {
      setListings(initialListings);
      setTotal(initialTotal);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetchBrowseListings(filters.mode, toListingQuery(filters, catalogs), controller.signal)
      .then(({ listings: rows, total: count }) => {
        setListings(rows);
        setTotal(count);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setErrored(true);
        setLoading(false);
      });

    return () => controller.abort();
    // `filters`/catalogs/initialListings are all captured via `queryKey`;
    // catalogs + initialListings are render-stable props from the server page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  if (loading) return <ResultsSkeleton />;
  if (errored) {
    return (
      <div className="brz-grid-error" role="alert">
        <p>{t("browse.loadError")}</p>
      </div>
    );
  }

  return (
    <Results
      listings={listings}
      total={total}
      filters={filters}
      onNavigate={(page) =>
        pushBrowseUrl(buildBrowseHref({ ...filters, page }), { scrollTop: true })
      }
    />
  );
}

// Listings-only skeleton — shown only while a FILTER fetch is in flight (never on
// the default/direct load, which renders the prerendered listings immediately).
function ResultsSkeleton() {
  const { t } = useI18n();
  return (
    <div className="brz-grid" aria-busy="true" aria-label={t("a11y.loadingListings")}>
      {Array.from({ length: 9 }).map((_, i) => (
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
