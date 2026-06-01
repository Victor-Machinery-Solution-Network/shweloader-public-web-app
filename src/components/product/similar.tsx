"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";

import { ListingCard } from "@/components/shared/listing-card";
import type { Listing } from "@/lib/api/types";

export interface SimilarProps {
  listings: Listing[];
  mode?: "sale" | "rent";
}

/** "You may also like" carousel of related listings with prev/next controls. */
export function Similar({ listings, mode = "sale" }: SimilarProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  if (listings.length === 0) return null;

  const scrollBy = (dir: number) => {
    const grid = gridRef.current;
    if (!grid) return;
    const amount = grid.clientWidth * 0.8 * dir;
    grid.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section className="pdp-similar" data-screen-label="Similar machines">
      <div className="container">
        <div className="pdp-similar-head">
          <div>
            <h2 className="pdp-h2" style={{ marginBottom: 0 }}>
              You may also like
            </h2>
          </div>
          <div className="pdp-similar-nav">
            <button
              type="button"
              className="nav-btn"
              aria-label="Previous"
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
              aria-label="Next"
              onClick={() => scrollBy(1)}
            >
              <ArrowRight className="icon-sm" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="pdp-similar-grid" ref={gridRef}>
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} mode={mode} />
          ))}
        </div>
      </div>
    </section>
  );
}
