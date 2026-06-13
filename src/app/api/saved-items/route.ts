import { NextResponse } from "next/server";
import { authedFetch, BlacklistError } from "@/lib/auth/authed-fetch";

/**
 * GET /api/saved-items — the signed-in user's saved product ids.
 *
 * Server-side proxy so the worker is never called from the browser (token stays
 * in the httpOnly cookie). The worker's GET /saved-items returns full product
 * rows; we slim to `{ ids }` — the heart-state set. The Saved page fetches
 * display details separately via /api/listings/by-ids. A read, so no CSRF guard.
 * Any auth failure resolves to an empty set (signed-out view) rather than an
 * error, so the UI never breaks.
 */
export async function GET() {
  try {
    const rows = await authedFetch<Array<{ id: number }>>("/saved-items");
    const ids = Array.isArray(rows)
      ? rows.map((r) => r.id).filter((x): x is number => typeof x === "number")
      : [];
    return NextResponse.json({ ids });
  } catch (err) {
    if (err instanceof BlacklistError) {
      return NextResponse.json(
        { error: "ACCOUNT_BLACKLISTED", reason: err.reason },
        { status: 403 },
      );
    }
    return NextResponse.json({ ids: [] });
  }
}
