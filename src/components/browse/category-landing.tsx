import Link from "next/link";

import { browseListings } from "@/lib/api/listings";
import {
  getAttachmentCategories,
  getBrands,
  getConditionTypes,
  getEquipmentCategories,
} from "@/lib/api/taxonomy";
import { getLocations } from "@/lib/api/locations";
import {
  JsonLd,
  breadcrumbSchema,
  collectionPageSchema,
} from "@/lib/seo/jsonld";
import { ListingCard } from "@/components/shared/listing-card";
import { parseFilters, toListingQuery } from "@/components/browse/filters";
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

export interface LandingData {
  node: LandingNode;
  nodes: LandingNode[];
  listings: Listing[];
  total: number;
  /** Filtered /browse URL for the same view (the interactive app page). */
  browseHref: string;
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

  const [brands, conditionTypes, locations] = await Promise.all([
    getBrands(),
    getConditionTypes(),
    getLocations(),
  ]);
  const raw: Record<string, string> = {};
  if (node.kind === "sub") {
    raw.category = node.parent ?? "";
    raw.sub = node.name;
  } else {
    raw.category = node.name;
  }
  if (mode === "rent") raw.mode = "rent";
  const filters = parseFilters(raw);
  const query = toListingQuery(filters, {
    categories,
    attachmentCategories,
    brands,
    conditionTypes,
    locations,
  });
  const { listings, total } = await browseListings({ mode, query });

  const params = new URLSearchParams(raw);
  return { node, nodes, listings, total, browseHref: `/browse?${params}` };
}

export function CategoryLanding({
  data,
  mode,
}: {
  data: LandingData;
  mode: LandingMode;
}) {
  const { node, nodes, listings, total, browseHref } = data;
  const title = landingTitle(node, mode);
  const path = mode === "rent" ? `/${node.slug}/for-rent` : `/${node.slug}`;
  const otherPath = mode === "rent" ? `/${node.slug}` : `/${node.slug}/for-rent`;

  // Interlinking tree: a category page lists its sub-category pages; a
  // sub-category page links back to its parent's page.
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
    ...(parent ? [{ name: parent.name, path: `/${parent.slug}` }] : []),
    { name: title, path },
  ];

  return (
    <div className="cland container">
      <JsonLd
        data={[
          breadcrumbSchema(crumbs),
          collectionPageSchema({
            name: title,
            path,
            listings,
            description: landingDescription(node, mode),
          }),
        ]}
      />

      <nav className="cland-crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        {parent && (
          <>
            <span aria-hidden="true"> / </span>
            <Link href={`/${parent.slug}`}>{parent.name}</Link>
          </>
        )}
        <span aria-hidden="true"> / </span>
        <span>{pluralName(node.name)}</span>
      </nav>

      <h1 className="t-h">{title}</h1>
      <p className="cland-intro">
        {total > 0
          ? `${total} ${(total === 1 ? node.name : pluralName(node.name)).toLowerCase()} for ${
              mode === "rent" ? "rent" : "sale"
            } across Myanmar — MMK and USD pricing from trusted dealers.`
          : `No ${pluralName(node.name).toLowerCase()} are listed for ${
              mode === "rent" ? "rent" : "sale"
            } right now — check back soon or browse the full catalog.`}
      </p>

      <div className="cland-links">
        <Link className="cland-pill" href={otherPath}>
          {pluralName(node.name)} for {mode === "rent" ? "sale" : "rent"}
        </Link>
        <Link className="cland-pill" href={browseHref}>
          Refine filters in Browse
        </Link>
      </div>

      {listings.length > 0 && (
        <div className="feat-grid feat-grid-4 cland-grid">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} mode={mode} />
          ))}
        </div>
      )}

      {children.length > 0 && (
        <div className="cland-children">
          <h2 className="cland-sub-h">Browse by type</h2>
          <div className="cland-links">
            {children.map((c) => (
              <Link
                key={c.slug}
                className="cland-pill"
                href={mode === "rent" ? `/${c.slug}/for-rent` : `/${c.slug}`}
              >
                {pluralName(c.name)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
