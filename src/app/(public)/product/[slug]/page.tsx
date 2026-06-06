import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ProductActions } from "@/components/product/product-actions";

import { Gallery } from "@/components/product/gallery";
import {
  OverviewCard,
  listingMode,
  priceFields,
  splitPrice,
} from "@/components/product/overview-card";
import { Description } from "@/components/product/description";
import { Similar } from "@/components/product/similar";
import { MobileBar } from "@/components/product/mobile-bar";

import {
  getListing,
  getRelatedListings,
  getAllListingsForSitemap,
} from "@/lib/api/listings";
import { assetUrl } from "@/lib/assets";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  JsonLd,
  productSchema,
  breadcrumbSchema,
} from "@/lib/seo/jsonld";
import { formatListingPrice, PRICE_ON_REQUEST } from "@/lib/format";
import { parseIdFromSlug, listingSlug } from "@/lib/slug";
import { toPlainText, truncate } from "@/lib/utils";
import { renderMarkdown } from "@/lib/markdown";
import type { Listing } from "@/lib/api/types";

import "@/styles/pages/product.css";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Canonical slug. Mirror the rest of the codebase exactly — ListingCard hrefs,
 * `productSchema()`/`itemListSchema()` URLs all call `listingSlug(listing)` on
 * the normalized shape — so the canonical here matches every inbound link and
 * the JSON-LD `url`/`item` values (no slug drift, no redirect loop).
 */
function canonicalSlugFor(listing: Listing): string {
  return listingSlug(listing);
}

async function load(slug: string): Promise<Listing> {
  const id = parseIdFromSlug(slug);
  if (!id) notFound();
  const listing = await getListing(id);
  if (!listing) notFound();
  return listing;
}

/** Pre-render every known listing at build (canonical slugs); the rest are ISR. */
export async function generateStaticParams() {
  try {
    const listings = await getAllListingsForSitemap();
    const params = listings.map((l) => ({ slug: listingSlug(l) }));
    // Cache Components requires ≥1 param (empty array → build error). When there
    // are no listings (e.g. a fresh/empty prod DB), fall back to a placeholder
    // slug that `load()` resolves to notFound() — keeps the build from crashing.
    return params.length ? params : [{ slug: "_" }];
  } catch {
    return [{ slug: "_" }];
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const id = parseIdFromSlug(slug);
  if (!id) return {};
  const listing = await getListing(id);
  if (!listing) return {};

  const canonicalSlug = canonicalSlugFor(listing);
  const description = listing.description
    ? truncate(toPlainText(listing.description), 200)
    : `${listing.title} for ${listing.isRent ? "rent" : "sale"} on ShweLoader.`;

  const images = [listing.thumbnail, ...listing.images]
    .map((img) => assetUrl(img.url ?? img.thumbUrl))
    .filter((u): u is string => !!u)
    .slice(0, 4)
    .map((url) => ({ url, width: 1200, height: 800, alt: listing.title }));

  return buildMetadata({
    title: listing.title,
    description,
    path: `/product/${canonicalSlug}`,
    images: images.length ? images : undefined,
  });
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const listing = await load(slug);

  const canonicalSlug = canonicalSlugFor(listing);
  if (slug !== canonicalSlug) {
    redirect(`/product/${canonicalSlug}`);
  }

  const related = await getRelatedListings(listing);

  const mode = listingMode(listing);
  const fields = priceFields(listing);
  const primaryRaw = formatListingPrice(fields, mode === "rent" ? "rent" : "sale");
  const primary = splitPrice(primaryRaw);
  const priceOnRequest = primaryRaw === PRICE_ON_REQUEST;

  const seller =
    listing.seller && !listing.seller.hidden ? listing.seller : null;
  const pdfUrl = assetUrl(listing.pdfUrl);
  const descriptionHtml = await renderMarkdown(listing.description);
  const isNew = (listing.condition ?? "").toLowerCase() === "new";

  const eyebrow =
    [listing.category, listing.subCategory].filter(Boolean).join(" · ") ||
    listing.brand ||
    null;

  const crumbs = [
    { name: "Home", path: "/" },
    {
      name: listing.isRent ? "Rent" : "Buy",
      path: `/browse?mode=${listing.isRent ? "rent" : "sale"}`,
    },
    ...(listing.category
      ? [{ name: listing.category, path: "/browse" }]
      : []),
    { name: listing.title, path: `/product/${canonicalSlug}` },
  ];

  return (
    <>
      <JsonLd
        data={[productSchema(listing), breadcrumbSchema(crumbs)]}
      />

      <div className="container">
        <ProductActions
          variant="row"
          listingId={listing.id}
          title={listing.title}
        />

        <div className="pdp-layout">
          {/* On mobile the grid reorders so the title sits below the (full-bleed)
              gallery; on desktop it spans the top as before. */}
          <div className="pdp-title">
            {eyebrow && <div className="t-eyebrow">{eyebrow}</div>}
            <h1 className="t-h">{listing.title}</h1>
          </div>

          <div className="pdp-gallery-wrap">
            {/* Mobile-only floating Back / Share / Save over the image. */}
            <ProductActions
              variant="overlay"
              listingId={listing.id}
              title={listing.title}
            />
            <Gallery
              images={[listing.thumbnail, ...listing.images]}
              title={listing.title}
              isNew={isNew}
              isSold={listing.isSoldOut}
              isRented={listing.isRented}
            />
          </div>

          <div className="pdp-col-r">
            <OverviewCard listing={listing} />
          </div>

          <div className="pdp-col-l">
            <div className="pdp-body-l">
              <Description html={descriptionHtml} pdfUrl={pdfUrl} />
            </div>
          </div>
        </div>
      </div>

      <Similar listings={related} mode={mode === "rent" ? "rent" : "sale"} />

      <MobileBar
        title={listing.title}
        listingId={listing.id}
        priceUnits={primary.units}
        priceNum={primary.num}
        priceSuffix={primary.suffix}
        priceOnRequest={priceOnRequest}
        kind={mode}
        phone={seller?.phone ?? null}
      />
    </>
  );
}
