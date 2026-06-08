import { ListingCard } from "@/components/shared/listing-card";
import { ListingRow } from "@/components/shared/listing-row";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { T } from "@/components/t";
import type { Listing } from "@/lib/api/types";
import { buildBrowseHref, PAGE_SIZE, type BrowseFilters } from "./filters";

/**
 * Results region: grid of `ListingCard`s or list of `ListingRow`s per `view`, an
 * `EmptyState` when nothing matches, and a `Pagination` control. No public grand
 * total — `hasNext` is inferred from a full page of results
 * (`length === PAGE_SIZE`).
 *
 * `onNavigate`, when provided (by the client ListingsView), makes pagination
 * update the URL shallowly + fetch client-side instead of a full navigation.
 */
export function Results({
  listings,
  filters,
  onNavigate,
  basePath,
}: {
  listings: Listing[];
  filters: BrowseFilters;
  onNavigate?: (page: number) => void;
  /** Route the pagination links target — defaults to /browse; Saved passes /saved. */
  basePath?: string;
}) {
  const mode = filters.mode;

  if (listings.length === 0) {
    return (
      <EmptyState
        title={<T path="browse.emptyTitle" />}
        hint={<T path="browse.emptyHint" />}
      />
    );
  }

  const hasNext = listings.length === PAGE_SIZE;
  const hasPrev = filters.page > 1;

  return (
    <>
      {filters.view === "list" ? (
        <div className="brz-list">
          {listings.map((l) => (
            <ListingRow key={l.id} listing={l} mode={mode} />
          ))}
        </div>
      ) : (
        <div className="brz-grid">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} mode={mode} />
          ))}
        </div>
      )}

      <Pagination
        page={filters.page}
        hasPrev={hasPrev}
        hasNext={hasNext}
        hrefForPage={(p) => buildBrowseHref({ ...filters, page: p }, basePath)}
        onNavigate={onNavigate}
      />
    </>
  );
}
