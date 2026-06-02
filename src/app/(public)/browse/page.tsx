import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import "@/styles/pages/browse.css";

import { cacheLife, cacheTag } from "next/cache";
import { browseListings } from "@/lib/api/listings";
import { CACHE_TAGS } from "@/lib/api/cache-tags";
import {
  getAttachmentCategories,
  getBrands,
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
import { BuyRentToggle } from "@/components/browse/browse-toolbar";
import { Results } from "@/components/browse/results";
import {
  parseFilters,
  toListingQuery,
  type RawSearchParams,
} from "@/components/browse/filters";

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

export default function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  // Browse reads searchParams (dynamic). Under Cache Components the dynamic
  // render must sit inside Suspense so the static shell can prerender.
  return (
    <Suspense fallback={<BrowseSkeleton />}>
      <BrowseContent searchParams={searchParams} />
    </Suspense>
  );
}

// Thin dynamic boundary: read the (dynamic) searchParams, then hand the parsed,
// serializable filters to the cached view below. Keeping searchParams out of the
// cached function is what lets the heavy render be cached.
async function BrowseContent({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseFilters(await searchParams);
  return <BrowseView filters={filters} />;
}

// The expensive part — fetch + the full sidebar/grid render — cached PER filter
// combination. The common views (default /browse, the category landing pages =
// most traffic) are served from cache and skip the ~0.5s re-render entirely.
// Tagged with listings+categories so the /api/revalidate webhook busts it the
// moment the admin changes catalog content (no extra staleness vs the data).
async function BrowseView({
  filters,
}: {
  filters: ReturnType<typeof parseFilters>;
}) {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.listings, CACHE_TAGS.categories);

  const [categories, attachmentCategories, brands, locations] = await Promise.all([
    getEquipmentCategories(),
    getAttachmentCategories(),
    getBrands(),
    getLocations(),
  ]);

  const query = toListingQuery(filters, {
    categories,
    attachmentCategories,
    brands,
  });
  let listings = await browseListings({ mode: filters.mode, query });

  // Sort within the page (the list API has no price sort param).
  if (filters.sort === "price-asc" || filters.sort === "price-desc") {
    const priceOf = (l: (typeof listings)[number]) => {
      const p = filters.mode === "rent" ? l.rent : l.sale;
      return p?.mmk ?? p?.usd ?? Number.POSITIVE_INFINITY;
    };
    listings = [...listings].sort((a, b) =>
      filters.sort === "price-asc"
        ? priceOf(a) - priceOf(b)
        : priceOf(b) - priceOf(a),
    );
  }

  const pageTitle = "Browse listings";

  // Filter-aware structured data: a breadcrumb trail that reflects the active
  // category/sub-category, and a CollectionPage describing the current view.
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
    <div className="brz" data-screen-label="Browse">
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

      <div className="container brz-pagehead">
        <div className="brz-pagehead-l">
          <nav className="brz-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="brz-crumbs-sep">/</span>
            <span>Browse</span>
          </nav>
          <h1 className="brz-h1">{pageTitle}</h1>
        </div>
        <div className="brz-pagehead-r">
          <BuyRentToggle filters={filters} />
        </div>
      </div>

      <BrowseShell
        filters={filters}
        categories={categories}
        attachmentCategories={attachmentCategories}
        brands={brands}
        locations={locations}
        total={listings.length}
      >
        <Results listings={listings} filters={filters} />
      </BrowseShell>
    </div>
  );
}
