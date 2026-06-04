"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

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
import {
  buildBrowseHref,
  parseFilters,
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
 * First render (SSR + hydration) shows `initialListings` / `initialFilters` —
 * the unfiltered first page the server prerendered into the static HTML (instant,
 * indexable, no cold start). State is INITIALIZED to those props (not derived
 * from the URL) so the server and client-first renders are identical — no
 * hydration mismatch on a direct filtered URL. After mount, an effect reads the
 * URL: when the filters match the default it keeps the prerendered listings (no
 * network); otherwise it fetches the same-origin /api/listings proxy and swaps.
 * Filter/sort/pagination changes update the URL shallowly (no Vercel function /
 * full navigation).
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
  const searchParams = useSearchParams();
  const spString = searchParams.toString();

  // A URL whose parsed filters match this fingerprint never triggers a fetch.
  const defaultKey = useRef(JSON.stringify(initialFilters));

  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [filters, setFilters] = useState<BrowseFilters>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const next = parseFilters(Object.fromEntries(new URLSearchParams(spString)));
    setFilters(next);
    setErrored(false);

    // Default view → reuse the prerendered listings, no network.
    if (JSON.stringify(next) === defaultKey.current) {
      setListings(initialListings);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetchBrowseListings(next.mode, toListingQuery(next, catalogs), controller.signal)
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
    // catalogs/initialListings are render-stable props from the server page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spString]);

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

// Listings-only skeleton — the sidebar + chrome are already painted by the shell.
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
