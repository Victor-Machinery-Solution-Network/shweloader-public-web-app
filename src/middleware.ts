import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwtExp } from "@/lib/auth/jwt-exp";
import { API_BASE_URL } from "@/lib/env";

/**
 * Server-side gate + silent-refresh for the private app area.
 *
 * 1. No `sl_token` → bounce to the sign-in modal (remembering the destination).
 * 2. On a real navigation whose access token is within 60s of expiry (or
 *    undecodable), proactively refresh it using `sl_refresh` and set the fresh
 *    token cookie on the response — so a bare GET of an authed page renews the
 *    session without the user noticing. Prefetches are never refreshed/redirected.
 * 3. A 403 ACCOUNT_BLACKLISTED during refresh clears the session here (a
 *    cookie-writable boundary) and bounces to `/?blacklisted=1`.
 *
 * The exp decode has ZERO auth authority — a forged `exp` at worst wastes one
 * refresh round-trip; the worker still verifies the signature. `/saved` is not
 * gated (localStorage-only).
 */
const TOKEN_COOKIE = "sl_token";
const REFRESH_COOKIE = "sl_refresh";
const REMEMBER_COOKIE = "sl_remember";
const USER_COOKIE = "sl_user";
const NEAR_EXPIRY_S = 60;
const ACCESS_MAXAGE = 60 * 60 * 24 * 7; // 7d (proxy renews the inner JWT)

function signInRedirect(req: NextRequest) {
  const url = req.nextUrl.clone();
  const next = req.nextUrl.pathname + req.nextUrl.search;
  url.pathname = "/";
  url.search = "";
  url.searchParams.set("signin", "1");
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) return signInRedirect(req);

  // Never refresh or redirect as a side effect of a prefetch (hover/viewport).
  const isPrefetch =
    req.headers.get("next-router-prefetch") === "1" ||
    (req.headers.get("sec-purpose") ?? "").includes("prefetch");
  if (isPrefetch) return NextResponse.next();

  const exp = decodeJwtExp(token);
  const now = Math.floor(Date.now() / 1000);
  const needsRefresh = exp === null || exp - now < NEAR_EXPIRY_S;
  if (!needsRefresh) return NextResponse.next();

  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return NextResponse.next(); // route/worker will reject

  let refreshRes: Response;
  try {
    refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    return NextResponse.next(); // network blip — fail open
  }

  // Blacklisted mid-session → clear cookies here and bounce to the overlay.
  if (refreshRes.status === 403) {
    const data = (await refreshRes.json().catch(() => ({}))) as {
      error?: string;
    };
    if (data.error === "ACCOUNT_BLACKLISTED") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      url.searchParams.set("blacklisted", "1");
      const res = NextResponse.redirect(url);
      for (const c of [TOKEN_COOKIE, REFRESH_COOKIE, REMEMBER_COOKIE, USER_COOKIE]) {
        res.cookies.delete(c);
      }
      return res;
    }
    return NextResponse.next(); // other 403 → fail open (no cookie write)
  }

  if (!refreshRes.ok) return NextResponse.next(); // expired refresh, etc.

  const data = (await refreshRes.json().catch(() => ({}))) as {
    access_token?: string;
  };
  if (!data.access_token) return NextResponse.next();

  // Success → proceed, writing the fresh token. Persistence mirrors the
  // login-time Remember-me choice; re-pin sl_user so it tracks the session.
  const remember = req.cookies.get(REMEMBER_COOKIE)?.value !== "0";
  const persist = remember ? { maxAge: ACCESS_MAXAGE } : {};
  const base = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  const res = NextResponse.next();
  res.cookies.set(TOKEN_COOKIE, data.access_token, { ...base, httpOnly: true, ...persist });
  const slUser = req.cookies.get(USER_COOKIE)?.value;
  if (slUser) res.cookies.set(USER_COOKIE, slUser, { ...base, ...persist });
  return res;
}

export const config = {
  // Private routes only. Subpaths included for future nested pages.
  matcher: ["/account/:path*", "/chat/:path*", "/notifications/:path*"],
};
