"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  /** Current 1-based page. */
  page: number;
  /** Whether a previous page exists. */
  hasPrev: boolean;
  /** Whether a next page exists. */
  hasNext: boolean;
  /** Build the real `href` for a target page (kept for crawlers + middle-click).
   *  Provided by the caller so this component reads no `useSearchParams` — that
   *  would pull the whole browse subtree out of the static prerender. */
  hrefForPage: (page: number) => string;
  /**
   * When provided, a plain left-click does a shallow client swap (the caller
   * updates the URL + fetches client-side) instead of a full navigation;
   * modifier-/middle-clicks still follow the real `href`.
   */
  onNavigate?: (page: number) => void;
}

/**
 * Prev / current-page / Next control for Browse-style listings.
 *
 * The upstream API exposes no total count, so there is no last page and no
 * numbered range — we only know whether a previous and next page exist. Markup
 * reuses the design's `.pgn` / `.pgn-btn` / `.pgn-list` / `.pgn-num`.
 */
export function Pagination({
  page,
  hasPrev,
  hasNext,
  hrefForPage,
  onNavigate,
}: PaginationProps) {
  if (!hasPrev && !hasNext) return null;

  // Intercept only plain left-clicks so modifier-clicks / middle-click still
  // open in a new tab via the real href.
  const handleClick =
    (targetPage: number) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!onNavigate) return;
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      e.preventDefault();
      onNavigate(targetPage);
    };

  return (
    <nav className="pgn" aria-label="Pagination">
      {hasPrev ? (
        <Link
          className="pgn-btn"
          href={hrefForPage(page - 1)}
          rel="prev"
          aria-label="Previous page"
          onClick={handleClick(page - 1)}
        >
          <ArrowRight
            className="icon-sm"
            strokeWidth={1.75}
            style={{ transform: "rotate(180deg)" }}
            aria-hidden="true"
          />
          Prev
        </Link>
      ) : (
        <span className="pgn-btn" aria-disabled="true" style={{ opacity: 0.4 }}>
          <ArrowRight
            className="icon-sm"
            strokeWidth={1.75}
            style={{ transform: "rotate(180deg)" }}
            aria-hidden="true"
          />
          Prev
        </span>
      )}

      <div className="pgn-list">
        <span className={cn("pgn-num", "is-on")} aria-current="page">
          {page}
        </span>
      </div>

      {hasNext ? (
        <Link
          className="pgn-btn"
          href={hrefForPage(page + 1)}
          rel="next"
          aria-label="Next page"
          onClick={handleClick(page + 1)}
        >
          Next
          <ArrowRight className="icon-sm" strokeWidth={1.75} aria-hidden="true" />
        </Link>
      ) : (
        <span className="pgn-btn" aria-disabled="true" style={{ opacity: 0.4 }}>
          Next
          <ArrowRight className="icon-sm" strokeWidth={1.75} aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
