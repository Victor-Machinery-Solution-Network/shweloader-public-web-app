/**
 * Centralized environment access.
 *
 * NEXT_PUBLIC_* values are inlined at build time and safe on the client.
 * API_BASE_URL / REVALIDATE_SECRET are server-only — they are read here but
 * must only be referenced from server code (the API client, route handlers).
 */
function clean(url?: string): string {
  return (url || "").trim().replace(/\/+$/, "");
}

/** Canonical public origin of THIS website (no trailing slash). */
export const SITE_URL =
  clean(process.env.NEXT_PUBLIC_SITE_URL) || "https://shweloader.com.mm";

/** R2 / CDN base for listing + blog images. Defaults to PROD so a missing
 * env var can never silently emit staging image URLs into canonical/OG/JSON-LD. */
export const ASSET_BASE_URL =
  clean(process.env.NEXT_PUBLIC_ASSET_BASE_URL) ||
  "https://asset.shweloader.com.mm";

export const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY || "";
export const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1";

/** App REST API (Hono worker). Server-only. Defaults to PROD so the public
 * site (catalog reads + sitemap listing URLs) reflects prod inventory unless a
 * non-prod target is explicitly set per Vercel environment. */
export const API_BASE_URL =
  clean(process.env.APP_API_BASE_URL) ||
  "https://app-api.shweloader.com.mm";

export const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || "";

// ---------------------------------------------------------------------------
// Firebase (Realtime Database presence) — Phase 3 web chat presence
// All values are NEXT_PUBLIC_* (browser-side). When apiKey is absent the
// feature is fully inert — no Firebase import, no network.
// ---------------------------------------------------------------------------
export const FIREBASE = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    "https://shwe-loader-default-rtdb.asia-southeast1.firebasedatabase.app",
};

/** True only when the minimum Firebase config is present at build/runtime.
 *  When false every presence path is a no-op and Firebase is never imported. */
export const PRESENCE_ENABLED = !!(FIREBASE.apiKey && FIREBASE.databaseURL);

/** Absolute URL helper for canonical/OG/sitemap links. Pass-through for inputs
 * that are already absolute (e.g. a full asset URL handed to og:image). */
export function absoluteUrl(path = ""): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
