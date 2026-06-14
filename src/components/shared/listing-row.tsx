"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";

import { SaveButton } from "@/components/shared/save-button";
import { useI18n } from "@/components/providers/language-provider";
import { assetUrl, focalPosition } from "@/lib/assets";
import { preloadHeroImage } from "@/lib/hero-image";
import { formatMoney, listingDisplayTitle, rentalUnitLabel } from "@/lib/format";
import { listingSlug } from "@/lib/slug";
import { cn } from "@/lib/utils";
import type { Listing } from "@/lib/api/types";

interface ListingRowProps {
  listing: Listing;
  mode?: "sale" | "rent";
}

export function ListingRow({ listing, mode = "sale" }: ListingRowProps) {
  const { t } = useI18n();

  const isRent = mode === "rent";
  const isSold = isRent ? listing.isRented : listing.isSoldOut;

  const href = `/product/${listingSlug(listing)}`;
  // Warm the product hero on navigation intent so the detail page paints it
  // instantly instead of flashing blank.
  const warmHero = () =>
    preloadHeroImage(
      assetUrl(listing.thumbnail.url ?? listing.thumbnail.thumbUrl),
    );

  // Row title is "<brand> <model>" (shared with the grid card + product page).
  const rowTitle = listingDisplayTitle(listing);
  // Eyebrow shows the subcategory (fall back to the main category).
  const eyebrow = listing.subCategory ?? listing.category ?? null;

  const locationName =
    listing.location.township ??
    listing.location.district ??
    listing.location.state ??
    null;

  const price = isRent ? listing.rent : listing.sale;
  const priceHidden = price?.hide ?? false;
  const formattedPrice = priceHidden
    ? ""
    : formatMoney(price?.mmk, price?.usd, price?.currency);
  // Hidden price, or no price data at all, falls back to the localized
  // "price on enquiry" label.
  const isOnRequest = !formattedPrice;
  const priceLabel = isOnRequest ? t("product.priceOnRequest") : formattedPrice;
  const perUnit =
    isRent && !isOnRequest ? rentalUnitLabel(listing.rent?.unit) : "";

  const img = listing.thumbnail;
  const photo = assetUrl(img.thumbUrl ?? img.url);

  return (
    <article
      className={cn("lrow", isSold && "is-sold")}
      onMouseEnter={warmHero}
      onPointerDown={warmHero}
    >
      <SaveButton id={listing.id} className="lrow-fav" />

      <div className="lrow-img">
        {photo ? (
          <Image
            src={photo}
            alt={rowTitle}
            fill
            sizes="(max-width: 768px) 220px, 280px"
            style={{ objectFit: "cover", objectPosition: focalPosition(img.focalX, img.focalY) }}
          />
        ) : null}
        {isSold ? (
          <span
            className="feat-ribbon"
            style={{
              top: 10,
              left: 10,
              background: "rgba(220,38,38,0.95)",
              color: "#fff",
              letterSpacing: "0.04em",
            }}
          >
            {isRent ? "RENTED" : "SOLD OUT"}
          </span>
        ) : null}
      </div>

      <Link href={href} className="lrow-body" aria-label={rowTitle}>
        <div className="lrow-head">
          {eyebrow ? <div className="lrow-cat">{eyebrow}</div> : null}
          <h3 className="lrow-title">{rowTitle}</h3>
        </div>

        <div className="lrow-foot">
          {locationName ? (
            <div className="lrow-loc">
              <MapPin className="icon-sm" strokeWidth={1.75} />
              <span>{locationName}</span>
            </div>
          ) : (
            <span />
          )}
          <div className="lrow-side">
            <div className={"lrow-price" + (isOnRequest ? " is-request" : "")}>
              {priceLabel}
              {isRent && perUnit ? <span className="lrow-per"> / {perUnit}</span> : null}
            </div>
            <span className="lrow-cta">
              {t("actions.viewDetails")}
              <ArrowRight className="icon-sm" strokeWidth={1.75} />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
