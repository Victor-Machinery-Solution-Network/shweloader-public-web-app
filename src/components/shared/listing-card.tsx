"use client";

import Image from "next/image";
import Link from "next/link";

import { SaveButton } from "@/components/shared/save-button";
import { StatusPill } from "@/components/shared/status-pill";
import { assetUrl, focalPosition } from "@/lib/assets";
import { formatListingPrice, type ListingPriceFields } from "@/lib/format";
import { listingSlug } from "@/lib/slug";
import type { Listing } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Mode = "sale" | "rent";

/**
 * Map a normalized `Listing` back to the raw price-field shape that
 * `formatListingPrice` consumes, so cards display "MMK 85,000,000" /
 * "MMK 350,000 / day" with the same rules as the rest of the site.
 */
function priceFields(listing: Listing): ListingPriceFields {
  return {
    sale_mmk_price: listing.sale?.mmk ?? null,
    sale_usd_price: listing.sale?.usd ?? null,
    sale_hide_price: listing.sale?.hide ? 1 : 0,
    sale_display_currency: listing.sale?.currency ?? null,
    rent_mmk_price: listing.rent?.mmk ?? null,
    rent_usd_price: listing.rent?.usd ?? null,
    rent_hide_price: listing.rent?.hide ? 1 : 0,
    rent_display_currency: listing.rent?.currency ?? null,
    rent_rental_unit: listing.rent?.unit ?? null,
  };
}

/** Small location line — township first, then state/region. */
function locationLabel(listing: Listing): string | null {
  const { township, state } = listing.location;
  return township || state || null;
}

export function ListingCard({
  listing,
  mode = "sale",
}: {
  listing: Listing;
  mode?: Mode;
}) {
  const isRent = mode === "rent";
  const isNew = (listing.condition ?? "").toLowerCase() === "new";
  const isSold = listing.isSoldOut;

  const href = `/product/${listingSlug(listing)}`;
  const photo = assetUrl(listing.thumbnail.thumbUrl ?? listing.thumbnail.url);
  const price = formatListingPrice(priceFields(listing), mode);
  const location = locationLabel(listing);
  const eyebrow = listing.category ?? listing.brand ?? null;

  return (
    <Link
      href={href}
      className={cn(
        "feat-card",
        isRent ? "kind-rent" : "kind-sale",
        isSold && "is-sold",
      )}
    >
      <div className="img">
        {photo ? (
          <Image
            src={photo}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            style={{ objectFit: "contain", objectPosition: focalPosition(listing.thumbnail.focalX, listing.thumbnail.focalY) }}
          />
        ) : null}

        {(isNew || isSold) && (
          <div className="lcard-badges">
            {/* Design uses NEW / SOLD pills only; rent is conveyed by the
                kind-rent treatment + "/ day" price suffix. */}
            {isNew && <StatusPill variant="new" />}
            {isSold && <StatusPill variant="sold" />}
          </div>
        )}

        {isSold && (
          <Image
            className="feat-stamp-sold"
            src="/brand/sold-out-stamp.png"
            alt="Sold out"
            width={240}
            height={240}
          />
        )}

        <SaveButton id={listing.id} className="lcard-fav" />
      </div>

      <div className="body">
        {eyebrow && <div className="feat-cat">{eyebrow}</div>}
        <div className="ti">{listing.title}</div>
        <div className="feat-sale tnum">
          <span className="big">{price}</span>
          {location && <span className="sub">{location}</span>}
        </div>
      </div>
    </Link>
  );
}
