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
import { getSiteSettings } from "@/lib/api/settings";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  JsonLd,
  breadcrumbSchema,
  collectionPageSchema,
} from "@/lib/seo/jsonld";
import { categorySlug, findLandingNode } from "@/lib/category-landing";
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
  const raw = await searchParams;
  const filters = parseFilters(raw);
  const hasParams = Object.keys(raw).length > 0;
  const hasFilters =
    filters.q ||
    filters.category ||
    filters.sub ||
    filters.brands.length ||
    filters.models.length ||
    filters.location ||
    filters.mode === "rent";

  // Resolve category/sub against the live taxonomy first: it normalizes raw
  // param values for the title ("lifting-equipment" → "Lifting Equipment") and
  // drives the canonical below.
  let node = null;
  if (filters.sub || filters.category) {
    const [cats, attach] = await Promise.all([
      getEquipmentCategories().catch(() => []),
      getAttachmentCategories().catch(() => []),
    ]);
    node = findLandingNode(
      categorySlug(filters.sub || filters.category),
      cats,
      attach,
    );
    if (node) {
      if (filters.sub) filters.sub = node.name;
      else filters.category = node.name;
    }
  }

  const title = hasFilters ? titleFromFilters(filters) : "Browse heavy equipment";
  const description = hasFilters
    ? `${title} on ShweLoader — Myanmar's heavy equipment marketplace. Compare listings with MMK and USD pricing.`
    : "Browse excavators, wheel loaders, cranes, bulldozers, and attachments for sale and rent across Myanmar on ShweLoader.";

  // Deliberate index strategy: SEO lives on the clean landing pages
  // (/bulldozers, /bulldozers/for-rent). Bare /browse is indexable (its static
  // content matches its generic title); EVERY parameterized view is noindex —
  // its SSR HTML is the unfiltered default (the filter applies client-side),
  // so letting it index would pair a filtered title with unfiltered content.
  // The canonical consolidates to the matching landing page when the filtered
  // name validates against the live taxonomy (never to a 404), else /browse.
  let canonicalPath = "/browse";
  if (node) {
    canonicalPath = `/${node.slug}/for-${filters.mode === "rent" ? "rent" : "sale"}`;
  }

  return buildMetadata({
    title,
    description,
    path: canonicalPath,
    noindex: hasParams,
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
  const [categories, attachmentCategories, brands, locations, conditionTypes, { contactPhone }] =
    await Promise.all([
      getEquipmentCategories(),
      getAttachmentCategories(),
      getBrands(),
      getLocations(),
      getConditionTypes(),
      getSiteSettings(),
    ]);
  const catalogs = {
    categories,
    attachmentCategories,
    brands,
    conditionTypes,
    locations,
  };
  const { listings: initialListings, total: initialTotal } = await browseListings({
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
            phone: contactPhone,
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
          initialTotal={initialTotal}
          initialFilters={DEFAULT_FILTERS}
          catalogs={catalogs}
        />
      </BrowseShell>
    </>
  );
}
