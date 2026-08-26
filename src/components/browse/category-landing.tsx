import Link from "next/link";

import { browseListings } from "@/lib/api/listings";
import {
  getAttachmentCategories,
  getBrands,
  getConditionTypes,
  getEquipmentCategories,
} from "@/lib/api/taxonomy";
import { getLocations } from "@/lib/api/locations";
import { getSiteSettings } from "@/lib/api/settings";
import {
  JsonLd,
  breadcrumbSchema,
  collectionPageSchema,
} from "@/lib/seo/jsonld";
import { parseFilters, toListingQuery, type BrowseFilters } from "./filters";
import { BrowseShell } from "./browse-shell";
import { ListingsView, type ListingsViewCatalogs } from "./listings-view";
import { BrowseBaseProvider } from "./use-browse-filters";
import {
  buildLandingNodes,
  isPluralName,
  type LandingNode,
} from "@/lib/category-landing";
import type { Listing } from "@/lib/api/types";

export type LandingMode = "sale" | "rent";

/** "Bulldozer" → "Bulldozers" for headings; plural/mass-noun names unchanged. */
export function pluralName(name: string): string {
  return isPluralName(name) ? name : `${name}s`;
}

export function landingTitle(node: LandingNode, mode: LandingMode): string {
  return `${pluralName(node.name)} for ${mode === "rent" ? "rent" : "sale"} in Myanmar`;
}

export function landingDescription(node: LandingNode, mode: LandingMode): string {
  const verb = mode === "rent" ? "rent" : "sale";
  return `${pluralName(node.name)} for ${verb} in Myanmar on ShweLoader. Compare ${node.name.toLowerCase()} listings with MMK and USD pricing from trusted dealers, with on-site viewings.`;
}

export function landingPath(node: LandingNode, mode: LandingMode): string {
  return `/${node.slug}/for-${mode === "rent" ? "rent" : "sale"}`;
}

export interface LandingData {
  node: LandingNode;
  nodes: LandingNode[];
  listings: Listing[];
  /** Matching count from the API; null when it reported none. */
  total: number | null;
  /** Raw filter params this page pre-applies (drives the client baseline). */
  raw: Record<string, string>;
  filters: BrowseFilters;
  catalogs: ListingsViewCatalogs;
  /** Admin-editable hotline (Settings → contact_phone) for schema sellers. */
  contactPhone: string;
}

/** Resolve a landing slug and fetch its correctly filtered listings (SSR). */
export async function loadLanding(
  slug: string,
  mode: LandingMode,
): Promise<LandingData | null> {
  const [categories, attachmentCategories] = await Promise.all([
    getEquipmentCategories(),
    getAttachmentCategories(),
  ]);
  const nodes = buildLandingNodes(categories, attachmentCategories);
  const node = nodes.find((n) => n.slug === slug);
  if (!node) return null;

  const [brands, conditionTypes, locations, { contactPhone }] = await Promise.all([
    getBrands(),
    getConditionTypes(),
    getLocations(),
    getSiteSettings(),
  ]);
  const catalogs: ListingsViewCatalogs = {
    categories,
    attachmentCategories,
    brands,
    conditionTypes,
    locations,
  };
  const raw: Record<string, string> = {};
  if (node.kind === "sub") {
    raw.category = node.parent ?? "";
    raw.sub = node.name;
  } else {
    raw.category = node.name;
  }
  if (mode === "rent") raw.mode = "rent";
  const filters = parseFilters(raw);
  const { listings, total } = await browseListings({
    mode,
    query: toListingQuery(filters, catalogs),
  });

  return { node, nodes, listings, total, raw, filters, catalogs, contactPhone };
}

/**
 * Category landing page = the FULL browse experience (sidebar, toolbar, grid)
 * at a clean URL, pre-filtered to this taxonomy node, with the correctly
 * filtered listings server-rendered into the static HTML. A compact SEO header
 * (H1 + intro + crawlable links to the sibling mode / parent / child pages)
 * sits above the shell; the interactive chrome takes over from there — any
 * filter interaction shallow-navigates into /browse?… exactly like on /browse.
 */
export function CategoryLanding({
  data,
  mode,
}: {
  data: LandingData;
  mode: LandingMode;
}) {
  const { node, nodes, listings, total, raw, filters, catalogs, contactPhone } = data;
  const title = landingTitle(node, mode);
  const path = landingPath(node, mode);
  const otherMode: LandingMode = mode === "rent" ? "sale" : "rent";

  const children =
    node.kind === "category"
      ? nodes.filter((n) => n.kind === "sub" && n.parent === node.name)
      : [];
  const parent =
    node.kind === "sub" && node.parent
      ? nodes.find((n) => n.kind === "category" && n.name === node.parent)
      : undefined;

  const crumbs = [
    { name: "Home", path: "/" },
    ...(parent ? [{ name: parent.name, path: landingPath(parent, mode) }] : []),
    { name: title, path },
  ];

  return (
    <BrowseBaseProvider path={path} raw={raw}>
      <JsonLd
        data={[
          breadcrumbSchema(crumbs),
          collectionPageSchema({
            name: title,
            path,
            listings,
            description: landingDescription(node, mode),
            phone: contactPhone,
          }),
        ]}
      />

      <div className="cland-head container">
        <h1 className="cland-h1">{title}</h1>
        <p className="cland-intro">
          {listings.length === 0
            ? `No ${pluralName(node.name).toLowerCase()} are listed for ${
                mode === "rent" ? "rent" : "sale"
              } right now — check back soon or browse the full catalog.`
            : total != null
              ? `${total} ${(total === 1 ? node.name : pluralName(node.name)).toLowerCase()} for ${
                  mode === "rent" ? "rent" : "sale"
                } across Myanmar — MMK and USD pricing from trusted dealers.`
              : `${pluralName(node.name)} for ${
                  mode === "rent" ? "rent" : "sale"
                } across Myanmar — MMK and USD pricing from trusted dealers.`}
        </p>
        <div className="cland-links">
          <Link className="cland-pill" href={landingPath(node, otherMode)}>
            {pluralName(node.name)} for {otherMode === "rent" ? "rent" : "sale"}
          </Link>
          {parent && (
            <Link className="cland-pill" href={landingPath(parent, mode)}>
              All {pluralName(parent.name)}
            </Link>
          )}
          {children.map((c) => (
            <Link key={c.slug} className="cland-pill" href={landingPath(c, mode)}>
              {pluralName(c.name)}
            </Link>
          ))}
        </div>
      </div>

      <BrowseShell
        categories={catalogs.categories}
        attachmentCategories={catalogs.attachmentCategories}
        brands={catalogs.brands}
        locations={catalogs.locations}
        conditionTypes={catalogs.conditionTypes}
      >
        <ListingsView
          initialListings={listings}
          initialTotal={total}
          initialFilters={filters}
          catalogs={catalogs}
        />
      </BrowseShell>
    </BrowseBaseProvider>
  );
}
