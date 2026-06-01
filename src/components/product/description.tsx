"use client";

import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";

import { toPlainText } from "@/lib/utils";

export interface DescriptionProps {
  /** Raw markdown/plain description from the admin. */
  text: string | null;
  /** Resolved absolute URL to the spec PDF, or null. */
  pdfUrl: string | null;
}

/**
 * Split a markdown/plain description into clean paragraphs. We render as
 * structured plain text (no HTML injection) so the content is XSS-safe without
 * a sanitizer dependency — markdown markers are stripped per paragraph.
 */
function toParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => toPlainText(block))
    .filter(Boolean);
}

/** Description prose (clamped with show-more) + optional PDF document card. */
export function Description({ text, pdfUrl }: DescriptionProps) {
  const [open, setOpen] = useState(false);
  const paragraphs = text ? toParagraphs(text) : [];

  if (paragraphs.length === 0 && !pdfUrl) return null;

  return (
    <section className="pdp-section" data-screen-label="Description">
      <h2 className="pdp-h2">Description</h2>

      {paragraphs.length > 0 && (
        <>
          <div className={"pdp-desc" + (open ? " is-open" : "")}>
            {paragraphs.map((p, i) => (
              <p key={i} style={i > 0 ? { marginTop: "1em" } : undefined}>
                {p}
              </p>
            ))}
          </div>
          <button
            type="button"
            className="pdp-show-more"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            {open ? "Show less" : "Show more"}
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
            <div className="d-eye">Document on file</div>
            <div className="d-name">Specification document</div>
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
              Preview
            </a>
            <a
              className="d-btn d-btn-primary"
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
            >
              Download
              <Download className="icon-sm" aria-hidden="true" />
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
