import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/env";
import { getAllListingsForSitemap } from "@/lib/api/listings";
import { getBlogs } from "@/lib/api/blogs";
import {
  getEquipmentCategories,
  getAttachmentCategories,
} from "@/lib/api/taxonomy";
import { getSiteSettings } from "@/lib/api/settings";
import { listingSlug, blogSlug } from "@/lib/slug";
import { buildLandingNodes } from "@/lib/category-landing";
import { loadLanding } from "@/components/browse/category-landing";

function asDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(normalized) ? normalized : `${normalized}Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Articles toggle (Admin → Settings): blog routes 404 while disabled, so
  // they must drop out of the sitemap too. Default to enabled on API failure.
  const { articlesEnabled } = await getSiteSettings().catch(() => ({
    articlesEnabled: true,
  }));

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/browse"), changeFrequency: "hourly", priority: 0.9 },
    ...(articlesEnabled
      ? [
          {
            url: absoluteUrl("/blogs"),
            changeFrequency: "weekly",
            priority: 0.7,
          } as const,
        ]
      : []),
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/legal"), changeFrequency: "yearly", priority: 0.3 },
  ];

  // Tolerate API outages — a partial sitemap beats a 500.
  const [listings, posts, equipCats, attachCats] = await Promise.all([
    getAllListingsForSitemap().catch(() => []),
    articlesEnabled ? getBlogs({ limit: 200 }).catch(() => []) : [],
    getEquipmentCategories().catch(() => []),
    getAttachmentCategories().catch(() => []),
  ]);

  // Clean category landing pages (/bulldozers, /bulldozers/for-rent) — the
  // indexable long-tail entry points, generated from the live taxonomy. Only
  // pages with stock are listed; empty ones are noindex until they fill.
  const nodes = buildLandingNodes(equipCats, attachCats);
  const categoryEntries: MetadataRoute.Sitemap = (
    await Promise.all(
      nodes.flatMap((n) =>
        (["sale", "rent"] as const).map(async (mode) => {
          const data = await loadLanding(n.slug, mode).catch(() => null);
          if (!data || data.total === 0) return null;
          return {
            url: absoluteUrl(`/${n.slug}/for-${mode}`),
            changeFrequency: "daily",
            priority: mode === "rent" ? 0.65 : 0.75,
          } as const;
        }),
      ),
    )
  ).filter((e): e is NonNullable<typeof e> => e !== null);

  const listingEntries: MetadataRoute.Sitemap = listings.map((l) => ({
    url: absoluteUrl(`/product/${listingSlug(l)}`),
    lastModified: asDate(l.createdAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const blogEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: absoluteUrl(`/blogs/${blogSlug(p)}`),
    lastModified: asDate(p.date ?? p.createdAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...categoryEntries,
    ...listingEntries,
    ...blogEntries,
  ];
}
