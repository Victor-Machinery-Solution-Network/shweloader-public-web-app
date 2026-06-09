"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { StatusPill } from "@/components/shared/status-pill";
import { useI18n } from "@/components/providers/language-provider";
import { assetUrl, focalPosition } from "@/lib/assets";
import { HERO_IMAGE_SIZES, HERO_BLUR_DATA_URL } from "@/lib/hero-image";
import type { ListingImage } from "@/lib/api/types";

/** Thumbnail strip caps at 2 rows on desktop (7 cols × 2); extra photos collapse
 *  behind a "+N" tile on the last slot that expands the strip when clicked. */
const MAX_VISIBLE_THUMBS = 14;
/** Desktop switches to a PropertyGuru-style hero + 2×2 thumbnail collage once
 *  there are enough photos to fill the four tiles. */
const COLLAGE_TILES = 4;

export interface GalleryProps {
  images: ListingImage[];
  title: string;
  /** Show the NEW pill (condition === "new"). */
  isNew?: boolean;
  /** Dim the photo + overlay the sold/rented stamp. */
  isSold?: boolean;
  isRented?: boolean;
}

interface Resolved {
  hero: string | null;
  thumb: string | null;
  focalX: number;
  focalY: number;
}

function resolve(img: ListingImage): Resolved {
  return {
    hero: assetUrl(img.url ?? img.thumbUrl),
    thumb: assetUrl(img.thumbUrl ?? img.url),
    focalX: img.focalX,
    focalY: img.focalY,
  };
}

/** Hero photo with a desktop 2×2 thumbnail collage (PropertyGuru-style) and a
 *  horizontal thumbnail strip on smaller screens; clicking "Show all" opens a
 *  full-screen lightbox. */
