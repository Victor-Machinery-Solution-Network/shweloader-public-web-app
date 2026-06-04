import type { Listing, ListingQuery } from "./types";

/**
 * BROWSER listings fetcher for /browse filtering.
 *
 * Hits the SAME-ORIGIN proxy route (`/api/listings`), which calls the worker
 * server-side and normalizes — so there's no CORS dependency, the worker stays
 * private, and the response is CDN-cacheable per query. Returns the same
 * `Listing` shape the server produces (normalization happens in the route).
 *
 * Only used for filter/sort/pagination changes; the default first page is baked
 * into the static prerender (no fetch).
 */
export async function fetchBrowseListings(
  mode: "sale" | "rent",
  query: ListingQuery,
  signal?: AbortSignal,
): Promise<Listing[]> {
  const params = new URLSearchParams();
  params.set("mode", mode === "rent" ? "rent" : "sale");
  const all: Record<string, unknown> = { limit: 24, ...query };
  for (const [key, value] of Object.entries(all)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  const res = await fetch(`/api/listings?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) {
    throw new Error(`Listings request failed: HTTP ${res.status}`);
  }
  return (await res.json()) as Listing[];
}
