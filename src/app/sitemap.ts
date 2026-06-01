import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/env";
import { getAllListingsForSitemap } from "@/lib/api/listings";
import { getBlogs } from "@/lib/api/blogs";
import { listingSlug, blogSlug } from "@/lib/slug";

function asDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(normalized) ? normalized : `${normalized}Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/browse"), changeFrequency: "hourly", priority: 0.9 },
    { url: absoluteUrl("/blogs"), changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/legal"), changeFrequency: "yearly", priority: 0.3 },
  ];

  // Tolerate API outages — a partial sitemap beats a 500.
  const [listings, posts] = await Promise.all([
    getAllListingsForSitemap().catch(() => []),
    getBlogs({ limit: 200 }).catch(() => []),
  ]);

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

  return [...staticRoutes, ...listingEntries, ...blogEntries];
}
