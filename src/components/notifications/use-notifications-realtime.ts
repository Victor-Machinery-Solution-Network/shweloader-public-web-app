"use client";
import { useEffect, useRef } from "react";
import type { Channel } from "pusher-js";
import { getPusher } from "@/components/chat/core/pusher-client";
import { useNotificationsStore } from "./store";
import type { NotificationItem } from "./notification-row";

/** Tolerate `[]`, `{ items: [] }`, `{ notifications: [] }`, `{ data: [] }`, or
 *  junk — identical to the notifications page's normalizer so the header count
 *  matches what the page renders. */
function normalizeItems(raw: unknown): NotificationItem[] {
  let list: unknown = raw;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    list = obj.items ?? obj.notifications ?? obj.data ?? [];
  }
  if (!Array.isArray(list)) return [];
  return list.filter(
    (x): x is NotificationItem => !!x && typeof x === "object",
  );
}

/** Same unread rule as notifications/page.tsx: trust `unread` if boolean, else
 *  the negation of `read` if boolean, else not-unread. */
function isUnread(item: NotificationItem): boolean {
  if (typeof item.unread === "boolean") return item.unread;
  if (typeof item.read === "boolean") return !item.read;
  return false;
}

/**
 * Keep the header notifications badge live for the signed-in user. On sign-in it
 * (1) fetches GET /api/notifications once and seeds the store's unread count, then
 * (2) subscribes to the per-user Pusher channel `private-user-{id}` and bumps the
 * count on `new-notification` / `new-promotion`. Tears the subscription down on
 * unmount or when the user signs out, and resets the count then too.
 *
 * Defensive throughout (network/Pusher failures never throw to render) and
 * React-Compiler-safe (refs + effects only; no render-time mutation). Mounted by
 * the header user-menu, so notifications stay live app-wide for signed-in users —
 * matching the mobile app, which also holds a per-user channel app-wide.
 */
export function useNotificationsRealtime(
  userId: number | null,
  signedIn: boolean,
): void {
  const setUnread = useNotificationsStore((s) => s.setUnread);
  const bumpUnread = useNotificationsStore((s) => s.bumpUnread);
  const reset = useNotificationsStore((s) => s.reset);

  // Guard so the initial fetch + subscribe runs exactly once per sign-in. Keyed
  // on the user id so a different user signing in re-seeds; cleared on sign-out.
  const startedForRef = useRef<number | null>(null);

  useEffect(() => {
    if (!signedIn || userId == null) {
      // Signed out (or never signed in): drop any stale count. The cleanup of a
      // prior signed-in run handles the unsubscribe; here we just zero the badge.
      startedForRef.current = null;
      reset();
      return;
    }

    // Already wired up for this exact user — don't double-fetch/subscribe.
    if (startedForRef.current === userId) return;
    startedForRef.current = userId;

    let cancelled = false;
    let channel: Channel | undefined;
    const name = `private-user-${userId}`;

    // (a) Seed the count from the server once.
    void (async () => {
      try {
        const res = await fetch("/api/notifications", {
          headers: { Accept: "application/json" },
        });
        if (!res.ok || cancelled) return;
        const raw: unknown = await res.json();
        if (cancelled) return;
        const count = normalizeItems(raw).filter((i) => isUnread(i)).length;
        setUnread(count);
      } catch {
        // Non-fatal: leave the badge at its current value (likely 0).
      }
    })();

    // (b) Subscribe to the per-user channel and bump on live events.
    void getPusher()
      .then((pusher) => {
        if (!pusher || cancelled) return;
        channel = pusher.subscribe(name);

        channel.bind("pusher:subscription_error", (status: unknown) => {
          console.error("[notifications] subscription_error:", name, status);
        });

        const onNew = () => bumpUnread();
        channel.bind("new-notification", onNew);
        channel.bind("new-promotion", onNew);
      })
      .catch(() => {
        // Non-fatal: realtime simply stays off; the seeded count still shows.
      });

    return () => {
      cancelled = true;
      void getPusher()
        .then((pusher) => {
          if (!pusher) return;
          // Unbind our handlers and unsubscribe so the next user's channel can't
          // inherit these listeners (the chat code shares this Pusher singleton).
          if (channel) {
            channel.unbind("new-notification");
            channel.unbind("new-promotion");
            channel.unbind("pusher:subscription_error");
          }
          pusher.unsubscribe(name);
        })
        .catch(() => {
          /* ignore — best-effort teardown */
        });
    };
  }, [userId, signedIn, setUnread, bumpUnread, reset]);
}
