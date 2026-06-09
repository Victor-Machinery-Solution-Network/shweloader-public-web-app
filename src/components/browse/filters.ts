import type {
  Brand,
  Category,
  ConditionType,
  Listing,
  ListingQuery,
  StateRegion,
} from "@/lib/api/types";

/**
 * Browse filter state shared between the server page (which reads it from the
 * URL to build the API query) and the client filter UI (which writes it back to
 * the URL). Everything lives in `searchParams` — there is no client data fetch.
 *
 * Param contract (all optional): q, category, sub, brand, condition, location,
 * mode (sale|rent), sort (newest|price-asc|price-desc), view (grid|list), page.
 */

export type Mode = "sale" | "rent";
export type Sort = "newest" | "price-asc" | "price-desc";
export type View = "grid" | "list";
export type Currency = "MMK" | "USD";
/** Catalog split — equipment vs attachment. A stable, code-level dimension
 *  (not admin-editable data), so it's safe to deep-link from chrome. */
export type CatalogType = "equipment" | "attachment";

export const PAGE_SIZE = 24;

export interface BrowseFilters {
  q: string;
  /** Catalog split: "" = both, else equipment-only / attachment-only. */
  type: CatalogType | "";
  /** Selected equipment/attachment category name (single, from the design tree). */
  category: string;
  /** Selected sub-category name. */
  sub: string;
  /** Selected brand names. */
  brands: string[];
  /** Selected model ids (as strings), from the per-brand model sub-filter. */
  models: string[];
  /** Selected condition labels. */
  conditions: string[];
  /** Selected location label (state / district / township name). */
  location: string;
  currency: Currency;
  priceMin: string;
  priceMax: string;
  mode: Mode;
  sort: Sort;
  view: View;
  page: number;
}

const SORTS: Sort[] = ["newest", "price-asc", "price-desc"];

export type RawSearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

