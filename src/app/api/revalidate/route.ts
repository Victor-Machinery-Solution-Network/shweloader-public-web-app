import { NextResponse, type NextRequest } from "next/server";
import { updateTag } from "next/cache";
import { createHash, timingSafeEqual } from "node:crypto";
import { REVALIDATE_SECRET } from "@/lib/env";

/** Constant-time, length-safe secret comparison (SHA-256 → fixed length). */
function secretMatches(provided: string | null): boolean {
  if (!REVALIDATE_SECRET || !provided) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(REVALIDATE_SECRET).digest();
  return timingSafeEqual(a, b);
}

const ALL_TAGS = [
  "listings",
  "featured-listings",
  "blogs",
  "blog-categories",
  "categories",
  "brands",
  "locations",
  "carousel",
  "announcements",
];

/**
 * On-demand ISR. POST with the shared secret (header only — never a query
 * string, which would leak into logs/proxies) to revalidate cache tags when
 * admin content changes. Body: { tags?: string[] } (defaults to all).
 *   curl -X POST /api/revalidate -H "x-revalidate-secret: …" -d '{"tags":["blogs"]}'
 */
export async function POST(req: NextRequest) {
  if (!secretMatches(req.headers.get("x-revalidate-secret"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { tags?: string[] };
  const tags =
    Array.isArray(body.tags) && body.tags.length ? body.tags : ALL_TAGS;

  for (const tag of tags) updateTag(tag);

  return NextResponse.json({ revalidated: true, tags });
}
