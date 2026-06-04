/**
 * Shallow browse navigation — update the `/browse?…` URL WITHOUT a server
 * round-trip. `window.history.pushState` integrates with the Next.js App Router,
 * so `useSearchParams()` in the chrome (BrowseShell) and the listings
 * (ListingsView) both re-render and react to the change — no Vercel function, no
 * full navigation. (Per the Next.js single-page-application guide.)
 *
 * Called only from client components.
 */
export function pushBrowseUrl(href: string, opts?: { scrollTop?: boolean }): void {
  if (typeof window === "undefined") return;
  window.history.pushState(null, "", href);
  if (opts?.scrollTop) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
