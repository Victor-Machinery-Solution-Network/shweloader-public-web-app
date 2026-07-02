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
  title: ReactNode;
  hint?: ReactNode;
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
    <svg viewBox="0 0 120 120" width="120" height="120" fill="none" aria-hidden="true">
      {/* Ground shadow & ambient track */}
      <ellipse cx="60" cy="92" rx="45" ry="3" fill="var(--m-gold)" opacity="0.1" />
      <path d="M 10 92 L 110 92" stroke="var(--m-gold-soft)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 6" />

      {/* Engine & Cab Silhouette */}
      <path 
        d="M 25 75 L 25 55 L 40 55 L 40 45 C 40 40 45 38 52 38 L 60 38 C 65 38 68 42 68 48 L 68 75 Z" 
        fill="var(--m-gold)" 
        opacity="0.1" 
      />
      <path 
        d="M 25 75 L 25 55 L 40 55 L 40 45 C 40 40 45 38 52 38 L 60 38 C 65 38 68 42 68 48 L 68 75" 
        stroke="var(--m-gold)" 
        strokeWidth="2.5" 
        strokeLinejoin="round" 
        strokeLinecap="round" 
      />
      
      {/* Sleek Exhaust Pipe */}
      <path d="M 32 55 L 32 42" stroke="var(--m-gold)" strokeWidth="2.5" strokeLinecap="round" />

      {/* Cab Window (Frames the glass) */}
      <path d="M 50 38 L 50 52 L 68 52" stroke="var(--m-gold)" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Hydraulic Lift Cylinder */}
      <path d="M 60 70 L 78 62" stroke="var(--m-gold)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

      {/* Sweeping, Elegant Loader Arm */}
      <path d="M 65 60 Q 80 50, 90 75" stroke="var(--m-gold)" strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* The Bucket */}
      <path 
        d="M 90 75 L 82 62 L 102 62 L 98 85 L 88 85 Z" 
        stroke="var(--m-gold)" 
        strokeWidth="2.5" 
        strokeLinejoin="round" 
        fill="var(--m-bg-2)" 
      />
      {/* Tiny bucket tooth detail */}
      <path d="M 102 62 L 105 65" stroke="var(--m-gold)" strokeWidth="2" strokeLinecap="round" />

      {/* Back Wheel */}
      <circle cx="35" cy="80" r="12" stroke="var(--m-gold)" strokeWidth="3" fill="var(--m-bg-2)" />
      <circle cx="35" cy="80" r="5" stroke="var(--m-gold)" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.6" />
      <circle cx="35" cy="80" r="2" fill="var(--m-gold)" />

      {/* Front Wheel */}
      <circle cx="60" cy="80" r="12" stroke="var(--m-gold)" strokeWidth="3" fill="var(--m-bg-2)" />
      <circle cx="60" cy="80" r="5" stroke="var(--m-gold)" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.6" />
      <circle cx="60" cy="80" r="2" fill="var(--m-gold)" />

      {/* The Question Mark (Resting perfectly inside the bucket) */}
      <path 
        d="M 87 40 C 87 30, 97 30, 97 40 C 97 47, 92 49, 92 53" 
        stroke="var(--m-ink)" 
        strokeWidth="3.5" 
        strokeLinecap="round" 
        fill="none" 
      />
      <circle cx="92" cy="60" r="2.5" fill="var(--m-ink)" />

      {/* Sparkling details for premium feel */}
      <path d="M 100 35 Q 100 40 105 40 Q 100 40 100 45 Q 100 40 95 40 Q 100 40 100 35" fill="var(--m-gold)" />
      <circle cx="78" cy="30" r="1.5" fill="var(--m-gold)" opacity="0.5" />
      <circle cx="20" cy="40" r="1" fill="var(--m-gold)" opacity="0.7" />
    </svg>
  );
}
