"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileText } from "lucide-react";

import { useI18n } from "@/components/providers/language-provider";

// useLayoutEffect on the client (animate before paint, no flash), useEffect on
// the server (no-op) to avoid React's SSR warning.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface DescriptionProps {
  /** Admin description rendered to sanitized HTML on the server (Markdown). */
  html: string;
  /** Resolved absolute URL to the spec PDF, or null. */
  pdfUrl: string | null;
  /** Filename for the downloaded PDF (e.g. the product title). */
  pdfName?: string;
}

/** Description prose (Markdown → sanitized HTML, clamped with a smooth show-more
 *  animation) + an optional PDF document card. The HTML is sanitized server-side
 *  (see `renderMarkdown`), so there's no markdown/sanitizer code in this bundle. */
export function Description({ html, pdfUrl, pdfName }: DescriptionProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);
  const hasText = html.trim().length > 0;

  // Animate the clamp by transitioning max-height to/from the measured content
  // height (CSS can't transition to/from `none`). Skipped on first render.
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (open) {
      // expand: 8.5em → full content height, then release to `none`
      el.style.maxHeight = el.scrollHeight + "px";
      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName !== "max-height") return;
        el.style.maxHeight = "none";
        el.removeEventListener("transitionend", onEnd);
      };
      el.addEventListener("transitionend", onEnd);
    } else {
      // collapse: pin current full height, reflow, then fall back to the CSS clamp
      el.style.maxHeight = el.scrollHeight + "px";
      void el.offsetHeight; // force reflow so the next change transitions
      requestAnimationFrame(() => {
        el.style.maxHeight = "";
      });
    }
  }, [open]);

  if (!hasText && !pdfUrl) return null;

  return (
    <section className="pdp-section" data-screen-label="Description">
      <h2 className="ov-list-eyebrow pdp-desc-title">
        <FileText className="ov-eyebrow-i" aria-hidden="true" />
        {t("product.description")}
      </h2>

      {hasText && (
        <>
          <div
            ref={ref}
            className={"pdp-desc" + (open ? " is-open" : "")}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <button
            type="button"
            className="pdp-show-more"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            {open ? t("actions.showLess") : t("actions.showMore")}
            <ChevronDown
              className="icon-sm"
              aria-hidden="true"
              style={{
                transform: open ? "rotate(180deg)" : "none",
                transition: "transform .15s",
              }}
            />
          </button>
        </>
      )}

      {pdfUrl && (
        <div className="pdp-doc-card">
          <div className="d-thumb" aria-hidden="true">
            <span className="d-thumb-tag">PDF</span>
          </div>
          <div className="d-body">
            <div className="d-eye">{t("product.documentOnFile")}</div>
            <div className="d-name">{t("product.document")}</div>
            <div className="d-meta">
              <span>PDF</span>
            </div>
          </div>
          <div className="d-actions">
            <a
              className="d-btn d-btn-ghost"
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("actions.preview")}
            </a>
            {/* Same-origin proxy (/api/download) — the `download` attribute is
                ignored on cross-origin links, so linking the R2 asset domain
                directly would just open a tab like Preview does. */}
            <a
              className="d-btn d-btn-primary"
              href={`/api/download?url=${encodeURIComponent(pdfUrl)}${
                pdfName ? `&name=${encodeURIComponent(pdfName)}` : ""
              }`}
            >
              {t("actions.download")}
              <Download className="icon-sm" aria-hidden="true" />
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
