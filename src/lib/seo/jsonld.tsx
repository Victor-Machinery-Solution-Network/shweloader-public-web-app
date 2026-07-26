import { SITE_URL, absoluteUrl } from "@/lib/env";
import { SITE_NAME, APP_STORE_URL, PLAY_STORE_URL } from "./metadata";
import { listingSlug, blogSlug } from "@/lib/slug";
import { toIsoDate } from "@/lib/format";
import { toPlainText, truncate } from "@/lib/utils";
import type { BlogPost, Listing } from "@/lib/api/types";

type Json = Record<string, unknown>;

/** Render JSON-LD safely (escape `<` to avoid breaking out of the script).
 *  One <script> per schema object — a top-level array in a single tag is valid
 *  JSON-LD, but naive extractors expecting `{"@context"…` miss it. */
export function JsonLd({ data }: { data: Json | Json[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          // data is server-built from trusted shapes; `<` is escaped below.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}

// FALLBACK hotline only — the live value is admin-editable (Settings →
// contact_phone, read via getSiteSettings().contactPhone) and passed in by
// pages; this static is used when no phone is provided.
const HOTLINE_FALLBACK = "+959940475000";

/** Schema-clean telephone: admin-stored display format → digits+plus. */
const schemaTel = (phone?: string) =>
  (phone ?? HOTLINE_FALLBACK).replace(/\s+/g, "");

function organizationRef(): Json {
  return {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/brand/logo_full.png"),
  };
}

/** Seller for an Offer: the visible partner (with phone when present), else the
 *  marketplace itself with the hotline — every listing gets a reachable
 *  contact in structured data, not just the homepage. */
function offerSeller(listing: Listing, phone?: string): Json {
  if (listing.seller?.company && !listing.seller.hidden) {
    return {
      "@type": "Organization",
      name: listing.seller.company,
      ...(listing.seller.phone ? { telephone: listing.seller.phone } : {}),
    };
  }
  return { "@type": "Organization", name: SITE_NAME, url: SITE_URL, telephone: schemaTel(phone) };
}

/** Offer for a listing, or undefined when the price is hidden/absent — the
 *  hide_price guard lives HERE so every schema (product page, category
 *  ItemList) shares it and can't leak an admin-hidden price. */
function listingOffer(listing: Listing, phone?: string): Json | undefined {
  const url = absoluteUrl(`/product/${listingSlug(listing)}`);
  // Derive price + currency together so they can never disagree, mirroring
  // formatMoney() exactly (USD only when display-currency is USD AND a usd
  // value exists; else MMK; else USD) — the structured-data price always
  // matches the price shown on the page.
  let price: number | null = null;
  let currency = "USD";
  if (listing.sale && !listing.sale.hide) {
    if (listing.sale.currency === "USD" && listing.sale.usd != null) {
      price = listing.sale.usd;
      currency = "USD";
    } else if (listing.sale.mmk != null) {
      price = listing.sale.mmk;
      currency = "MMK";
    } else if (listing.sale.usd != null) {
      price = listing.sale.usd;
      currency = "USD";
    }
  }
  if (price == null) return undefined;
  return {
    "@type": "Offer",
    price: String(price),
    priceCurrency: currency,
    availability: listing.isSoldOut
      ? "https://schema.org/SoldOut"
      : "https://schema.org/InStock",
    itemCondition:
      listing.condition?.toLowerCase() === "new"
        ? "https://schema.org/NewCondition"
        : "https://schema.org/UsedCondition",
    url,
    seller: offerSeller(listing, phone),
  };
}

export function organizationSchema(phone?: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: "Shwe Loader",
    url: SITE_URL,
    // PNG, not SVG — Google's logo parsing is raster-safe only.
    logo: absoluteUrl("/brand/logo_full.png"),
    description:
      "Myanmar's marketplace for heavy equipment and machinery — buy, rent, or sell construction equipment, excavators, loaders, cranes, and attachments.",
    foundingDate: "2018",
    founder: {
      "@type": "Organization",
      name: "Victor Machinery Solution Network Co., Ltd",
    },
    // Entity disambiguation vs the unaffiliated shweloader.com: every real
    // profile we control, so search engines bind the brand to .com.mm.
    sameAs: [
      "https://www.facebook.com/profile.php?id=61559388680768",
      "https://facebook.com/shweloader",
      APP_STORE_URL,
      PLAY_STORE_URL,
    ],
    // Online-only business: declare the service country, NOT a street/region.
    // A fabricated locality (e.g. a Yangon address) is a false local signal that
    // would conflict with having no physical presence / Google Business Profile.
    areaServed: "MM",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      // Business hotline (also the Viber number). Keep in sync with
      // footer.tsx HOTLINE_TEL.
      telephone: schemaTel(phone),
      areaServed: "MM",
      availableLanguage: ["English", "Burmese"],
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "MM",
    },
  };
}

export function websiteSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: "Shwe Loader",
    url: SITE_URL,
    inLanguage: ["en", "my"],
    publisher: organizationRef(),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/browse?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(
  items: { name: string; path: string }[],
): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function productSchema(listing: Listing, phone?: string): Json {
  const url = absoluteUrl(`/product/${listingSlug(listing)}`);
  const images = [listing.thumbnail, ...listing.images]
    .map((i) => i.url)
    .filter((u): u is string => !!u);

  const offers = listingOffer(listing, phone);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    ...(images.length ? { image: images } : {}),
    ...(listing.description
      ? { description: truncate(toPlainText(listing.description), 300) }
      : {}),
    ...(listing.brand ? { brand: { "@type": "Brand", name: listing.brand } } : {}),
    ...(listing.category ? { category: listing.category } : {}),
    ...(listing.sale?.customId ? { sku: listing.sale.customId } : {}),
    ...(offers ? { offers } : {}),
  };
}

