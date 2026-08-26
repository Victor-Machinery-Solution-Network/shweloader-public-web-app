import { ListingCard } from "@/components/shared/listing-card";
import { ListingRow } from "@/components/shared/listing-row";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { T } from "@/components/t";
import type { Listing } from "@/lib/api/types";
import { buildBrowseHref, PAGE_SIZE, type BrowseFilters } from "./filters";

/**
 * Results region: grid of `ListingCard`s or list of `ListingRow`s per `view`, an
 * `EmptyState` when nothing matches, and numbered `Pagination` derived from the
 * `total` matching count (the API's X-Total-Count, or matched length on Saved).
 * `total` is null when the API reported no count — see the derivation below.
 *
 * `onNavigate`, when provided (by the client ListingsView), makes pagination
 * update the URL shallowly + fetch client-side instead of a full navigation.
 */
export function Results({
  listings,
  total,
  filters,
  onNavigate,
  basePath,
}: {
  listings: Listing[];
  /** Total matching listings across all pages — drives numbered pagination.
   *  `null` when the API reported no count (missing X-Total-Count). */
  total: number | null;
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

  // Unknown count: assume this page is the last unless it came back full, in
  // which case there's at least one more. Enough to keep later pages reachable
  // (a client fetch fills in the real count) without inventing a page number.
  const totalPages =
    total != null
      ? Math.max(1, Math.ceil(total / PAGE_SIZE))
      : filters.page + (listings.length === PAGE_SIZE ? 1 : 0);

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
        totalPages={totalPages}
        hrefForPage={(p) => buildBrowseHref({ ...filters, page: p }, basePath)}
        onNavigate={onNavigate}
      />
    </>
  );
}
