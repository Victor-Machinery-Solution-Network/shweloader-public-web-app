/** Cache tags for on-demand ISR revalidation (POST /api/revalidate). */
export const CACHE_TAGS = {
  listings: "listings",
  /** ALL product detail pages at once — platform-wide changes only (see getListing). */
  listingDetails: "listing-details",
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
  appSettings: "app-settings",
} as const;

export function listingTag(id: number | string): string {
  return `listing:${id}`;
}
export function blogTag(id: number | string): string {
  return `blog:${id}`;
}
