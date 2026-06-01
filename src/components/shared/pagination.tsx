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
  /** Builds the href for a given page number (preserves existing query params). */
  makeHref: (page: number) => string;
}

/**
 * Prev / current-page / Next control for Browse-style listings.
 *
 * The upstream API exposes no total count, so there is no last page and no
 * numbered range — we only know whether a previous and next page exist. The
 * markup reuses the design's `.pgn` / `.pgn-btn` / `.pgn-list` / `.pgn-num`
 * classes (browse.css); the single visible number is the current page, styled
 * with `.is-on`. Disabled edges render as inert `<span>`s (Next.js Link needs a
 * destination), mirroring the `.pgn-btn:disabled` dimming the CSS gives buttons.
 */
export function Pagination({ page, hasPrev, hasNext, makeHref }: PaginationProps) {
  // Nothing to page through.
  if (!hasPrev && !hasNext) return null;

  return (
    <nav className="pgn" aria-label="Pagination">
      {hasPrev ? (
        <Link className="pgn-btn" href={makeHref(page - 1)} rel="prev" aria-label="Previous page">
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
        <Link className="pgn-btn" href={makeHref(page + 1)} rel="next" aria-label="Next page">
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