export function blogPostingSchema(post: BlogPost): Json {
  const url = absoluteUrl(`/blogs/${blogSlug(post)}`);
  const plain = post.content ? toPlainText(post.content) : "";
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    ...(plain ? { description: truncate(plain, 200) } : {}),
    ...(post.cover.url ? { image: [post.cover.url] } : {}),
    ...(post.date ? { datePublished: toIsoDate(post.date) } : {}),
    ...(post.createdAt ? { dateModified: toIsoDate(post.createdAt) } : {}),
    author: {
      "@type": post.author ? "Person" : "Organization",
      name: post.author ?? SITE_NAME,
    },
    publisher: organizationRef(),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    ...(post.category ? { articleSection: post.category } : {}),
    ...(plain
      ? { wordCount: plain.split(/\s+/).filter(Boolean).length }
      : {}),
  };
}

export function itemListSchema(
  listings: Listing[],
  basePath = "/browse",
): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Heavy equipment listings",
    numberOfItems: listings.length,
    itemListElement: listings.map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/product/${listingSlug(l)}`),
      name: l.title,
    })),
    ...(basePath ? { url: absoluteUrl(basePath) } : {}),
  };
}

/**
 * CollectionPage for browse / filtered listing views — the canonical schema.org
 * type for a curated, filterable set of items. Embeds the listings as an
 * ItemList `mainEntity` so search engines can treat the page as an aggregated
 * collection (carousel-eligible) rather than a bare list.
 */
export function collectionPageSchema(opts: {
  name: string;
  path: string;
  listings: Listing[];
  description?: string;
  /** Admin-editable hotline for the marketplace-seller fallback. */
  phone?: string;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    url: absoluteUrl(opts.path),
    ...(opts.description ? { description: opts.description } : {}),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: opts.listings.length,
      // Full Product + Offer per item (price/seller/contact when visible) so an
      // agent can enumerate the machines from one category-page fetch.
      itemListElement: opts.listings.map((l, i) => {
        const offers = listingOffer(l, opts.phone);
        return {
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Product",
            name: l.title,
            url: absoluteUrl(`/product/${listingSlug(l)}`),
            ...(l.brand ? { brand: { "@type": "Brand", name: l.brand } } : {}),
            ...(offers ? { offers } : {}),
          },
        };
      }),
    },
  };
}

export function aboutPageSchema(phone?: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About ShweLoader",
    url: absoluteUrl("/about"),
    mainEntity: organizationSchema(phone),
  };
}
