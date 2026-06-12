import { NextResponse } from "next/server";
import { authedFetch, BlacklistError } from "@/lib/auth/authed-fetch";

/** GET /api/notifications → worker GET /notifications. GET (no body) → no CSRF
 *  guard needed; auth via the httpOnly cookie. Returns the worker payload
 *  verbatim so the client can normalize + count unread itself. */
export async function GET() {
  try {
    const data = await authedFetch<unknown>("/notifications", { method: "GET" });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BlacklistError) {
      return NextResponse.json(
        { error: "ACCOUNT_BLACKLISTED", reason: err.reason },
        { status: 403 },
      );
    }
    // Non-fatal for the badge: hand back an empty list so the client counts 0.
    return NextResponse.json([], { status: 200 });
  }
}
