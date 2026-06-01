"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";

import { StatusPill } from "@/components/shared/status-pill";
import { assetUrl, focalPosition } from "@/lib/assets";
import type { ListingImage } from "@/lib/api/types";

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
  const photos = images.map(resolve).filter((p) => p.hero);
  const [active, setActive] = useState(0);

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
  const cur = photos[idx];
  const dimmed = isSold || isRented;
  const go = (delta: number) =>
    setActive((a) => (a + delta + total) % total);

  return (
    <div className="pdp-gallery">
      <div className="g-hero">
        {cur.hero && (
          <Image
            src={cur.hero}
            alt={`${title} — photo ${idx + 1}`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 60vw"
            style={{
              objectFit: "contain",
              objectPosition: focalPosition(cur.focalX, cur.focalY),
              opacity: dimmed ? 0.6 : 1,
              filter: dimmed ? "saturate(0.7)" : undefined,
            }}
          />
        )}

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
            alt={isRented ? "Rented" : "Sold out"}
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
              aria-label="Previous photo"
            >
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className="g-nav g-next"
              onClick={() => go(1)}
              aria-label="Next photo"
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
          <span className="g-viewall">
            <Camera className="icon-sm" aria-hidden="true" />
            <span>View all {total}</span>
          </span>
        </div>
      </div>

      {total > 1 && (
        <div className="g-strip" role="tablist" aria-label="Photo thumbnails">
          {photos.map((p, i) => (
            <button
              key={i}
              type="button"
              className={"g-mini" + (i === idx ? " is-on" : "")}
              onClick={() => setActive(i)}
              role="tab"
              aria-selected={i === idx}
              aria-label={`Photo ${i + 1}`}
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
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
