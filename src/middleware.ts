import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Server-side gate for the private app area.
 *
 * These routes must never render for unauthenticated visitors. We check the
 * httpOnly `sl_token` cookie (set by `/api/auth/*` after login; the browser
 * drops it on expiry) BEFORE the page is generated, and bounce anyone without
 * it to the home page with a flag that auto-opens the sign-in modal and
 * remembers where they were headed (handled client-side by <AuthIntent>).
 *
 * `/saved` is intentionally NOT gated — it is localStorage-only and works
 * fully signed-out.
 */
const TOKEN_COOKIE = "sl_token";

export function middleware(req: NextRequest) {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (token) return NextResponse.next();

  const next = req.nextUrl.pathname + req.nextUrl.search;
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  url.searchParams.set("signin", "1");
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  // Private routes only. Subpaths included for future nested pages.
  matcher: ["/account/:path*", "/chat/:path*", "/notifications/:path*"],
};
