import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { authedFetch, BlacklistError } from "@/lib/auth/authed-fetch";
import { getToken, refreshUserCookie } from "@/lib/auth/session";
import { enforceOrigin, enforceJsonContent } from "@/lib/auth/csrf";

/**
 * Account profile update. Server-side proxy so the worker is never called from
 * the browser (no CORS dependency, token stays in the httpOnly cookie).
 *
 * PUT /api/account → PUT {API}/me via authedFetch (silent 401→refresh→retry;
 * 403 ACCOUNT_BLACKLISTED → 403 for the suspension overlay). The worker accepts
 * the snake_case fields full_name, email, company_name,
 * business_type_id | custom_business_type, township_id, partner_type_id.
 */
export async function PUT(req: Request) {
  const csrf = enforceOrigin(req) ?? enforceJsonContent(req);
  if (csrf) return csrf;

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
    return NextResponse.json({ error: "No changes to save" }, { status: 400 });
  }

  try {
    const data = await authedFetch<Record<string, unknown>>("/me", {
      method: "PUT",
      body,
    });
    // Sync the header display cookie with the saved profile, using the current
    // (possibly just-refreshed) token.
    const token = await getToken();
    if (token) await refreshUserCookie(token);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    if (err instanceof BlacklistError) {
      return NextResponse.json(
        { error: "ACCOUNT_BLACKLISTED", reason: err.reason },
        { status: 403 },
      );
    }
    if (err instanceof ApiError) {
      if (err.status === 401) {
        return NextResponse.json(
          { error: "Sign in to update your profile" },
          { status: 401 },
        );
      }
      return NextResponse.json(
        { error: err.message || "Failed to update profile" },
        { status: err.status || 502 },
      );
    }
    return NextResponse.json(
      { error: "Could not reach the server" },
      { status: 502 },
    );
  }
}
