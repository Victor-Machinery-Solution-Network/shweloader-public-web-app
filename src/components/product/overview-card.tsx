import { Package, User } from "lucide-react";

import { EnquiryForm } from "@/components/product/enquiry-form";
import {
  formatListingPrice,
  type ListingPriceFields,
} from "@/lib/format";
import type { Listing } from "@/lib/api/types";

export type ProductMode = "sale" | "rent" | "both";

/** Resolve the listing's primary display mode. */
export function listingMode(listing: Listing): ProductMode {
  return listing.isSale && listing.isRent
    ? "both"
    : listing.isRent
      ? "rent"
      : "sale";
}

/** Map a normalized listing back to the raw price-field shape. */
export function priceFields(listing: Listing): ListingPriceFields {
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

/** Split a formatted price ("MMK 85,000,000 / day") into units / number / suffix. */
export function splitPrice(formatted: string): {
  units: string;
  num: string;
  suffix: string;
} {
  // "Price on request" has no numeric part — show it whole in the number slot.
  if (!/\d/.test(formatted)) {
    return { units: "", num: formatted, suffix: "" };
  }
  const [head, suffix = ""] = formatted.split(" / ");
  const m = head.match(/^([^\d]*)(.*)$/);
  return {
    units: (m?.[1] ?? "").trim(),
    num: (m?.[2] ?? head).trim(),
    suffix: suffix ? `/ ${suffix}` : "",
  };
}

export const KIND_LABEL: Record<ProductMode, string> = {
  sale: "For sale",
  rent: "For rent",
  both: "For sale or rent",
};

/** Pull the first matching custom field value by case-insensitive label/key. */
function findField(listing: Listing, ...names: string[]): string | null {
  const wanted = names.map((n) => n.toLowerCase());
  for (const f of listing.customFields) {
    const label = (f.label || f.key || "").toLowerCase();
    if (wanted.some((w) => label === w || label.includes(w))) {
      const v = (f.value ?? "").trim();
      if (v) return v;
    }
  }
  return null;
}

/**
 * Sticky overview card: kind tag, price, product-overview spec list, seller
 * information (only when visible), and the enquiry form.
 */
export function OverviewCard({ listing }: { listing: Listing }) {
  const mode = listingMode(listing);

  const fields = priceFields(listing);
  const primary = splitPrice(
    formatListingPrice(fields, mode === "rent" ? "rent" : "sale"),
  );
  const rentSecondary =
    mode === "both" ? splitPrice(formatListingPrice(fields, "rent")) : null;

  const year = findField(listing, "year");
  const hours = findField(listing, "hours", "hour", "operating hours");
  const weight = findField(listing, "operating weight", "op. weight", "weight");
  const engine = findField(listing, "engine power", "engine", "power");
  const condition = listing.condition;
  const locationLabel =
    listing.location.township ||
    listing.location.state ||
    listing.location.district ||
    null;

  const rows: [string, string][] = [];
  if (year) rows.push(["Year", year]);
  if (hours) rows.push(["Hours", hours]);
  if (weight) rows.push(["Op. weight", weight]);
  if (engine) rows.push(["Engine", engine]);
  if (condition) rows.push(["Condition", condition]);
  if (locationLabel) rows.push(["Location", locationLabel]);

  const seller =
    listing.seller && !listing.seller.hidden ? listing.seller : null;

  return (
    <aside className="pdp-overview">
      <div className="cc-kind-top">
        <span className={`t-kind-tag t-kind-tag--${mode}`}>
          {KIND_LABEL[mode]}
        </span>
      </div>
      <div className="cc-price">
        {primary.units && <span className="cc-units">{primary.units}</span>}
        <span className="cc-num tnum">{primary.num}</span>
        {primary.suffix && <span className="cc-suf">{primary.suffix}</span>}
      </div>
      {rentSecondary && (
        <div className="cc-rentline">
          <span className="cc-rent-lbl">For rent</span>
          <span className="cc-rent-val tnum">
            {[rentSecondary.units, rentSecondary.num]
              .filter(Boolean)
              .join(" ")}
          </span>
          {rentSecondary.suffix && (
            <span className="cc-rent-suf">{rentSecondary.suffix}</span>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <dl className="ov-list">
          <div className="ov-list-eyebrow">
            <Package className="ov-eyebrow-i" aria-hidden="true" />
            Product overview
          </div>
          {rows.map(([k, v]) => (
            <div key={k} className="ov-row">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {seller && (
        <div className="ov-seller">
          <div className="ov-seller-eyebrow">
            <User className="ov-eyebrow-i" aria-hidden="true" />
            Seller information
          </div>
          <dl className="ov-seller-rows">
            {seller.name && (
              <div className="ov-row">
                <dt>Name</dt>
                <dd>{seller.name}</dd>
              </div>
            )}
            {seller.company && (
              <div className="ov-row">
                <dt>Company</dt>
                <dd>{seller.company}</dd>
              </div>
            )}
            {seller.phone && (
              <div className="ov-row">
                <dt>Phone</dt>
                <dd>
                  <a
                    className="ov-seller-phone"
                    href={`tel:${seller.phone.replace(/\s+/g, "")}`}
                  >
                    {seller.phone}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <div className="ov-cta" id="enquiry">
        <EnquiryForm
          title={listing.title}
          listingId={listing.id}
          phone={seller?.phone ?? null}
        />
      </div>
    </aside>
  );
}
