import type { Category } from "@/lib/api/types";

/**
 * Clean SEO landing pages for taxonomy nodes: /bulldozers, /truck-cranes,
 * /earth-moving-machinery — plus /:slug/for-rent variants. These are the
 * indexable category pages ("bulldozer for sale Myanmar"); /browse stays the
 * static instant-paint app whose parameterized views are noindex.
 */

/** Top-level routes a taxonomy slug must never shadow. */
const RESERVED = new Set([
  "browse",
  "blogs",
  "about",
  "legal",
  "product",
  "account",
  "saved",
  "chat",
  "notifications",
  "api",
  "llms.txt",
  "robots.txt",
  "sitemap.xml",
]);

/** Mass nouns that must not be pluralized ("Earth Moving Machinery"). */
const MASS_NOUNS = /(machinery|equipment)$/;

/** True when a name should keep its form: already plural or a mass noun. */
export function isPluralName(name: string): boolean {
  const last = name.trim().toLowerCase();
  return last.endsWith("s") || MASS_NOUNS.test(last);
}

/** "Wheel Loader" → "wheel-loaders"; plural/mass-noun names stay as-is. */
export function categorySlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return isPluralName(name) ? slug : `${slug}s`;
}

export interface LandingNode {
  slug: string;
  /** Taxonomy name as stored (used to build the listing query + browse links). */
  name: string;
  kind: "category" | "sub";
  /** Parent category name when kind === "sub". */
  parent?: string;
  type: "equipment" | "attachment";
}

/** Flatten the taxonomy into landing nodes, first slug wins on collision. */
export function buildLandingNodes(
  categories: Category[],
  attachmentCategories: Category[],
): LandingNode[] {
  const nodes: LandingNode[] = [];
  const seen = new Set(RESERVED);
  const add = (node: LandingNode) => {
    if (seen.has(node.slug)) return;
    seen.add(node.slug);
    nodes.push(node);
  };
  for (const [type, cats] of [
    ["equipment", categories],
    ["attachment", attachmentCategories],
  ] as const) {
    for (const c of cats) {
      add({ slug: categorySlug(c.name), name: c.name, kind: "category", type });
      for (const s of c.subCategories ?? []) {
        add({
          slug: categorySlug(s.name),
          name: s.name,
          kind: "sub",
          parent: c.name,
          type,
        });
      }
    }
  }
  return nodes;
}

export function findLandingNode(
  slug: string,
  categories: Category[],
  attachmentCategories: Category[],
): LandingNode | null {
  return (
    buildLandingNodes(categories, attachmentCategories).find(
      (n) => n.slug === slug,
    ) ?? null
  );
}
