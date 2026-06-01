import { cacheLife, cacheTag } from "next/cache";
import { apiFetch, apiFetchOrNull } from "./client";
import { normalizeListing } from "./normalize";
import { CACHE_TAGS, listingTag } from "./cache-tags";
import type { ApiListing, Listing, ListingQuery } from "./types";

export async function getFeaturedListings(): Promise<Listing[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.listings, CACHE_TAGS.featured);
  const data = await apiFetch<ApiListing[]>("/listings/featured");
  return data.map(normalizeListing);
}

export async function getSaleListings(
  query: ListingQuery = {},
): Promise<Listing[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.listings);
  const data = await apiFetch<ApiListing[]>("/listings/sale", {
    query: { limit: 24, ...query },
  });
  return data.map(normalizeListing);
}

export async function getRentListings(
  query: ListingQuery = {},
): Promise<Listing[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.listings);
  const data = await apiFetch<ApiListing[]>("/listings/rent", {
    query: { limit: 24, ...query },
  });
  return data.map(normalizeListing);
}

/** Combined browse query across sale + rent based on `mode`. */
export async function browseListings(opts: {
  mode?: "sale" | "rent";
  query?: ListingQuery;
}): Promise<Listing[]> {
  return opts.mode === "rent"
    ? getRentListings(opts.query)
    : getSaleListings(opts.query);
}

export async function getListing(id: number): Promise<Listing | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.listings, listingTag(id));
  const data = await apiFetchOrNull<ApiListing>(`/listings/${id}`);
  return data ? normalizeListing(data) : null;
}

/** Listings in the same category, excluding the current one ("You may also like"). */
export async function getRelatedListings(
  listing: Listing,
  limit = 8,
): Promise<Listing[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.listings);
  // Match the listing's own mode so a rent-only product shows rentals, not sales.
  const endpoint =
    listing.isRent && !listing.isSale ? "/listings/rent" : "/listings/sale";
  const data = await apiFetch<ApiListing[]>(endpoint, {
    query: { limit: limit + 1, type: listing.type },
  });
  return data
    .map(normalizeListing)
    .filter((l) => l.id !== listing.id)
    .slice(0, limit);
}

/** A capped list of every listing id+slug source, for sitemap generation. */
export async function getAllListingsForSitemap(): Promise<Listing[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.listings);
  const [sale, rent] = await Promise.all([
    apiFetch<ApiListing[]>("/listings/sale", { query: { limit: 1000 } }),
    apiFetch<ApiListing[]>("/listings/rent", { query: { limit: 1000 } }),
  ]);
  const byId = new Map<number, Listing>();
  for (const raw of [...sale, ...rent]) {
    if (!byId.has(raw.id)) byId.set(raw.id, normalizeListing(raw));
  }
  return [...byId.values()];
}
