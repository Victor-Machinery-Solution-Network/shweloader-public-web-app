import { BROWSE_NAV_EVENT } from "./use-browse-filters";

/**
 * Shallow browse navigation — update the `/browse?…` URL WITHOUT a server
 * round-trip or a full navigation, then notify the filter hook so the chrome +
 * listings re-read the URL. We use `history.pushState` (no Vercel function) plus
 * a `browse:navigate` event because pushState doesn't fire `popstate`.
 *
 * Called only from client components.
 */
export function pushBrowseUrl(href: string, opts?: { scrollTop?: boolean }): void {
  if (typeof window === "undefined") return;
  window.history.pushState(null, "", href);
  window.dispatchEvent(new Event(BROWSE_NAV_EVENT));
  if (opts?.scrollTop) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
