"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Megaphone } from "lucide-react";

import type { Announcement } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Auto-advance interval for the message reel (ms). */
const ANN_DURATION = 5000;
const MSG_HEIGHT = 30; // px — must match `.mh-ann-msg`/`.mh-ann-stage` height in the design CSS.

/** CSS custom properties used to drive the marquee on an overflowing message. */
type MarqueeVars = CSSProperties & {
  "--mq-dist"?: string;
  "--mq-dur"?: string;
};

/**
 * Rotating announcement reel for the homepage header.
 *
 * Ports the design's `AnnouncementBar` (`.mh-ann*` rules in homepage/styles.css):
 * an odometer-style vertical reel of admin messages with a speaker icon.
 * Messages that overflow the stage gently marquee via the `.is-marquee` class.
 * Auto-rotation pauses when the pointer is over the bar and stops entirely under
 * `prefers-reduced-motion: reduce`.
 *
 * Announcement text is admin-authored catalog content, so it is rendered as-is
 * (not run through i18n). Renders nothing when there are no announcements.
 */
export function AnnouncementBar({ announcements }: { announcements: Announcement[] }) {
  const count = announcements.length;

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  // Overflow distance (px) of the active message — 0 means it fits, no marquee.
  const [mq, setMq] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  // Track the user's reduced-motion preference so we can stop auto-advancing.
  useEffect(() => {
    const mqList = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mqList.matches);
    apply();
    mqList.addEventListener("change", apply);
    return () => mqList.removeEventListener("change", apply);
  }, []);

  const advance = useCallback(() => {
    setI((n) => (count ? (n + 1) % count : 0));
  }, [count]);

  // Auto-advance, unless paused, reduced-motion, or there's only one message.
  useEffect(() => {
    if (paused || reduceMotion || count <= 1) return;
    const id = window.setInterval(advance, ANN_DURATION);
    return () => window.clearInterval(id);
  }, [paused, reduceMotion, count, advance]);

  // Keep the active index in range if the announcement list shrinks.
  useEffect(() => {
    if (i >= count) setI(0);
  }, [i, count]);

  // Measure whether the active message overflows the stage → drives the marquee.
  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const active = stage.querySelector<HTMLElement>('.mh-ann-msg[data-active="true"]');
    if (!active) {
      setMq(0);
      return;
    }
    const over = active.scrollWidth - stage.clientWidth;
    setMq(over > 4 ? Math.ceil(over + 14) : 0);
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [i, count, measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  if (count === 0) return null;

  return (
    <div
      className={cn("mh-ann", "mh-ann--default")}
      role="region"
      aria-label="Announcements"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mh-ann-row">
        <span className="mh-ann-mega" aria-hidden="true">
          <Megaphone className="icon-sm" />
        </span>

        <div className="mh-ann-stage" ref={stageRef}>
          <div
            className="mh-ann-reel"
            style={{ transform: `translateY(${-i * MSG_HEIGHT}px)` }}
          >
            {announcements.map((a, idx) => {
              const isMq = idx === i && mq > 0;
              const style: MarqueeVars | undefined = isMq
                ? {
                    "--mq-dist": `${mq}px`,
                    "--mq-dur": `${Math.max(5, Math.round(mq / MSG_HEIGHT))}s`,
                  }
                : undefined;
              return (
                <span
                  key={a.id}
                  className={cn("mh-ann-msg", isMq && "is-marquee")}
                  data-active={idx === i}
                  aria-hidden={idx !== i}
                  style={style}
                >
                  {a.text}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
