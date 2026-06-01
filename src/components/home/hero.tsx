"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { assetUrl, focalPosition } from "@/lib/assets";
import type { Slide } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Cross-fade autoplay interval (ms) — matches the design's hero cadence. */
const DURATION = 6500;

/**
 * Homepage hero — admin-uploaded promo image(s) at 21:9, with NO text overlay
 * (per product rules). Ports the design's `Hero` (`.hero-frame` / `.hero-slide`
 * rules in app.css): a cross-fading carousel with prev/next arrows and a
 * progress-dot rail on ≥640px; on mobile the frame becomes a horizontal
 * scroll-snap carousel (the design CSS handles that layout — arrows/dots are
 * hidden there).
 *
 * Each slide is just the image and an optional click-through (`slide.href`).
 * Renders nothing when there are no slides.
 */
export function Hero({ slides }: { slides: Slide[] }) {
  const count = slides.length;
  const [idx, setIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  const go = useCallback(
    (next: number) => {
      if (count <= 1) return;
      const wrapped = (next + count) % count;
      setPrevIdx(idx);
      setIdx(wrapped);
    },
    [count, idx],
  );

  // Autoplay (paused under reduced-motion or with a single slide).
  useEffect(() => {
    if (reduceMotion || count <= 1) return;
    const id = window.setInterval(() => {
      setIdx((i) => {
        setPrevIdx(i);
        return (i + 1) % count;
      });
    }, DURATION);
    return () => window.clearInterval(id);
  }, [reduceMotion, count]);

  if (count === 0) return null;

  return (
    <section className="hero-frame" aria-roledescription="carousel" aria-label="Promotions">
      {slides.map((s, i) => {
        const isActive = i === idx;
        const isPrev = i === prevIdx && i !== idx;
        const src = assetUrl(s.image);
        const slide = (
          <>
            {src && (
              <Image
                src={src}
                alt=""
                fill
                priority={i === 0}
                sizes="(max-width: 640px) 86vw, 100vw"
                className={cn("hero-slide-img", isActive && "is-active")}
                style={{
                  objectFit: "cover",
                  objectPosition: focalPosition(s.focalX, s.focalY),
                }}
              />
            )}
            <div className="hero-slide-vignette" aria-hidden="true" />
          </>
        );
        const className = cn(
          "hero-slide",
          isActive && "is-active",
          isPrev && "is-prev",
        );
        const style = {
          background: "#000",
          opacity: isActive ? 1 : 0,
          zIndex: isActive ? 2 : isPrev ? 1 : 0,
        } as const;

        return s.href ? (
          <Link
            key={s.id}
            href={s.href}
            className={className}
            style={style}
            aria-hidden={!isActive}
            tabIndex={isActive ? undefined : -1}
          >
            {slide}
          </Link>
        ) : (
          <div key={s.id} className={className} style={style} aria-hidden={!isActive}>
            {slide}
          </div>
        );
      })}

      {count > 1 && (
        <>
          <button
            type="button"
            className="hero-arrow"
            style={{ left: 16 }}
            onClick={() => go(idx - 1)}
            aria-label="Previous slide"
          >
            <ArrowRight style={{ transform: "rotate(180deg)" }} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="hero-arrow"
            style={{ right: 16 }}
            onClick={() => go(idx + 1)}
            aria-label="Next slide"
          >
            <ArrowRight aria-hidden="true" />
          </button>

          <div className="hero-meta">
            <div className="hero-dots">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={cn(i === idx && "is-active")}
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === idx}
                >
                  {i === idx && !reduceMotion && (
                    <span
                      className="hero-dot-progress"
                      key={`p${idx}`}
                      style={{ animationDuration: `${DURATION}ms` }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
