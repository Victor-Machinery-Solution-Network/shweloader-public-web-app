import type { Metadata } from "next";

import "@/styles/pages/browse.css";

import { browseListings } from "@/lib/api/listings";
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
import { ListingsView } from "@/components/browse/listings-view";
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

// The unfiltered first page — reads NO searchParams, so the page stays a fully
// static (`○`) prerender: the default listings bake into the HTML at build and
// serve from the CDN with no per-request Vercel function (no cold-start
// skeleton). Filtered/sorted/paginated views are fetched client-side from the
// worker by `ListingsView` (see that file); per-filter SEO metadata is still
// server-rendered by `generateMetadata` above.
const DEFAULT_FILTERS = parseFilters({});

export default async function BrowsePage() {
  // STATIC: the sidebar taxonomy (cached) + the default first page of listings,
  // both fetched at build/revalidate (no searchParams). `browseListings` →
  // `getSaleListings` is `"use cache"` (cacheTag: listings), so this bakes into
  // the prerender and refreshes via the /api/revalidate webhook on catalog edits.
  const [categories, attachmentCategories, brands, locations, conditionTypes] =
    await Promise.all([
      getEquipmentCategories(),
      getAttachmentCategories(),
      getBrands(),
      getLocations(),
      getConditionTypes(),
    ]);
  const catalogs = {
    categories,
    attachmentCategories,
    brands,
    conditionTypes,
    locations,
  };
  const initialListings = await browseListings({
    mode: DEFAULT_FILTERS.mode,
    query: toListingQuery(DEFAULT_FILTERS, catalogs),
  });

  return (
    <>
      {/* Default-view structured data, baked into the static prerender. Filtered
          views rely on server-rendered <title>/canonical from generateMetadata. */}
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Browse", path: "/browse" },
          ]),
          collectionPageSchema({
            name: "Browse heavy equipment",
            path: "/browse",
            listings: initialListings,
            description:
              "Browse excavators, wheel loaders, cranes, bulldozers, and attachments for sale and rent across Myanmar on ShweLoader, with MMK and USD pricing.",
          }),
        ]}
      />
      {/* No Suspense/skeleton: the chrome derives filter state via
          useBrowseFilters (default on first render → syncs from URL after mount),
          NOT useSearchParams, so the whole shell + baked default listings stay in
          the static prerender and paint instantly on a direct load. */}
      <BrowseShell
        categories={categories}
        attachmentCategories={attachmentCategories}
        brands={brands}
        locations={locations}
        conditionTypes={conditionTypes}
      >
        <ListingsView
          initialListings={initialListings}
          initialFilters={DEFAULT_FILTERS}
          catalogs={catalogs}
        />
      </BrowseShell>
    </>
  );
}
