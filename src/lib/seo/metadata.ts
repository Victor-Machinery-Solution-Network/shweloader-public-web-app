import type { Metadata } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/env";

export const SITE_NAME = "ShweLoader";
/** X / Twitter handle for card attribution. Re-stated in every twitter block
 *  because per-segment metadata replaces (doesn't deep-merge) the root's. */
export const TWITTER_HANDLE = "@shweloader";
export const DEFAULT_TITLE =
  "ShweLoader — Myanmar's Heavy Equipment Marketplace";
export const DEFAULT_DESCRIPTION =
  "Buy, sell, and rent excavators, wheel loaders, cranes, and bulldozers across Myanmar. MMK and USD pricing, on-site viewings, trusted dealers.";

export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: "%s · ShweLoader" },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: [
    "heavy equipment",
    "machinery",
    "Myanmar",
    "excavator",
    "wheel loader",
    "crane",
    "bulldozer",
    "dump truck",
    "for sale",
    "for rent",
    "ShweLoader",
  ],
  alternates: { canonical: "/" },
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
}

/** Build per-page metadata that inherits the base + sets canonical + OG. */
export function buildMetadata(input: PageMetaInput = {}): Metadata {
  const { title, description, path, images, type, noindex } = input;
  const canonical = path || undefined;
  const resolvedDescription = description ?? DEFAULT_DESCRIPTION;
  // Always emit an og:image. Per-page metadata replaces (doesn't deep-merge) the
  // root's openGraph, so default every page that passes no explicit images to the
  // static branded share banner (public/brand/og-banner.png, 1800×753).
  const ogImages = images ?? [
    {
      url: absoluteUrl("/brand/og-banner.png"),
      width: 1800,
      height: 753,
      alt: title ?? DEFAULT_TITLE,
    },
  ];

  return {
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
      images: ogImages,
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
      images: ogImages.map((i) => i.url),
    },
  };
}

/** Metadata for the authed app area — never indexed. */
export const noindexMetadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};
