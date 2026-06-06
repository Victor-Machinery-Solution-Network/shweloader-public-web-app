"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";

import { SaveButton } from "@/components/shared/save-button";
import { useI18n } from "@/components/providers/language-provider";
import { assetUrl, focalPosition } from "@/lib/assets";
import { formatMoney, rentalUnitLabel, PRICE_ON_REQUEST } from "@/lib/format";
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

  // Title format is "<brand> <model>"; derive the model by stripping the brand.
  const model =
    listing.brand && listing.title.toLowerCase().startsWith(listing.brand.toLowerCase())
      ? listing.title.slice(listing.brand.length).trim()
      : "";

  const locationName =
    listing.location.township ??
    listing.location.district ??
    listing.location.state ??
    null;

  const price = isRent ? listing.rent : listing.sale;
  const priceHidden = price?.hide ?? false;
  const priceLabel = priceHidden
    ? PRICE_ON_REQUEST
    : formatMoney(price?.mmk, price?.usd, price?.currency) || PRICE_ON_REQUEST;
  const perUnit =
    isRent && !priceHidden && priceLabel !== PRICE_ON_REQUEST
      ? rentalUnitLabel(listing.rent?.unit)
      : "";

  const img = listing.thumbnail;
  const photo = assetUrl(img.thumbUrl ?? img.url);

  return (
    <article className={cn("lrow", isSold && "is-sold")}>
      <SaveButton id={listing.id} className="lrow-fav" />

      <div className="lrow-img">
        {photo ? (
          <Image
            src={photo}
            alt={listing.title}
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

      <Link href={href} className="lrow-body" aria-label={listing.title}>
        <div className="lrow-head">
          {listing.category ? <div className="lrow-cat">{listing.category}</div> : null}
          <h3 className="lrow-title">{listing.title}</h3>
          <div className="lrow-meta">
            {listing.brand ? <span>{listing.brand}</span> : null}
            {listing.brand && model ? <span className="dot">·</span> : null}
            {model ? <span className="lrow-model">{model}</span> : null}
          </div>
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
            <div className="lrow-price">
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
