/**
 * SEO slug helpers.
 *
 * Listings/blogs only have numeric ids in the API, so we build slugs as
 * `{slugified-title}-{id}` and parse the trailing id back out. A bare numeric
 * segment (`/product/80`) also resolves — preserving app deep-link parity —
 * and canonicalizes to the slug form.
 */
function slugify(input: string): string {
  return (input || "")
    .toString()
    .toLowerCase()
    .normalize("NFKD") // decomposes accents → base char + combining mark
    .replace(/[̀-ͯ]/g, "") // drop the combining marks
    // ASCII-only slugs ON PURPOSE: a slug must be usable in an HTTP `Location`
    // header (Latin-1), and canonicalization redirects to it — a non-Latin
    // (e.g. Burmese) slug throws a ByteString error and breaks the build. The
    // Burmese title still drives the <h1>, metadata, and JSON-LD, so its SEO is
    // unaffected; only the URL slug is romanised/trimmed.
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/**
 * Build a listing slug from brand + model + id. Accepts either the normalized
 * `Listing` view-model (`title`/`brand`) or a raw API row (`model_name`/
 * `brand_name`) — every caller passes the normalized shape.
 */
export function listingSlug(listing: {
  id: number;
  title?: string | null;
  brand?: string | null;
  model_name?: string | null;
  brand_name?: string | null;
}): string {
  const brand = listing.brand ?? listing.brand_name;
  const model = listing.title ?? listing.model_name;
  const text = [brand, model].filter(Boolean).join(" ");
  const base = slugify(text);
  return base ? `${base}-${listing.id}` : `listing-${listing.id}`;
}

/** Build a blog slug from title + id. */
export function blogSlug(post: { id: number; title?: string | null }): string {
  const base = slugify(post.title || "");
  return base ? `${base}-${post.id}` : `post-${post.id}`;
}

/** Extract the trailing numeric id from a slug or bare-id segment. */
export function parseIdFromSlug(slug: string): number | null {
  const match = String(slug).match(/(\d+)\s*$/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export { slugify };
