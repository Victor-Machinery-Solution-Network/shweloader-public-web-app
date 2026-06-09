import "server-only";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";

/**
 * For use in RSC data fetches: if the worker reported the account blacklisted
 * (403 ACCOUNT_BLACKLISTED), redirect to the route handler that clears the
 * session (RSC can't write cookies) and shows the suspension overlay.
 *
 * `redirect()` throws NEXT_REDIRECT, which must propagate — so call this inside
 * a `.catch`/`catch` and let it throw for the blacklist case; return normally
 * for any other error so the page can fall back to its signed-out/empty state.
 */
export function redirectIfBlacklisted(err: unknown): void {
  if (
    err instanceof ApiError &&
    err.status === 403 &&
    err.message === "ACCOUNT_BLACKLISTED"
  ) {
    redirect("/api/auth/blacklisted");
  }
}
