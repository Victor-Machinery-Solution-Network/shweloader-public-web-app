import type { Metadata } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/env";

export const SITE_NAME = "ShweLoader";
/** X / Twitter handle for card attribution. Re-stated in every twitter block
 *  because per-segment metadata replaces (doesn't deep-merge) the root's. */
export const TWITTER_HANDLE = "@shweloader";
export const DEFAULT_TITLE =
  "ShweLoader Myanmar | Heavy Equipment for Sale & Rent";
export const DEFAULT_DESCRIPTION =
  "Buy, sell and rent excavators, bulldozers, wheel loaders, cranes, trucks and construction machinery across Myanmar on ShweLoader. MMK and USD pricing, on-site viewings, trusted dealers.";
/** iOS app (App Store Connect Apple ID) — drives the Safari Smart App Banner. */
export const APPLE_APP_ID = "6760832842";
export const APP_STORE_URL =
  "https://apps.apple.com/us/app/shwe-loader/id6760832842";
export const ANDROID_PACKAGE = "com.shweloaderbyvmsn.app";
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: "%s · ShweLoader" },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  // No `keywords`: Google has ignored <meta name="keywords"> since ~2009.
  // No global `alternates.canonical`: a root-level "/" canonical is INHERITED by
  // any indexable page that omits its own `path`, wrongly marking it a duplicate
  // of the homepage. Each page sets its canonical via buildMetadata({ path });
  // a page with no path self-canonicalizes to its own URL (the safe default).
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    locale: "en_MM",
    alternateLocale: ["my_MM"],
  },
  twitter: {
    card: "summary_large_image",
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: false },
  // Safari-only (iOS) Smart App Banner: "GET"/"OPEN" bar linking to the app.
  itunes: { appId: APPLE_APP_ID },
};

export interface PageMetaInput {
  title?: string;
  description?: string;
  /** Path relative to the site root, e.g. "/browse". */
  path?: string;
  images?: { url: string; width?: number; height?: number; alt?: string }[];
  type?: "website" | "article";
  noindex?: boolean;
  publishedTime?: string;
  authors?: string[];
  section?: string;
  /** Set when a colocated opengraph-image route owns the social image. Omits
   *  openGraph/twitter `images` here so the file convention isn't overridden
   *  (config-level images take precedence over file-based ones in Next). */
  socialImagesFromRoute?: boolean;
}

/** Build per-page metadata that inherits the base + sets canonical + OG. */
export function buildMetadata(input: PageMetaInput = {}): Metadata {
  const { title, description, path, images, type, noindex } = input;
  const canonical = path || undefined;
  const resolvedDescription = description ?? DEFAULT_DESCRIPTION;
  // Emit an og:image unless a colocated opengraph-image route owns it (then we
  // must leave the `images` key absent or it overrides the file convention).
  // Pages with neither default to the static branded banner (1800×753).
  const ogImages = images
    ? images
    : input.socialImagesFromRoute
      ? undefined
      : [
          {
            url: absoluteUrl("/brand/og-banner.png"),
            width: 1800,
            height: 753,
            alt: title ?? DEFAULT_TITLE,
          },
        ];

  // On routes the app deep-links (universal-link paths in the AASA file), pass
  // the page URL as the banner's app-argument so "OPEN" lands on the same
  // product/article in the app. Other pages inherit the root's plain banner.
  const appLinked =
    canonical && /^\/(product|blogs)\//.test(canonical)
      ? { itunes: { appId: APPLE_APP_ID, appArgument: absoluteUrl(canonical) } }
      : {};

  return {
    ...appLinked,
    // Pages with a title get the "%s · ShweLoader" template; pages without one
    // (the homepage) get the full default title verbatim — never an empty <title>.
    title: title ?? { absolute: DEFAULT_TITLE },
    description: resolvedDescription,
    alternates: canonical ? { canonical } : undefined,
    // Per-segment metadata replaces (doesn't deep-merge) the root's openGraph
    // and robots, so re-state them here to keep og:locale + crawl directives.
    robots: noindex
      ? { index: false, follow: false, nocache: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type: type ?? "website",
      siteName: SITE_NAME,
      title: title ?? DEFAULT_TITLE,
      description: resolvedDescription,
      url: canonical ? absoluteUrl(canonical) : SITE_URL,
      locale: "en_MM",
      alternateLocale: ["my_MM"],
      ...(ogImages ? { images: ogImages } : {}),
      ...(input.publishedTime
        ? { publishedTime: input.publishedTime }
        : {}),
      ...(input.authors ? { authors: input.authors } : {}),
      ...(input.section ? { section: input.section } : {}),
    },
    twitter: {
      card: "summary_large_image",
      // Per-segment metadata replaces (doesn't deep-merge) the root's twitter
      // block, so re-state site/creator here or product/blog cards lose the
      // @shweloader attribution the homepage has.
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      title: title ?? DEFAULT_TITLE,
      description: description ?? DEFAULT_DESCRIPTION,
      ...(ogImages ? { images: ogImages.map((i) => i.url) } : {}),
    },
  };
}

/** Metadata for the authed app area — never indexed. */
export const noindexMetadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};
