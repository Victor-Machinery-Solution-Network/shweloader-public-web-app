import type { Brand, Category, ListingQuery } from "@/lib/api/types";

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

export const PAGE_SIZE = 24;

export interface BrowseFilters {
  q: string;
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

/** Heavy-equipment condition catalog — no dedicated API endpoint exists, so the
 *  facet list is fixed here. Order matches the typical admin condition set. */
export const CONDITIONS: { id: string; label: string }[] = [
  { id: "new", label: "New" },
  { id: "used", label: "Used" },
  { id: "reconditioned", label: "Reconditioned" },
  { id: "refurbished", label: "Refurbished" },
  { id: "for-parts", label: "For parts" },
];

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

  return {
    q: one(sp.q),
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

/** Serialize a filter state back to a `/browse?…` query string. */
export function buildBrowseHref(f: Partial<BrowseFilters>): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
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
  return qs ? `/browse?${qs}` : "/browse";
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

/**
 * Build the API `ListingQuery` from parsed filters + the fetched catalogs.
 * Only id-resolvable facets become structured params; free text + the leading
 * brand fall back to `search`. Conditions/locations have no id catalog, so the
 * sidebar exposes them as chips and they refine the `search` term.
 */
export function toListingQuery(
  f: BrowseFilters,
  catalogs: {
    categories: Category[];
    attachmentCategories: Category[];
    brands: Brand[];
  },
): ListingQuery {
  const query: ListingQuery = {
    limit: PAGE_SIZE,
    offset: (f.page - 1) * PAGE_SIZE,
  };

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

  return query;
}
