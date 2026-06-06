import type { SVGProps } from "react";

/**
 * "Share / forward" arrow matching the stakeholder reference: a solid
 * right-pointing arrowhead with a curved tail hooking up from the lower-left.
 *
 * lucide-react has no equivalent (`Forward` is an open chevron with a squared
 * tail; `Share`/`Share2` are the iOS-box / node-graph glyphs), so this is a
 * small custom icon. Size + colour come from the caller (`className="icon-sm"`,
 * `currentColor`); the head is filled, the tail is stroked.
 */
export function ShareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* curved tail */}
      <path d="M5 19c0-6 5-7 13-7" />
      {/* solid arrowhead pointing right */}
      <path d="M16 8l5 4-5 4z" fill="currentColor" />
    </svg>
  );
}
