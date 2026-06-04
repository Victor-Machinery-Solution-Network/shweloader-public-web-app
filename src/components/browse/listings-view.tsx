"use client";

import { useEffect, useRef, useState } from "react";

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
  initialFilters,
  catalogs,
}: {
  initialListings: Listing[];
  initialFilters: BrowseFilters;
  catalogs: ListingsViewCatalogs;
}) {
  const filters = useBrowseFilters();
  const filtersKey = JSON.stringify(filters);
  const defaultKey = useRef(JSON.stringify(initialFilters));

  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);

    // Default view → reuse the prerendered listings, no network.
    if (filtersKey === defaultKey.current) {
      setListings(initialListings);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetchBrowseListings(filters.mode, toListingQuery(filters, catalogs), controller.signal)
      .then((rows) => {
        setListings(rows);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setErrored(true);
        setLoading(false);
      });

    return () => controller.abort();
    // `filters`/catalogs/initialListings are all captured via `filtersKey`;
    // catalogs + initialListings are render-stable props from the server page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  if (loading) return <ResultsSkeleton />;
  if (errored) {
    return (
      <div className="brz-grid-error" role="alert">
        <p>Couldn&apos;t load listings. Please check your connection and try again.</p>
      </div>
    );
  }

  return (
    <Results
      listings={listings}
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
  return (
    <div className="brz-grid" aria-busy="true" aria-label="Loading listings">
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