export function Gallery({
  images,
  title,
  isNew,
  isSold,
  isRented,
}: GalleryProps) {
  const { t } = useI18n();
  const photos = images.map(resolve).filter((p) => p.hero);
  const [active, setActive] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  // The lightbox tracks its own index, independent of the in-page hero — so
  // clicking a thumbnail opens the viewer at that photo without ever switching
  // the primary image behind it.
  const [lbIndex, setLbIndex] = useState(0);
  // Touch-gesture state kept in refs (not React state) so a swipe never forces a
  // re-render mid-gesture. Declared before the early return to keep hook order
  // stable. `lastTouchEnd` lets onClick ignore the synthetic click that trails a
  // tap (which is already handled in onTouchEnd).
  const heroTouch = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const lbTouch = useRef<{ x: number; y: number } | null>(null);
  const lastTouchEnd = useRef(0);

  const total = photos.length;
  const idx = Math.min(active, Math.max(total - 1, 0));
  const lbIdx = Math.min(lbIndex, Math.max(total - 1, 0));

  // Lightbox: lock body scroll + wire Esc / arrow keys while open.
  useEffect(() => {
    if (!lightbox) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      else if (e.key === "ArrowLeft")
        setLbIndex((a) => (a - 1 + total) % total);
      else if (e.key === "ArrowRight") setLbIndex((a) => (a + 1) % total);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, total]);

  if (total === 0) {
    return (
      <div className="pdp-gallery">
        <div
          className="g-hero"
          style={{ background: "var(--m-bg-2)" }}
          aria-label={title}
        />
      </div>
    );
  }

  const dimmed = isSold || isRented;
  const go = (delta: number) => setActive((a) => (a + delta + total) % total);
  // Lightbox navigation + opener — separate from the hero so the primary image
  // never changes when a thumbnail is clicked.
  const goLb = (delta: number) => setLbIndex((a) => (a + delta + total) % total);
  const openLightbox = (i: number) => {
    setLbIndex(i);
    setLightbox(true);
  };

  // All photos are rendered as persistent stacked layers; only the active one is
  // opaque. Swapping just transitions opacity between two already-decoded images
  // — a true, jank-free cross-fade (no remount / re-decode). The initial active
  // layer renders at opacity 1 with no transition, so the hero (LCP) paints
  // immediately.
  const layer = (p: Resolved, i: number) =>
    p.hero ? (
      <div
        key={i}
        className={"g-hero-img" + (i === idx ? " is-active" : "")}
        aria-hidden={i !== idx}
      >
        <Image
          src={p.hero}
          alt={i === idx ? `${title} — ${t("product.photo")} ${idx + 1}` : ""}
          fill
          // First photo = priority (LCP); the rest load eagerly so swapping is a
          // smooth opacity cross-fade between already-decoded images (lazy ones
          // weren't preloading, which made the fade janky).
          priority={i === 0}
          loading={i === 0 ? undefined : "eager"}
          sizes={HERO_IMAGE_SIZES}
          // Neutral warm-panel placeholder so a cold load never shows a blank
          // frame; the full image fades in over it (and is usually pre-warmed by
          // the listing's intent-preload, so this rarely shows for long).
          placeholder="blur"
          blurDataURL={HERO_BLUR_DATA_URL}
          style={{
            objectFit: "contain",
            objectPosition: focalPosition(p.focalX, p.focalY),
            opacity: dimmed ? 0.6 : 1,
            filter: dimmed ? "saturate(0.7)" : undefined,
          }}
        />
      </div>
    ) : null;

  // Desktop collage: the hero plus up to 4 *other* photos as a side grid that
  // adapts to 1–4 thumbnails (so a 2- or 3-photo listing still looks intentional,
  // not a giant letterbox + tiny strip). When more photos exist than fit, the
  // last tile becomes a "+N / Show all" lightbox trigger.
  const sideThumbs = photos.slice(1, 1 + COLLAGE_TILES); // photos after the hero
  const useCollage = sideThumbs.length >= 1; // total >= 2
  const collageHidden = total - 1 - sideThumbs.length; // photos beyond hero + shown

  // Cap the strip (smaller screens); last visible slot becomes a "+N" expander.
  const overflow = !showAll && total > MAX_VISIBLE_THUMBS;
  const visibleThumbs = overflow ? photos.slice(0, MAX_VISIBLE_THUMBS) : photos;
  const stripHidden = total - MAX_VISIBLE_THUMBS;

  // ── Touch gestures (mobile) ─────────────────────────────────────
  // Swipe the hero left/right to change photo; a plain tap opens the same
  // full-screen lightbox desktop gets on click. A horizontal drag past
  // SWIPE_MIN counts as a swipe; anything smaller (that didn't move) is a tap.
  const SWIPE_MIN = 40;
  const onHeroTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    heroTouch.current = { x: t.clientX, y: t.clientY, moved: false };
  };
  const onHeroTouchMove = (e: React.TouchEvent) => {
    const g = heroTouch.current;
    if (!g) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - g.x) > 8 || Math.abs(t.clientY - g.y) > 8)
      g.moved = true;
  };
  const onHeroTouchEnd = (e: React.TouchEvent) => {
    const g = heroTouch.current;
    heroTouch.current = null;
    lastTouchEnd.current = Date.now();
    if (!g) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - g.x;
    const dy = t.clientY - g.y;
    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1); // horizontal swipe → change photo
    } else if (!g.moved && !(e.target as HTMLElement).closest("button")) {
      openLightbox(idx); // tap (not on a nav arrow) → full-screen preview
    }
  };
  const onHeroClick = () => {
    // Suppress the synthetic click that trails a touch tap (handled above).
    if (Date.now() - lastTouchEnd.current < 600) return;
    // Pointer/desktop collage: clicking the primary image opens the lightbox.
    if (
      useCollage &&
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 769px)").matches
    ) {
      openLightbox(idx);
    }
  };
  // Lightbox: swipe to move between photos (arrows + keys still work).
  const onLbTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    lbTouch.current = { x: t.clientX, y: t.clientY };
  };
  const onLbTouchEnd = (e: React.TouchEvent) => {
    const g = lbTouch.current;
    lbTouch.current = null;
    if (!g) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - g.x;
    const dy = t.clientY - g.y;
    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy))
      goLb(dx < 0 ? 1 : -1);
  };

  return (
    <div className="pdp-gallery">
      <div className="g-stage">
        <div
          className="g-hero"
          onClick={onHeroClick}
          onTouchStart={onHeroTouchStart}
          onTouchMove={onHeroTouchMove}
          onTouchEnd={onHeroTouchEnd}
        >
          {photos.map((p, i) => layer(p, i))}

          {isNew && !dimmed && (
            <span style={{ position: "absolute", top: 14, left: 14, zIndex: 2 }}>
              <StatusPill variant="new" />
            </span>
          )}
          {isSold && (
            <span style={{ position: "absolute", top: 14, left: 14, zIndex: 4 }}>
              <StatusPill variant="sold" />
            </span>
          )}
          {isRented && !isSold && (
            <span style={{ position: "absolute", top: 14, left: 14, zIndex: 4 }}>
              <StatusPill variant="rented" />
            </span>
          )}
          {dimmed && (
            <Image
              className="feat-stamp-sold"
              src="/brand/sold-out-stamp.png"
              alt={isRented ? t("product.rented") : t("product.soldOut")}
              width={240}
              height={240}
            />
          )}

          {total > 1 && (
            <>
              <button
                type="button"
                className="g-nav g-prev"
                onClick={() => go(-1)}
                aria-label={t("product.prevPhoto")}
              >
                <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                  <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                className="g-nav g-next"
                onClick={() => go(1)}
                aria-label={t("product.nextPhoto")}
              >
                <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}

          <div className="g-bar">
            <span className="g-counter tnum">
              {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Desktop-only side collage (hidden < 1025px). Adapts to 1–4 thumbs. */}
        {useCollage && (
          <div
            className={`g-collage g-collage--${sideThumbs.length}`}
            aria-hidden="true"
          >
            {sideThumbs.map((p, i) => {
              const photoIndex = i + 1; // sideThumbs[0] is photos[1]
              const isMore = collageHidden > 0 && i === sideThumbs.length - 1;
              return (
                <button
                  key={photoIndex}
                  type="button"
                  className={"g-tile" + (isMore ? " g-tile-more" : "")}
                  onClick={() => openLightbox(photoIndex)}
                  aria-label={
                    isMore
                      ? t("product.showAllPhotos")
                      : `${t("product.photo")} ${photoIndex + 1}`
                  }
                >
                  {p.thumb && (
                    <Image
                      src={p.thumb}
                      alt=""
                      fill
                      sizes="(min-width: 769px) 300px, 1px"
                      style={{
                        objectFit: "contain",
                        objectPosition: focalPosition(p.focalX, p.focalY),
                        opacity: dimmed ? 0.6 : 1,
                        filter: dimmed ? "saturate(0.7)" : undefined,
                      }}
                    />
                  )}
                  {/* Sold/rented stamp on every collage tile too (the "+N more"
                      tile keeps its own overlay instead). */}
                  {dimmed && !isMore && (
                    <Image
                      className="feat-stamp-sold"
                      src="/brand/sold-out-stamp.png"
                      alt=""
                      width={240}
                      height={240}
                    />
                  )}
                  {isMore && (
                    <span className="g-tile-overlay">
                      <span className="g-tile-num tnum">+{collageHidden}</span>
                      <span className="g-tile-cta">
                        {t("product.showAllPhotos")}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Horizontal strip — primary on phones/tablets; hidden on desktop when the
          collage is shown. */}
      {total > 1 && (
        <div className="g-strip" role="tablist" aria-label={t("product.thumbnails")}>
          {visibleThumbs.map((p, i) => {
            const isMore = overflow && i === MAX_VISIBLE_THUMBS - 1;
            return (
              <button
                key={i}
                type="button"
                className={
                  "g-mini" +
                  (i === idx ? " is-on" : "") +
                  (isMore ? " g-mini-more" : "")
                }
                onClick={() => (isMore ? setShowAll(true) : setActive(i))}
                role={isMore ? undefined : "tab"}
                aria-selected={isMore ? undefined : i === idx}
                aria-label={isMore ? t("product.showAllPhotos") : `${t("product.photo")} ${i + 1}`}
              >
                {p.thumb && (
                  <Image
                    src={p.thumb}
                    alt=""
                    fill
                    sizes="80px"
                    style={{
                      objectFit: "cover",
                      objectPosition: focalPosition(p.focalX, p.focalY),
                    }}
                  />
                )}
                {isMore && (
                  <span className="g-more-badge" aria-hidden="true">
                    +{stripHidden}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Full-screen lightbox — opened from the collage "Show all" tile. */}
      {lightbox && (
        <div
          className="g-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightbox(false);
          }}
        >
          <button
            type="button"
            className="g-lb-close"
            onClick={() => setLightbox(false)}
            aria-label={t("product.closeGallery")}
          >
            <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <div
            className="g-lb-stage"
            onTouchStart={onLbTouchStart}
            onTouchEnd={onLbTouchEnd}
          >
            {total > 1 && (
              <button
                type="button"
                className="g-nav g-prev"
                onClick={() => goLb(-1)}
                aria-label={t("product.prevPhoto")}
              >
                <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                  <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <div className="g-lb-img">
              {photos[lbIdx]?.hero && (
                <Image
                  key={lbIdx}
                  src={photos[lbIdx].hero!}
                  alt={`${title} — ${t("product.photo")} ${lbIdx + 1}`}
                  fill
                  sizes="100vw"
                  style={{
                    objectFit: "contain",
                    objectPosition: focalPosition(
                      photos[lbIdx].focalX,
                      photos[lbIdx].focalY,
                    ),
                  }}
                />
              )}
            </div>
            {total > 1 && (
              <button
                type="button"
                className="g-nav g-next"
                onClick={() => goLb(1)}
                aria-label={t("product.nextPhoto")}
              >
                <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <span className="g-lb-counter tnum">
              {String(lbIdx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
          </div>

          <div className="g-lb-rail" aria-label={t("product.thumbnails")}>
            {photos.map((p, i) => (
              <button
                key={i}
                type="button"
                className={"g-lb-mini" + (i === lbIdx ? " is-on" : "")}
                onClick={() => setLbIndex(i)}
                aria-label={`${t("product.photo")} ${i + 1}`}
                aria-current={i === lbIdx}
              >
                {p.thumb && (
                  <Image
                    src={p.thumb}
                    alt=""
                    fill
                    sizes="72px"
                    style={{
                      objectFit: "cover",
                      objectPosition: focalPosition(p.focalX, p.focalY),
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
