import type { ReactNode } from "react";

/**
 * Presentational empty-state block.
 *
 * Ports the design's `.empty` element (homepage Browse.jsx `EmptyState`):
 *   - `.empty-art`   → circular icon chip; defaults to the design's dashed-circle SVG
 *   - `.empty-title` → headline (required `title`)
 *   - `.empty-sub`   → secondary copy (optional `hint`)
 *   - action area    → optional `action` node (e.g. a "Reset filters" `.empty-cta`)
 *
 * No interactivity of its own — any handlers live inside the passed-in `action`,
 * so this stays a Server Component.
 */
export function EmptyState({
  title,
  hint,
  icon,
  action,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-art">{icon ?? <DefaultArt />}</div>
      <div className="empty-title">{title}</div>
      {hint ? <div className="empty-sub">{hint}</div> : null}
      {action}
    </div>
  );
}

function DefaultArt() {
  return (
    <svg viewBox="0 0 80 80" width="80" height="80" fill="none" aria-hidden="true">
      <circle
        cx="40"
        cy="40"
        r="36"
        stroke="var(--m-gold-soft)"
        strokeWidth="2"
        strokeDasharray="3 4"
      />
      <path
        d="M28 44 Q40 30 52 44"
        stroke="var(--m-gold)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="32" cy="34" r="2" fill="var(--m-ink)" />
      <circle cx="48" cy="34" r="2" fill="var(--m-ink)" />
    </svg>
  );
}
