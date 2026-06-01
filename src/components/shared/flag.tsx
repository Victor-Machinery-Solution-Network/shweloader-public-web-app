import type { Locale } from "@/lib/i18n";

/**
 * Inline flag glyphs for the language switch. Myanmar = yellow/green/red stripes
 * with a white five-point star; "en" = a simplified Union Jack. Mirrors the
 * design prototype's <Flag/> exactly (markup + inline svg attributes).
 */
export function Flag({ code }: { code: Locale }) {
  const style = {
    display: "block" as const,
    borderRadius: 2,
    boxShadow: "0 0 0 1px rgba(0,0,0,.08)",
  };
  if (code === "my") {
    return (
      <svg
        viewBox="0 0 60 36"
        width="20"
        height="14"
        aria-hidden="true"
        style={style}
      >
        <rect width="60" height="12" y="0" fill="#FECB00" />
        <rect width="60" height="12" y="12" fill="#34B233" />
        <rect width="60" height="12" y="24" fill="#EA2839" />
        <path
          fill="#fff"
          d="M30,5 L32.92,13.98 L42.36,13.98 L34.73,19.54 L37.64,28.52 L30,22.97 L22.36,28.52 L25.27,19.54 L17.64,13.98 L27.08,13.98 Z"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 60 36"
      width="20"
      height="14"
      aria-hidden="true"
      style={style}
    >
      <clipPath id="uk-tri">
        <path d="M30,18 L60,0 L60,18 L30,18 L60,36 L30,36 L30,18 L0,36 L0,18 L30,18 L0,0 L30,0 Z" />
      </clipPath>
      <rect width="60" height="36" fill="#012169" />
      <path d="M0,0 L60,36 M60,0 L0,36" stroke="#fff" strokeWidth="7" />
      <path
        d="M0,0 L60,36 M60,0 L0,36"
        stroke="#C8102E"
        strokeWidth="4"
        clipPath="url(#uk-tri)"
      />
      <path d="M30,0 V36 M0,18 H60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 V36 M0,18 H60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}
