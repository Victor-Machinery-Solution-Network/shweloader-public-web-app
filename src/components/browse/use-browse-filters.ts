"use client";

import { useEffect, useState } from "react";
import { parseFilters, type BrowseFilters } from "./filters";

/** Dispatched by `pushBrowseUrl` after a shallow URL change so the filter hook
 *  re-reads the URL (history.pushState doesn't emit `popstate`). */
export const BROWSE_NAV_EVENT = "browse:navigate";

const DEFAULT_FILTERS = parseFilters({});

/**
 * URL-derived browse filters WITHOUT `useSearchParams`.
 *
 * Reading `useSearchParams` during render forces the whole client subtree up to
 * the nearest Suspense boundary to be client-rendered — so the chrome + listings
 * fall behind a Suspense skeleton fallback and a cold/direct load flashes it.
 * This hook avoids that: it returns the DEFAULT on the server and the first client
 * render (so the chrome + baked default listings stay in the static prerender and
 * paint instantly, hydration-safe), then syncs to the real URL AFTER mount and on
 * every shallow nav (`browse:navigate`) + back/forward (`popstate`). Net: no
 * skeleton flash on a direct /browse load; filtering still reacts to the URL.
 */
export function useBrowseFilters(): BrowseFilters {
  const [filters, setFilters] = useState<BrowseFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    const sync = () =>
      setFilters(
        parseFilters(Object.fromEntries(new URLSearchParams(window.location.search))),
      );
    sync(); // pick up the actual URL once hydrated
    window.addEventListener("popstate", sync);
    window.addEventListener(BROWSE_NAV_EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(BROWSE_NAV_EVENT, sync);
    };
  }, []);

  return filters;
}
