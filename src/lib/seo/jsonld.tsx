import { SITE_URL, absoluteUrl } from "@/lib/env";
import { SITE_NAME } from "./metadata";
import { listingSlug, blogSlug } from "@/lib/slug";
import { toIsoDate } from "@/lib/format";
import { toPlainText, truncate } from "@/lib/utils";
import type { BlogPost, Listing } from "@/lib/api/types";

type Json = Record<string, unknown>;

/** Render JSON-LD safely (escape `<` to avoid breaking out of the script). */
export function JsonLd({ data }: { data: Json | Json[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // data is server-built from trusted shapes; `<` is escaped above.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

function organizationRef(): Json {
  return {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/brand/logo_dark.svg"),
  };
}

export function organizationSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/brand/logo_dark.svg"),
    description:
      "Myanmar's marketplace for heavy equipment and machinery — buy, rent, or sell construction equipment, excavators, loaders, cranes, and attachments.",
    sameAs: [
      "https://www.facebook.com/shweloader",
      "https://www.instagram.com/shweloader",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      areaServed: "MM",
      availableLanguage: ["English", "Burmese"],
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "MM",
      addressRegion: "Yangon",
    },
  };
}

export function websiteSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ["en", "my"],
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

export function productSchema(listing: Listing): Json {
  const url = absoluteUrl(`/product/${listingSlug(listing)}`);
  const images = [listing.thumbnail, ...listing.images]
    .map((i) => i.url)
    .filter((u): u is string => !!u);

  const price =
    listing.sale && !listing.sale.hide
      ? (listing.sale.usd ?? listing.sale.mmk)
      : null;
  const currency =
    listing.sale?.currency === "USD" && listing.sale.usd != null
      ? "USD"
      : listing.sale?.mmk != null
        ? "MMK"
        : "USD";

  const offers =
    price != null
      ? {
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
          ...(listing.seller?.company && !listing.seller.hidden
            ? {
                seller: {
                  "@type": "Organization",
                  name: listing.seller.company,
                },
              }
            : {}),
        }
      : undefined;

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
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
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
    ...(post.content
      ? { wordCount: toPlainText(post.content).split(/\s+/).filter(Boolean).length }
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

export function aboutPageSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About ShweLoader",
    url: absoluteUrl("/about"),
    mainEntity: organizationSchema(),
  };
}
