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
  await clearSession();
  return NextResponse.redirect(new URL("/?blacklisted=1", req.url));
}
