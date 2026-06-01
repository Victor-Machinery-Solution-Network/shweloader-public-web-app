import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

type StatusVariant = "new" | "sold" | "rent" | "sale" | "rented";

/**
 * Tiny presentational status pill rendered over a listing photo.
 *
 * Ports the design's `.feat-ribbon` element (homepage ListingCard / ListingRow):
 *   - NEW    → emerald/forest-green via the `--badge-new-*` tokens (dark-mode aware)
 *   - SOLD   → full-saturation red stamp text
 *   - RENTED → full-saturation red stamp text
 *   - SALE   → `.feat-ribbon.sale` gold gradient (CSS class)
 *   - RENT   → `.feat-ribbon.rent` gold gradient (CSS class)
 *
 * Labels are UPPERCASE; the 9999px pill radius comes from `.feat-ribbon`.
 */
const VARIANT_CLASS: Record<StatusVariant, string | undefined> = {
  new: undefined,
  sold: undefined,
  rented: undefined,
  sale: "sale",
  rent: "rent",
};

const VARIANT_LABEL: Record<StatusVariant, string> = {
  new: "NEW",
  sold: "SOLD OUT",
  rented: "RENTED",
  sale: "FOR SALE",
  rent: "FOR RENT",
};

// Inline styles only where the design used them (gradient variants live in CSS).
const VARIANT_STYLE: Record<StatusVariant, CSSProperties | undefined> = {
  new: {
    background: "var(--badge-new-bg)",
    color: "#fff",
    boxShadow: "var(--badge-new-shadow)",
  },
  sold: {
    background: "rgba(220,38,38,0.95)",
    color: "#fff",
    letterSpacing: "0.04em",
  },
  rented: {
    background: "rgba(220,38,38,0.95)",
    color: "#fff",
    letterSpacing: "0.04em",
  },
  sale: undefined,
  rent: undefined,
};

export function StatusPill({ variant }: { variant: StatusVariant }) {
  return (
    <span
      className={cn("feat-ribbon", VARIANT_CLASS[variant])}
      style={VARIANT_STYLE[variant]}
    >
      {VARIANT_LABEL[variant]}
    </span>
  );
}
