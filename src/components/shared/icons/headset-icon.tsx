import type { SVGProps } from "react";

/**
 * Custom headset icon (from the user's headset.svg). Stroke-based with
 * currentColor, so it inherits the surrounding text/button color — drop-in
 * replacement for the lucide Headset.
 */
export function HeadsetIcon({
  size = 24,
  strokeWidth = 2,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4,13 a8,7 0 0 1 16,0" />
      <path d="M5,13 v6 h-1 a2,2 0 0 1 -2,-2 v-2 a2,2 0 0 1 2,-2 z" />
      <path d="M19,13 v6 h1 a2,2 0 0 0 2,-2 v-2 a2,2 0 0 0 -2,-2 z" />
      <path d="M19,19 v1 a3,3 0 0 1 -3,3 h-3" />
    </svg>
  );
}
