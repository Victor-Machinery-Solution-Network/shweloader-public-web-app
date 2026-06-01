"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  /** Current 1-based page. */
  page: number;
  /** Whether a previous page exists. */
  hasPrev: boolean;
  /** Whether a next page exists. */
  hasNext: boolean;
}

/**
 * Prev / current-page / Next control for Browse-style listings.
 *
 * The upstream API exposes no total count, so there is no last page and no
 * numbered range — we only know whether a previous and next page exist. Hrefs
 * are built from the CURRENT URL (preserving every active filter, changing only
 * `page`) on the client, so no function prop crosses the server→client boundary.
 * Markup reuses the design's `.pgn` / `.pgn-btn` / `.pgn-list` / `.pgn-num`.
 */
export function Pagination({ page, hasPrev, hasNext }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!hasPrev && !hasNext) return null;

  const hrefForPage = (p: number) => {
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    if (p <= 1) sp.delete("page");
    else sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <nav className="pgn" aria-label="Pagination">
      {hasPrev ? (
        <Link
          className="pgn-btn"
          href={hrefForPage(page - 1)}
          rel="prev"
          aria-label="Previous page"
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
