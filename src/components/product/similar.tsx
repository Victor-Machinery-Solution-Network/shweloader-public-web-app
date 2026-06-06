"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";

import { ListingCard } from "@/components/shared/listing-card";
import { useI18n } from "@/components/providers/language-provider";
import type { Listing } from "@/lib/api/types";

export interface SimilarProps {
  listings: Listing[];
  mode?: "sale" | "rent";
}

/** "You may also like" carousel of related listings with prev/next controls. */
export function Similar({ listings, mode = "sale" }: SimilarProps) {
  const { t } = useI18n();
  const gridRef = useRef<HTMLDivElement>(null);

  if (listings.length === 0) return null;

  const scrollBy = (dir: number) => {
    const grid = gridRef.current;
    if (!grid) return;
    // Scroll roughly one "page" of 4 cards (the grid is now full-bleed, so
    // clientWidth is the whole viewport — don't page by that).
    const card = grid.firstElementChild as HTMLElement | null;
    const step = card ? (card.offsetWidth + 16) * 4 : grid.clientWidth * 0.6;
    grid.scrollBy({ left: step * dir, behavior: "smooth" });
  };

  return (
    <section className="pdp-similar" data-screen-label="Similar machines">
      <div className="container">
        <div className="pdp-similar-head">
          <div>
            <h2 className="pdp-h2" style={{ marginBottom: 0 }}>
              {t("product.similar")}
            </h2>
          </div>
          {listings.length > 4 && (
            <div className="pdp-similar-nav">
              <button
                type="button"
                className="nav-btn"
                aria-label={t("product.prev")}
                onClick={() => scrollBy(-1)}
              >
                <ArrowRight
                  className="icon-sm"
                  aria-hidden="true"
                  style={{ transform: "rotate(180deg)" }}
                />
              </button>
              <button
                type="button"
                className="nav-btn"
                aria-label={t("product.next")}
                onClick={() => scrollBy(1)}
              >
                <ArrowRight className="icon-sm" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="pdp-similar-grid" ref={gridRef}>
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} mode={mode} />
        ))}
      </div>
    </section>
  );
}
