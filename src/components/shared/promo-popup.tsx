"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { assetUrl } from "@/lib/assets";

const PROMO_KEY = "shweloader.promo.dismissedAt";
const PROMO_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const OPEN_DELAY_MS = 1200;

/**
 * Admin-configured launch-offer popup. The endpoint that supplies this data is
 * not wired yet, so `promo` is optional — when absent (or missing an image) the
 * component renders nothing. The image *is* the popup (no copy), with an
 * optional click-through link and an optional admin call-to-action button.
 */
export interface Promo {
  /** R2 image key or absolute URL of the promo artwork. */
  image: string;
  /** Optional click-through URL for the image + CTA. */
  link?: string | null;
  /** Optional alt text for the artwork. */
  alt?: string | null;
  /** Optional admin call-to-action button overlaid on the image. */
  cta?: { label: string; href?: string | null } | null;
}

export interface PromoPopupProps {
  promo?: Promo | null;
  /** Bump to force a re-open (e.g. preview/replay in admin). */
  replayKey?: string | number;
}

/** Read the last-dismissed timestamp; 0 if unset/unreadable. */
function readDismissedAt(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(PROMO_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function PromoPopup({ promo, replayKey }: PromoPopupProps) {
  const [open, setOpen] = useState(false);
  const [fallback, setFallback] = useState(false);

  const imageSrc = promo?.image ? assetUrl(promo.image) : null;
  const hasPromo = Boolean(imageSrc);

  // Auto-open after the landing delay, unless still within the cooldown window.
  useEffect(() => {
    if (!hasPromo) return;
    const replay = replayKey !== undefined;
    if (!replay && Date.now() - readDismissedAt() < PROMO_COOLDOWN_MS) return;
    const t = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    return () => clearTimeout(t);
  }, [hasPromo, replayKey]);

  const dismiss = useCallback(() => {
    setOpen(false);
    try {
      window.localStorage.setItem(PROMO_KEY, String(Date.now()));
    } catch {
      // Ignore storage write failures (private mode / quota).
    }
  }, []);

  // ESC to dismiss while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  if (!hasPromo || !open) return null;

  const link = promo?.link || "#";
  const cta = promo?.cta;

  return (
    <div className="pp-backdrop" onClick={dismiss}>
      <div
        className="pp-image-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Promotion"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="pp-close" onClick={dismiss} aria-label="Close">
          <X aria-hidden="true" />
        </button>
        <a
          href={link}
          className={"pp-image-link" + (fallback ? " is-fallback" : "")}
          onClick={dismiss}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- intrinsic
              height:auto sizing + onError fallback the design relies on. */}
          <img
            src={imageSrc as string}
            alt={promo?.alt || "Promotion"}
            className="pp-image"
            onError={() => setFallback(true)}
          />
          <div className="pp-image-fallback" aria-hidden="true">
            <div className="pp-fallback-eyebrow">PROMO BANNER</div>
            <div className="pp-fallback-title">Admin-uploaded image</div>
            <div className="pp-fallback-sub">600 × 800 recommended</div>
          </div>
        </a>
        {cta?.label && (
          <a href={cta.href || link} className="pp-cta pp-image-cta" onClick={dismiss}>
            {cta.label}
            <ArrowRight className="icon-sm" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}

export default PromoPopup;
