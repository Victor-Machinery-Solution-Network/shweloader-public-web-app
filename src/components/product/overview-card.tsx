import { Package, User } from "lucide-react";

import { EnquiryForm } from "@/components/product/enquiry-form";
import { T } from "@/components/t";
import {
  formatListingPrice,
  PRICE_ON_REQUEST,
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

/** i18n keys for the kind tag (localized at the render site via <T>). */
export const KIND_KEY: Record<ProductMode, string> = {
  sale: "product.forSale",
  rent: "product.forRent",
  both: "product.forBoth",
};

/**
 * Sticky overview card: kind tag, price, product-overview spec list, seller
 * information (only when visible), and the enquiry form.
 */
export function OverviewCard({ listing }: { listing: Listing }) {
  const mode = listingMode(listing);

  const fields = priceFields(listing);
  const primaryRaw = formatListingPrice(fields, mode === "rent" ? "rent" : "sale");
  const primary = splitPrice(primaryRaw);
  const primaryOnRequest = primaryRaw === PRICE_ON_REQUEST;
  const rentSecondaryRaw =
    mode === "both" ? formatListingPrice(fields, "rent") : null;
  const rentSecondary = rentSecondaryRaw ? splitPrice(rentSecondaryRaw) : null;
  const rentSecondaryOnRequest = rentSecondaryRaw === PRICE_ON_REQUEST;

  const condition = listing.condition;
  const locationLabel =
    listing.location.township ||
    listing.location.state ||
    listing.location.district ||
    null;

  // All admin specs (customFields) live under Product overview alongside the
  // listing-level Condition + Location highlights — they're all key-value pairs.
  // Deduped by label.
  // Static rows (Condition, Location) carry an i18n key so their LABEL localizes;
  // their values + the admin customFields stay as authored (dynamic content).
  const rows: { label: string; value: string; i18nKey?: string }[] = [];
  const seen = new Set<string>();
  const addRow = (k: string, v: string, i18nKey?: string) => {
    const key = k.trim();
    const val = v.trim();
    if (!key || !val || seen.has(key.toLowerCase())) return;
    seen.add(key.toLowerCase());
    rows.push({ label: key, value: val, i18nKey });
  };
  if (condition) addRow("Condition", condition, "product.condition");
  if (locationLabel) addRow("Location", locationLabel, "product.location");
  for (const f of listing.customFields) {
    addRow(f.label || f.key || "", f.value ?? "");
  }

  const seller =
    listing.seller && !listing.seller.hidden ? listing.seller : null;

  // One price "section": a kind pill (green for sale, gold for rent) above the
  // stacked price. A sale+rent listing shows two of these stacked; otherwise one.
  const priceBlock = (
    variant: "sale" | "rent",
    labelKey: string,
    p: ReturnType<typeof splitPrice>,
    onRequest: boolean,
  ) => (
    <div className="cc-price-block">
      <div className="cc-kind-top">
        <span className={`t-kind-tag t-kind-tag--${variant}`}>
          <T path={labelKey} />
        </span>
      </div>
      <div className="cc-price">
        {onRequest ? (
          <span className="cc-num cc-num--request">
            <T path="product.priceOnRequest" />
          </span>
        ) : (
          <>
            {p.units && <span className="cc-units">{p.units}</span>}
            <span className="cc-num tnum">{p.num}</span>
            {p.suffix && <span className="cc-suf">{p.suffix}</span>}
          </>
        )}
      </div>
    </div>
  );

  return (
    <aside className="pdp-overview">
      {mode === "both" && rentSecondary ? (
        <div className="cc-price-stack">
          {priceBlock("sale", "product.forSale", primary, primaryOnRequest)}
          {priceBlock(
            "rent",
            "product.forRent",
            rentSecondary,
            rentSecondaryOnRequest,
          )}
        </div>
      ) : (
        priceBlock(
          mode === "rent" ? "rent" : "sale",
          KIND_KEY[mode],
          primary,
          primaryOnRequest,
        )
      )}

      {rows.length > 0 && (
        <dl className="ov-list">
          <div className="ov-list-eyebrow">
            <Package className="ov-eyebrow-i" aria-hidden="true" />
            <T path="product.overviewTitle" />
          </div>
          {rows.map((r) => (
            <div key={r.label} className="ov-row">
              <dt>{r.i18nKey ? <T path={r.i18nKey} /> : r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {seller && (
        <div className="ov-seller">
          <div className="ov-seller-eyebrow">
            <User className="ov-eyebrow-i" aria-hidden="true" />
            <T path="product.sellerInfo" />
          </div>
          <dl className="ov-seller-rows">
            {seller.name && (
              <div className="ov-row">
                <dt><T path="product.sellerName" /></dt>
                <dd>{seller.name}</dd>
              </div>
            )}
            {seller.company && (
              <div className="ov-row">
                <dt><T path="product.sellerCompany" /></dt>
                <dd>{seller.company}</dd>
              </div>
            )}
            {seller.phone && (
              <div className="ov-row">
                <dt><T path="auth.phone" /></dt>
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
