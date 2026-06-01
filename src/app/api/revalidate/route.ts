import { NextResponse, type NextRequest } from "next/server";
import { updateTag } from "next/cache";
import { REVALIDATE_SECRET } from "@/lib/env";

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
 * On-demand ISR. POST with the shared secret to revalidate cache tags when
 * admin content changes. Body: { tags?: string[] } (defaults to all).
 *   curl -X POST /api/revalidate -H "x-revalidate-secret: …" -d '{"tags":["blogs"]}'
 */
export async function POST(req: NextRequest) {
  const provided =
    req.headers.get("x-revalidate-secret") ??
    new URL(req.url).searchParams.get("secret");

  if (!REVALIDATE_SECRET || provided !== REVALIDATE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { tags?: string[] };
  const tags =
    Array.isArray(body.tags) && body.tags.length ? body.tags : ALL_TAGS;

  for (const tag of tags) updateTag(tag);

  return NextResponse.json({ revalidated: true, tags });
}
