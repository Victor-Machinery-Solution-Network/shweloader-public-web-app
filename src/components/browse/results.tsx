import { ListingCard } from "@/components/shared/listing-card";
import { ListingRow } from "@/components/shared/listing-row";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import type { Listing } from "@/lib/api/types";
import { PAGE_SIZE, type BrowseFilters } from "./filters";

/**
 * Server-rendered results region: grid of `ListingCard`s or list of
 * `ListingRow`s per `view`, an `EmptyState` when nothing matches, and a
 * `Pagination` control. No public grand total — `hasNext` is inferred from a
 * full page of results (`length === PAGE_SIZE`).
 */
export function Results({
  listings,
  filters,
}: {
  listings: Listing[];
  filters: BrowseFilters;
}) {
  const mode = filters.mode;

  if (listings.length === 0) {
    return (
      <EmptyState
        title="No listings match your filters"
        hint="Try widening the price range, removing a region, or clearing some filters."
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

      <Pagination page={filters.page} hasPrev={hasPrev} hasNext={hasNext} />
    </>
  );
}
