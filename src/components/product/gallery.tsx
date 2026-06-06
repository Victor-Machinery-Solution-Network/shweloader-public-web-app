"use client";

import { useEffect, useState } from "react";
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

  const total = photos.length;
  const idx = Math.min(active, Math.max(total - 1, 0));

  // Lightbox: lock body scroll + wire Esc / arrow keys while open.
  useEffect(() => {
    if (!lightbox) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      else if (e.key === "ArrowLeft")
        setActive((a) => (a - 1 + total) % total);
      else if (e.key === "ArrowRight") setActive((a) => (a + 1) % total);
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

  // Desktop collage: hero + a 2×2 grid of the first four photos. When there are
  // more than four, the last tile becomes a "+N / Show all" lightbox trigger.
  const useCollage = total >= COLLAGE_TILES;
  const collageHidden = total - COLLAGE_TILES; // >0 only when over the 4 tiles

  // Cap the strip (smaller screens); last visible slot becomes a "+N" expander.
  const overflow = !showAll && total > MAX_VISIBLE_THUMBS;
  const visibleThumbs = overflow ? photos.slice(0, MAX_VISIBLE_THUMBS) : photos;
  const stripHidden = total - MAX_VISIBLE_THUMBS;

  return (
    <div className="pdp-gallery">
      <div className="g-stage">
        <div className="g-hero">
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

        {/* Desktop-only 2×2 collage (hidden < 1025px and when too few photos). */}
        {useCollage && (
          <div className="g-collage" aria-hidden="true">
            {photos.slice(0, COLLAGE_TILES).map((p, i) => {
              const isMore = collageHidden > 0 && i === COLLAGE_TILES - 1;
              return (
                <button
                  key={i}
                  type="button"
                  className={
                    "g-tile" +
                    (!isMore && i === idx ? " is-on" : "") +
                    (isMore ? " g-tile-more" : "")
                  }
                  onClick={() => (isMore ? setLightbox(true) : setActive(i))}
                  aria-label={
                    isMore
                      ? t("product.showAllPhotos")
                      : `${t("product.photo")} ${i + 1}`
                  }
                >
                  {p.thumb && (
                    <Image
                      src={p.thumb}
                      alt=""
                      fill
                      sizes="(min-width: 1025px) 240px, 1px"
                      style={{
                        objectFit: "cover",
                        objectPosition: focalPosition(p.focalX, p.focalY),
                      }}
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

          <div className="g-lb-stage">
            {total > 1 && (
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
            )}
            <div className="g-lb-img">
              {photos[idx]?.hero && (
                <Image
                  key={idx}
                  src={photos[idx].hero!}
                  alt={`${title} — ${t("product.photo")} ${idx + 1}`}
                  fill
                  sizes="100vw"
                  style={{
                    objectFit: "contain",
                    objectPosition: focalPosition(
                      photos[idx].focalX,
                      photos[idx].focalY,
                    ),
                  }}
                />
              )}
            </div>
            {total > 1 && (
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
            )}
            <span className="g-lb-counter tnum">
              {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
          </div>

          <div className="g-lb-rail" aria-label={t("product.thumbnails")}>
            {photos.map((p, i) => (
              <button
                key={i}
                type="button"
                className={"g-lb-mini" + (i === idx ? " is-on" : "")}
                onClick={() => setActive(i)}
                aria-label={`${t("product.photo")} ${i + 1}`}
                aria-current={i === idx}
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
