import { NextResponse } from "next/server";
import { getListing } from "@/lib/api/listings";

/**
 * GET /api/listings/by-ids?ids=1,2,3 → normalized Listing[].
 * Backs the Saved page, which stores favourite ids in localStorage and hydrates
 * the cards here (works signed-out; no auth required).
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("ids") ?? "";
  const ids = raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 60);

  if (!ids.length) return NextResponse.json([]);

  const listings = (
    await Promise.all(ids.map((id) => getListing(id).catch(() => null)))
  ).filter(Boolean);

  return NextResponse.json(listings);
}
