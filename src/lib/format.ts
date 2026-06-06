/**
 * Formatting helpers — follow the design system's content rules exactly:
 *   money:  "MMK 85,000,000" (space after MMK, comma thousands) / "$120,000"
 *   rent:   "MMK 350,000 / day"
 *   hours:  "6,200 hrs"
 *   dates:  "2 February 2026"
 *   hidden price → "Price on enquiry"
 */

const GROUP = new Intl.NumberFormat("en-US");

export function formatInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return GROUP.format(Math.round(n));
}

export function formatMMK(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return `MMK ${GROUP.format(Math.round(n))}`;
}

export function formatUSD(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return `$${GROUP.format(Math.round(n))}`;
}

export function formatHours(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return `${GROUP.format(Math.round(n))} hrs`;
}

/** Normalize a rental unit ("day" | "/day" | "month" | "duty") → "day". */
export function rentalUnitLabel(unit?: string | null): string {
  if (!unit) return "";
  return unit.replace(/^\/+/, "").trim().toLowerCase();
}

type DisplayCurrency = "MMK" | "USD" | string | null | undefined;

/** Pick the displayed amount honoring the listing's preferred currency. */
export function formatMoney(
  mmk: number | null | undefined,
  usd: number | null | undefined,
  displayCurrency?: DisplayCurrency,
): string {
  const preferUsd = displayCurrency === "USD";
  if (preferUsd && usd != null) return formatUSD(usd);
  if (mmk != null) return formatMMK(mmk);
  if (usd != null) return formatUSD(usd);
  return "";
}

export interface ListingPriceFields {
  sale_mmk_price?: number | null;
  sale_usd_price?: number | null;
  sale_hide_price?: number | null;
  sale_display_currency?: string | null;
  rent_mmk_price?: number | null;
  rent_usd_price?: number | null;
  rent_hide_price?: number | null;
  rent_display_currency?: string | null;
  rent_rental_unit?: string | null;
}

export const PRICE_ON_REQUEST = "Price on enquiry";

/** Display price for a listing in a given mode (defaults to sale). */
export function formatListingPrice(
  l: ListingPriceFields,
  mode: "sale" | "rent" = "sale",
): string {
  if (mode === "rent") {
    if (l.rent_hide_price) return PRICE_ON_REQUEST;
    const base = formatMoney(
      l.rent_mmk_price,
      l.rent_usd_price,
      l.rent_display_currency,
    );
    if (!base) return PRICE_ON_REQUEST;
    const unit = rentalUnitLabel(l.rent_rental_unit);
    return unit ? `${base} / ${unit}` : base;
  }
  if (l.sale_hide_price) return PRICE_ON_REQUEST;
  const base = formatMoney(
    l.sale_mmk_price,
    l.sale_usd_price,
    l.sale_display_currency,
  );
  return base || PRICE_ON_REQUEST;
}

/** Parse a D1 timestamp ("2026-05-03 09:11:19", UTC, no Z) or ISO date. */
function parseDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00Z`);
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized)
    ? normalized
    : `${normalized}Z`;
  return new Date(withZone);
}

/** "2 February 2026" */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** ISO string for <time dateTime> / JSON-LD. */
export function toIsoDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = parseDate(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

/** "3m ago" / "2h ago", falling back to formatDate after 7 days. */
export function timeAgo(value: string | Date, now = Date.now()): string {
  const then = parseDate(value).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

/** Estimate read time (mins) from markdown/HTML at ~200 wpm. */
export function readingTime(content: string | null | undefined): number {
  if (!content?.trim()) return 1;
  const words = content
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_~`-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
