"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  /** Current 1-based page. */
  page: number;
  /** Total number of pages (≥1). */
  totalPages: number;
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
 * Page numbers to render: always the first and last page, plus a window around
 * the current one, with "…" filling any gap. e.g. page 5 of 10 →
 * [1, …, 4, 5, 6, …, 10]; ≤7 pages shows them all with no ellipsis.
 */
function pageItems(page: number, totalPages: number): (number | "ellipsis")[] {
  const WINDOW = 1; // pages shown on each side of the current page
  const out: (number | "ellipsis")[] = [];
  let prev = 0;
  for (let p = 1; p <= totalPages; p++) {
    if (
      p === 1 ||
      p === totalPages ||
      (p >= page - WINDOW && p <= page + WINDOW)
    ) {
      if (prev && p - prev > 1) out.push("ellipsis");
      out.push(p);
      prev = p;
    }
  }
  return out;
}

/**
 * Numbered Prev · 1 2 … N · Next control for Browse-style listings. The total
 * page count comes from the API's `X-Total-Count` (Saved: matched length), so we
 * can render real page numbers, not just prev/next.
 */
export function Pagination({
  page,
  totalPages,
  hrefForPage,
  onNavigate,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

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
        {pageItems(page, totalPages).map((it, i) =>
          it === "ellipsis" ? (
            <span key={`e${i}`} className="pgn-ell" aria-hidden="true">
              …
            </span>
          ) : it === page ? (
            <span key={it} className={cn("pgn-num", "is-on")} aria-current="page">
              {it}
            </span>
          ) : (
            <Link
              key={it}
              className="pgn-num"
              href={hrefForPage(it)}
              aria-label={`Page ${it}`}
              onClick={handleClick(it)}
            >
              {it}
            </Link>
          ),
        )}
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
