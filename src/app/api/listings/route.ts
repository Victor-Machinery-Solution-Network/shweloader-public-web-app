import type { NextRequest } from "next/server";

import { apiFetch } from "@/lib/api/client";
import { normalizeListing } from "@/lib/api/normalize";
import type { ApiListing } from "@/lib/api/types";

// Worker listing-query keys we forward upstream. Allowlisted — arbitrary params
// are never passed to the worker.
const QUERY_KEYS = [
  "limit",
  "offset",
  "type",
  "category_id",
  "sub_category_id",
  "model_id",
  "brand_id",
  "search",
  "condition_id",
  "price_min",
  "price_max",
  "currency",
  "township_id",
  "district_id",
  "state_region_id",
  "sort",
] as const;

/**
 * Same-origin proxy for Browse's client-side filtering.
 *
 * The browser fetches THIS route (no CORS); it calls the worker server-side, so
 * the worker stays private — matching the project's `server-only` API client
 * ("the browser never calls the worker directly"). Responses are CDN-cached per
 * query (SWR), so popular filters serve without re-invoking the function.
 *
 * The bare /browse landing does NOT use this route — its listings are baked into
 * the static prerender. This is only hit when the user applies a filter / sort /
 * page change.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("mode") === "rent" ? "rent" : "sale";

  const query: Record<string, string> = {};
  for (const key of QUERY_KEYS) {
    const value = sp.get(key);
    if (value) query[key] = value;
  }

  try {
    const data = await apiFetch<ApiListing[]>(`/listings/${mode}`, { query });
    const listings = data.map(normalizeListing);
    return Response.json(listings, {
      headers: {
        // Edge-cache per unique query; stale-while-revalidate so a popular filter
        // serves from the CDN instead of re-invoking the function.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch {
    return Response.json({ error: "Failed to load listings" }, { status: 502 });
  }
}
