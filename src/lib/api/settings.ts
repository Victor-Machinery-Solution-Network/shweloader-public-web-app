import { cacheLife, cacheTag } from "next/cache";
import { apiFetch } from "./client";
import { CACHE_TAGS } from "./cache-tags";

/**
 * Admin-editable contact emails (Admin portal → Settings → Contact Emails),
 * stored in D1 `app_setting` and served by app-api `GET /app-settings`. The web
 * app used to hardcode these; this reads them so a change in the admin portal
 * shows on the site (within the cache window — busted via the app-settings tag).
 */
export interface ContactEmails {
  info: string;
  support: string;
  sales: string;
  privacy: string;
}

// Fallbacks = the historical static addresses. Used when a key is unset in D1
// (or the API is unreachable) so nothing ever renders blank.
const FALLBACK: ContactEmails = {
  info: "inquiry@shweloader.com.mm",
  support: "support@shweloader.com.mm",
  sales: "inquiry@shweloader.com.mm",
  privacy: "privacy@shweloader.com.mm",
};

export async function getContactEmails(): Promise<ContactEmails> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.appSettings);

  let settings: Record<string, unknown>;
  try {
    settings = await apiFetch<Record<string, unknown>>("/app-settings");
  } catch {
    // ponytail: contact emails are global chrome (footer is on every page) —
    // never let an API hiccup break the whole site; fall back to statics.
    return FALLBACK;
  }

  const pick = (key: string, fb: string) => {
    const v = settings[key];
    return typeof v === "string" && v.trim() ? v.trim() : fb;
  };
  return {
    info: pick("contact_email_info", FALLBACK.info),
    support: pick("contact_email_support", FALLBACK.support),
    sales: pick("contact_email_sales", FALLBACK.sales),
    privacy: pick("contact_email_privacy", FALLBACK.privacy),
  };
}

/**
 * Admin-editable site toggles + contact phone (Admin portal → Settings).
 * Same `app_setting` source and cache policy as the emails above. The mobile
 * app already honors all of these; this brings the website to parity.
 */
export interface SiteSettings {
  /** Show the homepage image carousel. */
  carouselEnabled: boolean;
  /** Show the scrolling announcement bar. */
  announcementBarEnabled: boolean;
  /** Show the blog/articles section (nav, footer, home, /blogs routes). */
  articlesEnabled: boolean;
  /** Hotline shown in the footer and chat "call support" links. */
  contactPhone: string;
}

// Historical static hotline — used when contact_phone is unset in D1 or the
// API is unreachable, so the footer never renders blank.
const PHONE_FALLBACK = "+95 9 940 475 000";

export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.appSettings);

  let settings: Record<string, unknown> = {};
  try {
    settings = await apiFetch<Record<string, unknown>>("/app-settings");
  } catch {
    // Global chrome (header/footer/home) — an API hiccup must never break the
    // site; defaults below (everything enabled, static phone) take over.
  }

  // Admin stores String(boolean); anything but an explicit "false" means ON,
  // so an unset key keeps the feature visible (same default as mobile).
  const flag = (key: string) => settings[key] !== "false";
  const phone = settings.contact_phone;

  return {
    carouselEnabled: flag("carousel_enabled"),
    announcementBarEnabled: flag("announcement_bar_enabled"),
    articlesEnabled: flag("articles_enabled"),
    contactPhone:
      typeof phone === "string" && phone.trim() ? phone.trim() : PHONE_FALLBACK,
  };
}