function many(v: string | string[] | undefined): string[] {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (!v) return [];
  // comma-separated multi-values
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Parse the raw Next.js searchParams object into a typed filter state. */
export function parseFilters(sp: RawSearchParams): BrowseFilters {
  const modeRaw = one(sp.mode).toLowerCase();
  const mode: Mode =
    modeRaw === "rent" || modeRaw === "buy" || modeRaw === "sale"
      ? modeRaw === "rent"
        ? "rent"
        : "sale"
      : "sale";

  const sortRaw = one(sp.sort) as Sort;
  const sort: Sort = SORTS.includes(sortRaw) ? sortRaw : "newest";

  const viewRaw = one(sp.view).toLowerCase();
  const view: View = viewRaw === "list" ? "list" : "grid";

  const currencyRaw = one(sp.currency).toUpperCase();
  const currency: Currency = currencyRaw === "USD" ? "USD" : "MMK";

  const pageNum = parseInt(one(sp.page), 10);
  const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;

  const typeRaw = one(sp.type).toLowerCase();
  const type: CatalogType | "" =
    typeRaw === "equipment" || typeRaw === "attachment" ? typeRaw : "";

  return {
    q: one(sp.q),
    type,
    category: one(sp.category),
    sub: one(sp.sub),
    brands: many(sp.brand),
    models: many(sp.model),
    conditions: many(sp.condition),
    location: one(sp.location),
    currency,
    priceMin: one(sp.priceMin),
    priceMax: one(sp.priceMax),
    mode,
    sort,
    view,
    page,
  };
}

/**
 * Serialize a filter state to a `<basePath>?…` query string. `basePath` defaults
 * to the current route on the client (so the same Browse chrome serves both
 * `/browse` and `/saved`), with a `/browse` SSR fallback. Render-time callers
 * (pagination links) pass `basePath` explicitly to stay hydration-safe; click
 * handlers can rely on the inferred current route.
 */
export function buildBrowseHref(
  f: Partial<BrowseFilters>,
  basePath?: string,
): string {
  const base =
    basePath ?? (typeof window !== "undefined" ? window.location.pathname : "/browse");
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.type) p.set("type", f.type);
  if (f.category) p.set("category", f.category);
  if (f.sub) p.set("sub", f.sub);
  if (f.brands && f.brands.length) p.set("brand", f.brands.join(","));
  if (f.models && f.models.length) p.set("model", f.models.join(","));
  if (f.conditions && f.conditions.length) p.set("condition", f.conditions.join(","));
  if (f.location) p.set("location", f.location);
  if (f.currency && f.currency !== "MMK") p.set("currency", f.currency);
  if (f.priceMin) p.set("priceMin", f.priceMin);
  if (f.priceMax) p.set("priceMax", f.priceMax);
  if (f.mode && f.mode !== "sale") p.set("mode", f.mode);
  if (f.sort && f.sort !== "newest") p.set("sort", f.sort);
  if (f.view && f.view !== "grid") p.set("view", f.view);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Resolve a category name to its id across equipment + attachment catalogs. */
function findCategoryId(
  name: string,
  categories: Category[],
  attachmentCategories: Category[],
): number | undefined {
  if (!name) return undefined;
  const lc = name.toLowerCase();
  for (const c of [...categories, ...attachmentCategories]) {
    if (c.name.toLowerCase() === lc) return c.id;
  }
  return undefined;
}

/** Resolve a sub-category name to its id (and its parent category id). */
function findSubCategory(
  name: string,
  categories: Category[],
  attachmentCategories: Category[],
): { subId: number; parentId: number } | undefined {
  if (!name) return undefined;
  const lc = name.toLowerCase();
  for (const c of [...categories, ...attachmentCategories]) {
    for (const s of c.subCategories) {
      if (s.name.toLowerCase() === lc) return { subId: s.id, parentId: c.id };
    }
  }
  return undefined;
}

/** Resolve a location name to the most specific level it matches (township →
 *  district → state), so the worker can filter by the right id column. */
function findLocation(
  name: string,
  locations: StateRegion[],
):
  | { township_id: number }
  | { district_id: number }
  | { state_region_id: number }
  | undefined {
  if (!name) return undefined;
  const lc = name.toLowerCase();
  for (const s of locations)
    for (const d of s.districts)
      for (const t of d.townships)
        if (t.name.toLowerCase() === lc) return { township_id: t.id };
  for (const s of locations)
    for (const d of s.districts)
      if (d.name.toLowerCase() === lc) return { district_id: d.id };
  for (const s of locations)
    if (s.name.toLowerCase() === lc) return { state_region_id: s.id };
  return undefined;
}

/**
 * Build the API `ListingQuery` from parsed filters + the fetched catalogs.
 * Every facet maps to a structured, id-resolvable param the worker filters on:
 * category/sub/brand/model, condition (name→id), location (name→level+id), and
 * the price range (sent with its currency). Free text becomes `search`.
 */
export function toListingQuery(
  f: BrowseFilters,
  catalogs: {
    categories: Category[];
    attachmentCategories: Category[];
    brands: Brand[];
    conditionTypes: ConditionType[];
    locations: StateRegion[];
  },
): ListingQuery {
  const query: ListingQuery = {
    limit: PAGE_SIZE,
    offset: (f.page - 1) * PAGE_SIZE,
  };

  // Catalog split (equipment vs attachment) — a structural, id-free filter the
  // worker applies directly.
  if (f.type) query.type = f.type;

  // Sub-category wins over category (and pins its parent).
  const sub = findSubCategory(f.sub, catalogs.categories, catalogs.attachmentCategories);
  if (sub) {
    query.sub_category_id = sub.subId;
    query.category_id = sub.parentId;
  } else {
    const catId = findCategoryId(
      f.category,
      catalogs.categories,
      catalogs.attachmentCategories,
    );
    if (catId != null) query.category_id = catId;
  }

  // Brand + model are one facet: resolve every selected brand name to its id and
  // pass all selected brand + model ids as comma-lists (the worker does `IN (…)`,
  // combining brand and model with OR).
  const searchTerms: string[] = [];
  if (f.brands.length) {
    const ids = f.brands
      .map(
        (name) =>
          catalogs.brands.find((b) => b.name.toLowerCase() === name.toLowerCase())
            ?.id,
      )
      .filter((x): x is number => x != null);
    if (ids.length) query.brand_id = ids.join(",");
  }
  if (f.models.length) {
    const ids = f.models
      .map((m) => parseInt(m, 10))
      .filter((n) => Number.isFinite(n));
    if (ids.length) query.model_id = ids.join(",");
  }

  if (f.q.trim()) searchTerms.push(f.q.trim());

  const search = searchTerms.join(" ").trim();
  if (search) query.search = search;

  // Condition — resolve selected condition names to their condition_type ids.
  if (f.conditions.length) {
    const ids = f.conditions
      .map(
        (name) =>
          catalogs.conditionTypes.find(
            (c) => c.name.toLowerCase() === name.toLowerCase(),
          )?.id,
      )
      .filter((x): x is number => x != null);
    if (ids.length) query.condition_id = ids.join(",");
  }

  // Price range — send with the currency so the worker filters the right column.
  if (f.priceMin) query.price_min = f.priceMin;
  if (f.priceMax) query.price_max = f.priceMax;

  // Sort server-side (over the full result set). Price sorts need the currency
  // so the worker orders by the matching column.
  query.sort = f.sort;
  if (
    f.priceMin ||
    f.priceMax ||
    f.sort === "price-asc" ||
    f.sort === "price-desc"
  ) {
    query.currency = f.currency;
  }

  // Location — resolve the selected name to township/district/state id.
  const loc = findLocation(f.location, catalogs.locations);
  if (loc) Object.assign(query, loc);

  return query;
}

/**
 * Client-side mirror of `toListingQuery` for the Saved page. Saved holds a FIXED
 * set of hydrated `Listing`s (from localStorage), so it filters + sorts in memory
 * instead of hitting the API. Semantics track Browse's server filters as closely
 * as the normalized `Listing` allows (names for category/brand/condition/location,
 * model by id). Returns the full filtered + sorted list (the caller paginates).
 */
export function filterAndSortSaved(
  listings: Listing[],
  f: BrowseFilters,
): Listing[] {
  const lc = (s: string | null | undefined) => (s ?? "").toLowerCase();
  const usd = f.currency === "USD";
  // Visible price for the active mode, or null if absent/hidden. Hidden price is
  // excluded from range filtering and sorted last — mirrors the worker.
  const priceOf = (l: Listing): number | null => {
    const src = f.mode === "rent" ? l.rent : l.sale;
    if (!src || src.hide) return null;
    return (usd ? src.usd : src.mmk) ?? null;
  };

  const min = f.priceMin ? parseFloat(f.priceMin) : null;
  const max = f.priceMax ? parseFloat(f.priceMax) : null;
  const q = f.q.trim().toLowerCase();

  const filtered = listings.filter((l) => {
    if (f.mode === "sale" && !l.isSale) return false;
    if (f.mode === "rent" && !l.isRent) return false;
    if (f.type && l.type !== f.type) return false;

    if (f.sub) {
      if (lc(l.subCategory) !== f.sub.toLowerCase()) return false;
    } else if (f.category) {
      if (lc(l.category) !== f.category.toLowerCase()) return false;
    }

    // Brand + model are one facet, combined with OR (same as the worker).
    if (f.brands.length || f.models.length) {
      const brandHit = f.brands.some((b) => lc(l.brand) === b.toLowerCase());
      const modelHit = l.modelId != null && f.models.includes(String(l.modelId));
      if (!brandHit && !modelHit) return false;
    }

    if (
      f.conditions.length &&
      !f.conditions.some((c) => lc(l.condition) === c.toLowerCase())
    )
      return false;

    if (f.location) {
      const target = f.location.toLowerCase();
      const { township, district, state } = l.location;
      if (lc(township) !== target && lc(district) !== target && lc(state) !== target)
        return false;
    }

    if (min != null || max != null) {
      const p = priceOf(l);
      if (p == null) return false; // hidden/absent price → excluded from a range
      if (min != null && p < min) return false;
      if (max != null && p > max) return false;
    }

    if (q) {
      // Mirror app-api's `search` WHERE clause (listings.ts): it LIKEs the term
      // against model/title, description, brand name, AND the category names
      // (equipment main + sub, attachment category). Match the same surface here
      // so free-text on Saved returns the same set Browse would.
      if (
        !(
          lc(l.title).includes(q) ||
          lc(l.brand).includes(q) ||
          lc(l.description).includes(q) ||
          lc(l.category).includes(q) ||
          lc(l.subCategory).includes(q)
        )
      )
        return false;
    }
    return true;
  });

  const out = filtered.slice();
  if (f.sort === "price-asc" || f.sort === "price-desc") {
    const dir = f.sort === "price-asc" ? 1 : -1;
    out.sort((a, b) => {
      const pa = priceOf(a);
      const pb = priceOf(b);
      if (pa == null && pb == null) return 0;
      if (pa == null) return 1; // null/hidden price last
      if (pb == null) return -1;
      return (pa - pb) * dir;
    });
  } else {
    // "newest" (the default) — by createdAt desc.
    out.sort(
      (a, b) =>
        (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0),
    );
  }
  return out;
}
