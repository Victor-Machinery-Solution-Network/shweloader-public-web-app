import { Package, User } from "lucide-react";

import { EnquiryForm } from "@/components/product/enquiry-form";
import { T } from "@/components/t";
import {
  formatInt,
  rentalUnitLabel,
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
  // "price on enquiry" has no numeric part — show it whole in the number slot.
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

/** Resolve the displayed amount + currency code for one mode, honoring the
 *  listing's preferred display currency. Returns null when the price is hidden
 *  or absent (→ shown as "price on enquiry"). */
function priceParts(
  mmk: number | null | undefined,
  usd: number | null | undefined,
  displayCurrency: string | null | undefined,
  hide: boolean,
): { num: string; ccy: string } | null {
  if (hide) return null;
  if (displayCurrency === "USD" && usd != null)
    return { num: formatInt(usd), ccy: "USD" };
  if (mmk != null) return { num: formatInt(mmk), ccy: "MMK" };
  if (usd != null) return { num: formatInt(usd), ccy: "USD" };
  return null;
}

/** Price line(s) in the left main column. Inline format — "12,000 USD for sale"
 *  — with the sale line followed by the rent line for sale+rent listings
 *  (no kind pills, no stacked blocks). */
export function ProductPrice({ listing }: { listing: Listing }) {
  const mode = listingMode(listing);
  const rows: {
    kind: "sale" | "rent" | "both";
    parts: { num: string; ccy: string } | null;
    unit: string;
  }[] = [];
  if (mode === "sale" || mode === "both") {
    rows.push({
      kind: "sale",
      parts: priceParts(
        listing.sale?.mmk,
        listing.sale?.usd,
        listing.sale?.currency,
        !!listing.sale?.hide,
      ),
      unit: "",
    });
  }
  if (mode === "rent" || mode === "both") {
    rows.push({
      kind: "rent",
      parts: priceParts(
        listing.rent?.mmk,
        listing.rent?.usd,
        listing.rent?.currency,
        !!listing.rent?.hide,
      ),
      unit: rentalUnitLabel(listing.rent?.unit),
    });
  }

  // Sale + rent where both prices are on enquiry → collapse the two identical
  // segments into one "For sale & rent · Price on enquiry".
  const display =
    mode === "both" && rows.length === 2 && !rows[0].parts && !rows[1].parts
      ? [{ kind: "both" as const, parts: null, unit: "" }]
      : rows;

  return (
    <div className={"pdp-price" + (display.length > 1 ? " pdp-price--multi" : "")}>
      {display.map((r) => (
        <div className={`pseg pseg--${r.kind}`} key={r.kind}>
          <span className={`pseg-label pseg-label--${r.kind}`}>
            <T
              path={
                r.kind === "sale"
                  ? "product.forSale"
                  : r.kind === "rent"
                    ? "product.forRent"
                    : "product.forSaleAndRent"
              }
            />
          </span>
          {r.parts ? (
            <span className="pseg-amount">
              <span className="pseg-num tnum">{r.parts.num}</span>
              <span className="pseg-ccy">{r.parts.ccy}</span>
              {r.unit && <span className="pseg-unit">/ {r.unit}</span>}
            </span>
          ) : (
            <span className="pseg-amount">
              <span className="pseg-num pseg-num--req">
                <T path="product.priceOnRequest" />
              </span>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Build the Product-overview rows (Condition + Location highlights + admin
 *  customFields), deduped by label. Static rows carry an i18n key so their
 *  LABEL localizes; values + customFields stay as authored (dynamic content). */
function overviewRows(listing: Listing) {
  const rows: { label: string; value: string; i18nKey?: string }[] = [];
  const seen = new Set<string>();
  const addRow = (k: string, v: string, i18nKey?: string) => {
    const key = k.trim();
    const val = v.trim();
    if (!key || !val || seen.has(key.toLowerCase())) return;
    seen.add(key.toLowerCase());
    rows.push({ label: key, value: val, i18nKey });
  };
  if (listing.condition) addRow("Condition", listing.condition, "product.condition");
  const locationLabel =
    listing.location.township ||
    listing.location.state ||
    listing.location.district ||
    null;
  if (locationLabel) addRow("Location", locationLabel, "product.location");
  for (const f of listing.customFields) {
    addRow(f.label || f.key || "", f.value ?? "");
  }
  return rows;
}

/** Product overview key/value list — sits in the left main column. */
export function ProductOverviewList({ listing }: { listing: Listing }) {
  const rows = overviewRows(listing);
  if (rows.length === 0) return null;
  return (
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
  );
}

/** Sticky right-column contact card: seller information (when visible) + the
 *  enquiry form. */
export function ContactCard({ listing }: { listing: Listing }) {
  const seller =
    listing.seller && !listing.seller.hidden ? listing.seller : null;

  return (
    <div className="pdp-contact">
      <ProductPrice listing={listing} />
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
    </div>
  );
}
