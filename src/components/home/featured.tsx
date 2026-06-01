"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ListingCard } from "@/components/shared/listing-card";
import { useI18n } from "@/components/providers/language-provider";
import type { Listing } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Mode = "sale" | "rent";

/**
 * Featured listings — a clean uniform grid of admin-curated cards with a
 * For-sale / For-rent pill switch. Dual-listed machines (`isSale && isRent`)
 * appear in either tab and render in that tab's mode.
 *
 * Ports the design's `Featured` (`.feat-head` / `.feat-switch` / `.feat-grid`
 * in app.css) but delegates each card to the shared `ListingCard`. No listing
 * counts are shown (product rule). Renders nothing without featured listings.
 */
export function Featured({ listings }: { listings: Listing[] }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("sale");
  // Re-mounts the grid on switch so the stagger-in animation replays.
  const [bump, setBump] = useState(0);

  const items = useMemo(
    () => listings.filter((l) => (mode === "rent" ? l.isRent : l.isSale)),
    [listings, mode],
  );

  if (listings.length === 0) return null;

  const switchTo = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setBump((b) => b + 1);
  };

  const viewAllHref = mode === "rent" ? "/browse?mode=rent" : "/browse?mode=sale";

  return (
    <section style={{ padding: "56px 0 0" }}>
      <div className="container">
        <div className="feat-head">
          <div>
            <h2 className="section-title">{t("home.featured")}</h2>
          </div>

          <div
            className="feat-switch"
            role="tablist"
            aria-label="Filter featured listings"
          >
            <span className={cn("feat-switch-glide", mode)} aria-hidden="true" />
            <button
              type="button"
              role="tab"
              aria-selected={mode === "sale"}
              className={cn("feat-switch-btn", mode === "sale" && "is-on")}
              onClick={() => switchTo("sale")}
            >
              {t("home.forSale")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "rent"}
              className={cn("feat-switch-btn", mode === "rent" && "is-on")}
              onClick={() => switchTo("rent")}
            >
              {t("home.forRent")}
            </button>
          </div>
        </div>

        <div key={bump} className="feat-grid feat-grid-4 feat-anim">
          {items.map((listing) => (
            <ListingCard key={listing.id} listing={listing} mode={mode} />
          ))}
        </div>

        <div style={{ marginTop: 32, display: "flex", justifyContent: "center" }}>
          <Link className="btn-link" href={viewAllHref}>
            {t("actions.viewAll")}
            <ArrowRight className="icon-sm" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
