import type { SVGProps } from "react";

/**
 * "Share right" arrow — the `shareright-o` glyph (an outlined arrow curving up
 * and to the right). Inlined locally rather than hotlinked so there's no
 * third-party request. Filled with evenodd so the inner cut reads as an outline;
 * size + colour come from the caller (`className`, `currentColor`).
 */
export function ShareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.73698 2.97707C7.73698 2.10483 8.7757 1.65068 9.41602 2.24298L14.8464 7.26604C15.2743 7.66188 15.2743 8.33838 14.8464 8.73423L9.41602 13.7573C8.7757 14.3496 7.73698 13.8954 7.73698 13.0232L7.73698 10.8367C5.1846 10.8707 3.87818 11.1716 3.10043 11.6305C2.33957 12.0795 2.02558 12.7075 1.53314 13.6925L1.51753 13.7237C1.41382 13.9311 1.18112 14.04 0.955436 13.9868C0.729751 13.9335 0.570312 13.732 0.570312 13.5001C0.570312 10.7127 0.923982 8.61553 2.07865 7.21632C3.23196 5.81875 5.07864 5.23548 7.73698 5.17257V2.97707ZM14.1673 8.00013L8.73698 2.97707V5.33347C8.73698 5.80105 8.35536 6.16226 7.90885 6.16937C5.26091 6.21148 3.74194 6.77188 2.84993 7.85281C2.1706 8.67602 1.7938 9.86948 1.6454 11.5655C1.8981 11.269 2.20244 10.9993 2.59226 10.7693C3.63011 10.1569 5.20876 9.85801 7.89596 9.83491C8.35407 9.83097 8.73698 10.2011 8.73698 10.6668L8.73698 13.0232L14.1673 8.00013Z"
      />
    </svg>
  );
}
