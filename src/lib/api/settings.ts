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
  info: "info@shweloader.com",
  support: "support@shweloader.com.mm",
  sales: "sales@shweloader.com",
  privacy: "privacy@shweloader.com",
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
