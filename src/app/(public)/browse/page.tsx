import { Suspense } from "react";
import type { Metadata } from "next";

import "@/styles/pages/browse.css";

import { cacheLife, cacheTag } from "next/cache";
import { browseListings } from "@/lib/api/listings";
import { CACHE_TAGS } from "@/lib/api/cache-tags";
import {
  getAttachmentCategories,
  getBrands,
  getConditionTypes,
  getEquipmentCategories,
} from "@/lib/api/taxonomy";
import { getLocations } from "@/lib/api/locations";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  JsonLd,
  breadcrumbSchema,
  collectionPageSchema,
} from "@/lib/seo/jsonld";
import { BrowseShell } from "@/components/browse/browse-shell";
import { BrowseSkeleton } from "@/components/browse/browse-skeleton";
import { Results } from "@/components/browse/results";
import {
  parseFilters,
  toListingQuery,
  type BrowseFilters,
  type RawSearchParams,
} from "@/components/browse/filters";
import type { ListingQuery } from "@/lib/api/types";

/* ── Page-title helpers ─────────────────────────────────────── */
function titleFromFilters(f: ReturnType<typeof parseFilters>): string {
  const parts: string[] = [];
  if (f.q) parts.push(`"${f.q}"`);
  if (f.brands.length) parts.push(f.brands.join(", "));
  if (f.sub) parts.push(f.sub);
  else if (f.category) parts.push(f.category);
  const verb = f.mode === "rent" ? "for rent" : "for sale";
  const subject = parts.length ? parts.join(" ") : "Heavy equipment";
  let title = `${subject} ${verb}`;
  if (f.location) title += ` in ${f.location}`;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<Metadata> {
  const filters = parseFilters(await searchParams);
  const hasFilters =
    filters.q ||
    filters.category ||
    filters.sub ||
    filters.brands.length ||
    filters.models.length ||
    filters.location ||
    filters.mode === "rent";

  const title = hasFilters ? titleFromFilters(filters) : "Browse heavy equipment";
  const description = hasFilters
    ? `${title} on ShweLoader — Myanmar's heavy equipment marketplace. Compare listings with MMK and USD pricing.`
    : "Browse excavators, wheel loaders, cranes, bulldozers, and attachments for sale and rent across Myanmar on ShweLoader.";

  // A clean single-category view (no other filters, page 1) gets its OWN
  // canonical so it can rank as a long-tail landing page ("Excavators for sale
  // in Myanmar"). Noisier combos (sub-category, brand, location, search) keep
  // consolidating to /browse to avoid thin/duplicate pages.
  const onlyCategory =
    !!filters.category &&
    !filters.sub &&
    !filters.brands.length &&
    !filters.models.length &&
    !filters.location &&
    !filters.q;
  const canonicalPath =
    onlyCategory && filters.page === 1
      ? `/browse?category=${encodeURIComponent(filters.category)}${
          filters.mode === "rent" ? "&mode=rent" : ""
        }`
      : "/browse";

  return buildMetadata({
    title,
    description,
    path: canonicalPath,
    // Paginated permutations shouldn't dilute the canonical index.
    noindex: filters.page > 1,
  });
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  // STATIC shell: fetch the (cached) sidebar taxonomy once and render the full
  // browse chrome — page head, filter sidebar, toolbar — into the prerender.
  // This paints instantly from the CDN; only the listings grid streams behind
  // the Suspense boundary. Because the 5 taxonomy feeds are fetched here (at
  // build/revalidate), the dynamic part only fetches the listings.
  const [categories, attachmentCategories, brands, locations, conditionTypes] =
    await Promise.all([
      getEquipmentCategories(),
      getAttachmentCategories(),
      getBrands(),
      getLocations(),
      getConditionTypes(),
    ]);

  return (
    // The chrome (sidebar + toolbar) reads the URL via useSearchParams, which
    // Cache Components requires inside Suspense — so it streams in fast (no data
    // fetch, server-rendered selected-state) while the listings stream
    // independently behind the inner boundary.
    <Suspense fallback={<BrowseSkeleton />}>
      <BrowseShell
        categories={categories}
        attachmentCategories={attachmentCategories}
        brands={brands}
        locations={locations}
        conditionTypes={conditionTypes}
      >
        <Suspense fallback={<ResultsSkeleton />}>
          <ListingsSection
            searchParams={searchParams}
            categories={categories}
            attachmentCategories={attachmentCategories}
            brands={brands}
            conditionTypes={conditionTypes}
            locations={locations}
          />
        </Suspense>
      </BrowseShell>
    </Suspense>
  );
}

// Dynamic boundary: read the (dynamic) searchParams, resolve the filter names to
// ids using the already-fetched taxonomy, and hand the small, serializable query
// to the cached grid.
async function ListingsSection({
  searchParams,
  categories,
  attachmentCategories,
  brands,
  conditionTypes,
  locations,
}: {
  searchParams: Promise<RawSearchParams>;
  categories: Awaited<ReturnType<typeof getEquipmentCategories>>;
  attachmentCategories: Awaited<ReturnType<typeof getAttachmentCategories>>;
  brands: Awaited<ReturnType<typeof getBrands>>;
  conditionTypes: Awaited<ReturnType<typeof getConditionTypes>>;
  locations: Awaited<ReturnType<typeof getLocations>>;
}) {
  const filters = parseFilters(await searchParams);
  const query = toListingQuery(filters, {
    categories,
    attachmentCategories,
    brands,
    conditionTypes,
    locations,
  });
  return <ListingsGrid query={query} filters={filters} />;
}

// The listings render, cached per resolved query — light now (just the grid +
// its JSON-LD; the heavy sidebar lives in the static shell). Sort is server-side
// (worker ORDER BY). Busted on catalog changes via the /api/revalidate webhook.
async function ListingsGrid({
  query,
  filters,
}: {
  query: ListingQuery;
  filters: BrowseFilters;
}) {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.listings);

  const listings = await browseListings({ mode: filters.mode, query });

  // Filter-aware structured data, server-rendered for SEO.
  const hasFilters = Boolean(
    filters.q ||
      filters.category ||
      filters.sub ||
      filters.brands.length ||
      filters.models.length ||
      filters.location ||
      filters.mode === "rent",
  );
  const crumbs: { name: string; path: string }[] = [
    { name: "Home", path: "/" },
    { name: "Browse", path: "/browse" },
  ];
  if (filters.category) {
    crumbs.push({
      name: filters.category,
      path: `/browse?category=${encodeURIComponent(filters.category)}`,
    });
  }
  if (filters.sub) {
    const base = filters.category
      ? `category=${encodeURIComponent(filters.category)}&`
      : "";
    crumbs.push({
      name: filters.sub,
      path: `/browse?${base}sub=${encodeURIComponent(filters.sub)}`,
    });
  }
  const collectionName = hasFilters
    ? titleFromFilters(filters)
    : "Browse heavy equipment";

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema(crumbs),
          collectionPageSchema({
            name: collectionName,
            path: "/browse",
            listings,
            description: `${collectionName} on ShweLoader — Myanmar's heavy equipment marketplace, with MMK and USD pricing.`,
          }),
        ]}
      />
      <Results listings={listings} filters={filters} />
    </>
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
