import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";

/**
 * Blacklist landing handler. RSC pages (which can't write cookies) and the proxy
 * redirect here when the worker reports the account suspended. We clear the
 * session and bounce to the home page with ?blacklisted=1, where the client
 * SuspensionOverlay explains it. Boolean flag only — no admin reason in the URL.
 *
 * GET because it's reached via a redirect; it only clears the caller's own
 * session (logout-equivalent), so it carries no CSRF risk.
 */
export async function GET(req: Request) {
  // Ignore cross-site triggers so a disguised external <a href> can't force-clear
  // a signed-in user's session or flash the overlay. Our own RSC redirect is
  // same-origin (or "none" for a typed URL), which we still honor.
  if (req.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  await clearSession();
  return NextResponse.redirect(new URL("/?blacklisted=1", req.url));
}
