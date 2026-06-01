"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Non-critical floating widgets. Loading them as separate chunks keeps their
// JS out of the initial First Load bundle; mounting on idle keeps their
// hydration from competing with the LCP paint. Both are click/timer-triggered,
// so appearing a moment after the page settles is invisible to users.
const LiveChat = dynamic(
  () => import("@/components/shared/live-chat").then((m) => m.LiveChat),
  { ssr: false },
);
const PromoPopup = dynamic(
  () => import("@/components/shared/promo-popup").then((m) => m.PromoPopup),
  { ssr: false },
);

export function DeferredWidgets({ promo = false }: { promo?: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setReady(true));
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(() => setReady(true), 200);
    return () => window.clearTimeout(t);
  }, []);

  if (!ready) return null;
  return (
    <>
      <LiveChat />
      {promo ? <PromoPopup /> : null}
    </>
  );
}
