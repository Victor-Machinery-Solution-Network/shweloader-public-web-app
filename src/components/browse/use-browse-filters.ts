"use client";

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { parseFilters, type BrowseFilters } from "./filters";

/** Dispatched by `pushBrowseUrl` after a shallow URL change so the filter hook
 *  re-reads the URL (history.pushState doesn't emit `popstate`). */
export const BROWSE_NAV_EVENT = "browse:navigate";

const DEFAULT_FILTERS = parseFilters({});

interface BrowseBase {
  /** Pathname this baseline belongs to (e.g. "/bulldozers/for-sale"). */
  path: string;
  /** Raw filter params the page pre-applies (category/sub/mode). */
  raw: Record<string, string>;
}

/**
 * Category landing pages (/bulldozers/for-sale) render the full browse
 * experience with a pre-applied filter baseline. The provider carries that
 * baseline so `useBrowseFilters` starts from it (matching the server-rendered
 * filtered listings) instead of the unfiltered default.
 */
const BrowseBaseContext = createContext<BrowseBase | null>(null);

export function BrowseBaseProvider({
  path,
  raw,
  children,
}: BrowseBase & { children: ReactNode }) {
  const value = useMemo(() => ({ path, raw }), [path, raw]);
  return createElement(BrowseBaseContext.Provider, { value }, children);
}

/**
 * URL-derived browse filters WITHOUT `useSearchParams`.
 *
 * Reading `useSearchParams` during render forces the whole client subtree up to
 * the nearest Suspense boundary to be client-rendered — so the chrome + listings
 * fall behind a Suspense skeleton fallback and a cold/direct load flashes it.
 * This hook avoids that: it returns the page baseline on the server and the first
 * client render (the unfiltered default on /browse, the pre-applied category on
 * landing pages — so the chrome + baked listings stay in the static prerender and
 * paint instantly, hydration-safe), then syncs to the real URL AFTER mount and on
 * every shallow nav (`browse:navigate`) + back/forward (`popstate`).
 *
 * Sync rules with a baseline: while the pathname is still the landing page's
 * own path, URL params merge OVER the baseline (so /bulldozers/for-sale?brand=X
 * means bulldozers AND brand X); once shallow nav moves to /browse, the URL is
 * the complete filter state (chrome hrefs always carry the full state).
 */
export function useBrowseFilters(): BrowseFilters {
  const base = useContext(BrowseBaseContext);
  const baseline = useMemo(
    () => (base ? parseFilters(base.raw) : DEFAULT_FILTERS),
    [base],
  );
  const [filters, setFilters] = useState<BrowseFilters>(baseline);

  useEffect(() => {
    const sync = () => {
      const urlParams = Object.fromEntries(
        new URLSearchParams(window.location.search),
      );
      const onOwnPath = base && window.location.pathname === base.path;
      setFilters(
        parseFilters(onOwnPath ? { ...base.raw, ...urlParams } : urlParams),
      );
    };
    sync(); // pick up the actual URL once hydrated
    window.addEventListener("popstate", sync);
    window.addEventListener(BROWSE_NAV_EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(BROWSE_NAV_EVENT, sync);
    };
  }, [base]);

  return filters;
}
