import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/env";
import { getAllListingsForSitemap } from "@/lib/api/listings";
import { getBlogs } from "@/lib/api/blogs";
import {
  getEquipmentCategories,
  getAttachmentCategories,
} from "@/lib/api/taxonomy";
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
  const [listings, posts, equipCats, attachCats] = await Promise.all([
    getAllListingsForSitemap().catch(() => []),
    getBlogs({ limit: 200 }).catch(() => []),
    getEquipmentCategories().catch(() => []),
    getAttachmentCategories().catch(() => []),
  ]);

  // Top-level category landing pages — self-canonical long-tail entry points
  // ("Excavators for sale in Myanmar"). Generated from the live taxonomy, so
  // they track whatever categories the admin defines. URL must match the
  // self-canonical the browse page emits for a clean single-category view.
  const categoryEntries: MetadataRoute.Sitemap = [...equipCats, ...attachCats].map(
    (c) => ({
      url: absoluteUrl(`/browse?category=${encodeURIComponent(c.name)}`),
      changeFrequency: "daily",
      priority: 0.75,
    }),
  );

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
