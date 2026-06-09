/** Cache tags for on-demand ISR revalidation (POST /api/revalidate). */
export const CACHE_TAGS = {
  listings: "listings",
  featured: "featured-listings",
  blogs: "blogs",
  blogCategories: "blog-categories",
  categories: "categories",
  brands: "brands",
  locations: "locations",
  businessTypes: "business-types",
  partnerTypes: "partner-types",
  carousel: "carousel",
  announcements: "announcements",
} as const;

export function listingTag(id: number | string): string {
  return `listing:${id}`;
}
export function blogTag(id: number | string): string {
  return `blog:${id}`;
}
