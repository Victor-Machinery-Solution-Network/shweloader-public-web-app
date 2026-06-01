/**
 * Centralized environment access.
 *
 * NEXT_PUBLIC_* values are inlined at build time and safe on the client.
 * API_BASE_URL / REVALIDATE_SECRET are server-only — they are read here but
 * must only be referenced from server code (the API client, route handlers).
 */
function clean(url?: string): string {
  return (url || "").replace(/\/+$/, "");
}

/** Canonical public origin of THIS website (no trailing slash). */
export const SITE_URL =
  clean(process.env.NEXT_PUBLIC_SITE_URL) || "https://shweloader.com.mm";

/** R2 / CDN base for listing + blog images. */
export const ASSET_BASE_URL =
  clean(process.env.NEXT_PUBLIC_ASSET_BASE_URL) ||
  "https://asset-staging.shweloader.com.mm";

export const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY || "";
export const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1";

/** App REST API (Hono worker). Server-only. */
export const API_BASE_URL =
  clean(process.env.APP_API_BASE_URL) ||
  "https://app-api.staging.shweloader.com.mm";

export const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || "";

/** Absolute URL helper for canonical/OG/sitemap links. */
export function absoluteUrl(path = ""): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
