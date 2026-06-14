import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ProductActions } from "@/components/product/product-actions";
import { StatusPill } from "@/components/shared/status-pill";
import { T } from "@/components/t";

import { Gallery } from "@/components/product/gallery";
import {
  ProductOverviewList,
  ContactCard,
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
import { absoluteUrl } from "@/lib/env";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  JsonLd,
  productSchema,
  breadcrumbSchema,
} from "@/lib/seo/jsonld";
import { formatListingPrice, listingDisplayTitle, PRICE_ON_REQUEST } from "@/lib/format";
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

  return buildMetadata({
    title: listing.title,
    description,
    path: `/product/${canonicalSlug}`,
    // og:image + twitter:image come from the colocated opengraph-image route
    // (branded photo-hero card), not the raw photo.
    socialImagesFromRoute: true,
  });
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const listing = await load(slug);

  const canonicalSlug = canonicalSlugFor(listing);
  if (slug !== canonicalSlug) {
    redirect(`/product/${canonicalSlug}`);
  }

  // Canonical absolute URL for the Share action — matches og:url, no tracking
  // query/hash carried over from however the visitor arrived.
  const shareUrl = absoluteUrl(`/product/${canonicalSlug}`);

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

  // "<brand> <model>" — shared with the browse card; used for the H1 + breadcrumb.
  const displayTitle = listingDisplayTitle(listing);

  const crumbs = [
    { name: "Home", path: "/" },
    {
      name: listing.isRent ? "Rent" : "Buy",
      path: `/browse?mode=${listing.isRent ? "rent" : "sale"}`,
    },
    ...(listing.category
      ? [{ name: listing.category, path: "/browse" }]
      : []),
    { name: displayTitle, path: `/product/${canonicalSlug}` },
  ];

  return (
    <div className="pdp-page">
      <JsonLd
        data={[productSchema(listing), breadcrumbSchema(crumbs)]}
      />

      <div className="container">
        {/* Breadcrumb trail above the full-width gallery (mirrors the JSON-LD
            crumbs; static labels localize, dynamic category/title stay as authored). */}
        <nav className="pdp-crumbs" aria-label="Breadcrumb">
          <Link href="/">
            <T path="nav.home" />
          </Link>
          <span className="pdp-crumbs-sep" aria-hidden="true">/</span>
          <Link href={`/browse?mode=${listing.isRent ? "rent" : "sale"}`}>
            <T path={listing.isRent ? "search.rent" : "search.buy"} />
          </Link>
          {listing.category && (
            <>
              <span className="pdp-crumbs-sep" aria-hidden="true">/</span>
              <Link href="/browse">{listing.category}</Link>
            </>
          )}
          <span className="pdp-crumbs-sep" aria-hidden="true">/</span>
          <span className="cur">{displayTitle}</span>
        </nav>

        {/* Full-width gallery on top (PropertyGuru-style). */}
        <div className="pdp-gallery-wrap">
          {/* Mobile-only floating Back / Share / Save over the image. */}
          <ProductActions
            variant="overlay"
            listingId={listing.id}
            title={listing.title}
            shareUrl={shareUrl}
          />
          <Gallery
            images={[listing.thumbnail, ...listing.images]}
            title={listing.title}
            isNew={isNew}
            isSold={listing.isSoldOut}
            isRented={listing.isRented}
          />
        </div>

        {/* 2-column body: details (left) + sticky contact card (right). */}
        <div className="pdp-layout">
          <div className="pdp-main">
            <div className="pdp-title">
              <div className="pdp-title-main">
                {/* Mobile-only: NEW badge above the eyebrow (off the image, where it
                    collides with the overlaid Back button). Desktop keeps it on the image. */}
                {isNew && (
                  <div className="pdp-title-badge">
                    <StatusPill variant="new" />
                  </div>
                )}
                <h1 className="t-h">{displayTitle}</h1>
                {eyebrow && <div className="t-eyebrow">{eyebrow}</div>}
              </div>
              {/* Tablet-only Save/Share (desktop uses the side-column row; phones
                  use the floating gallery overlay). */}
              <div className="pdp-title-actions">
                <ProductActions
                  variant="row"
                  listingId={listing.id}
                  title={listing.title}
                  shareUrl={shareUrl}
                />
              </div>
            </div>

            <ProductOverviewList listing={listing} />
            <Description html={descriptionHtml} pdfUrl={pdfUrl} />
          </div>

          <aside className="pdp-side">
            {/* Actions row: Back · Share · Save */}
            <ProductActions
              variant="row"
              listingId={listing.id}
              title={listing.title}
              shareUrl={shareUrl}
            />
            <ContactCard listing={listing} />
          </aside>
        </div>
      </div>

      <Similar listings={related} mode={mode === "rent" ? "rent" : "sale"} />

      <MobileBar
        title={listing.title}
        priceUnits={primary.units}
        priceNum={primary.num}
        priceSuffix={primary.suffix}
        priceOnRequest={priceOnRequest}
        kind={mode}
        phone={seller?.phone ?? null}
        listing={listing}
      />
    </div>
  );
}
