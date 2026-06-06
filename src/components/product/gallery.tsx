"use client";

import { useState } from "react";
import Image from "next/image";

import { StatusPill } from "@/components/shared/status-pill";
import { useI18n } from "@/components/providers/language-provider";
import { assetUrl, focalPosition } from "@/lib/assets";
import type { ListingImage } from "@/lib/api/types";

/** Thumbnail strip caps at 2 rows on desktop (7 cols × 2); extra photos collapse
 *  behind a "+N" tile on the last slot that expands the strip when clicked. */
const MAX_VISIBLE_THUMBS = 14;

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

/** Hero photo + horizontal thumbnail strip with active state + prev/next. */
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

  if (photos.length === 0) {
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

  const total = photos.length;
  const idx = Math.min(active, total - 1);
  const dimmed = isSold || isRented;
  const go = (delta: number) =>
    setActive((a) => (a + delta + total) % total);

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
          sizes="(max-width: 1024px) 100vw, 60vw"
          style={{
            objectFit: "contain",
            objectPosition: focalPosition(p.focalX, p.focalY),
            opacity: dimmed ? 0.6 : 1,
            filter: dimmed ? "saturate(0.7)" : undefined,
          }}
        />
      </div>
    ) : null;

  // Cap the strip; the last visible slot becomes a "+N" expander when over cap.
  const overflow = !showAll && total > MAX_VISIBLE_THUMBS;
  const visibleThumbs = overflow ? photos.slice(0, MAX_VISIBLE_THUMBS) : photos;
  const hiddenThumbs = total - MAX_VISIBLE_THUMBS;

  return (
    <div className="pdp-gallery">
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
                    +{hiddenThumbs}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
