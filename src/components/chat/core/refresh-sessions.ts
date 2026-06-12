"use client";
import { useEffect } from "react";
import { useChatStore } from "./store";
import type { ChatSession } from "./types";

interface RawSessionRow {
  id: number | string;
  status: ChatSession["status"];
  unread_user_count?: number;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  admin_last_read_at?: string | null;
}

let inFlight = false;
let lastRun = 0;

/**
 * Re-fetch the signed-in user's chat sessions and MERGE them into the store:
 * new sessions (e.g. admin-initiated, or another device) appear, and existing
 * ones pick up fresh status / unread / last-message — without clobbering the
 * locally-known set or the active session's identity.
 *
 * This is how cross-session updates reach a client that only holds a live Pusher
 * subscription on the *active* session — it mirrors the mobile app, which
 * refreshes sessions on chat-tab focus (useChatBackendSync). Single-flight +
 * throttled so focus/visibility churn can't spam the worker.
 */
export async function refreshSessions(minIntervalMs = 4000): Promise<void> {
  const now = Date.now();
  if (inFlight || now - lastRun < minIntervalMs) return;
  inFlight = true;
  try {
    const res = await fetch("/api/chat/sessions");
    if (!res.ok) return;
    const data = (await res.json()) as { sessions?: RawSessionRow[] };
    if (!data?.sessions) return;
    const mapped: ChatSession[] = data.sessions.map((row) => ({
      id: Number(row.id),
      status: row.status,
      unreadUserCount: row.unread_user_count ?? 0,
      lastMessageAt: row.last_message_at ?? null,
      lastMessagePreview: row.last_message_preview ?? null,
      adminLastReadAt: row.admin_last_read_at ?? null,
    }));
    const existing = useChatStore.getState().sessions;
    const existingMap = new Map(existing.map((s) => [s.id, s]));
    // Server rows refresh status/unread/preview; existing entries keep identity
    // (so activeSessionId stays valid). Locally-only sessions are preserved.
    const merged: ChatSession[] = mapped.map((s) => {
      const ex = existingMap.get(s.id);
      return ex
        ? {
            ...ex,
            status: s.status,
            unreadUserCount: s.unreadUserCount,
            lastMessageAt: s.lastMessageAt,
            lastMessagePreview: s.lastMessagePreview,
            adminLastReadAt: s.adminLastReadAt,
          }
        : s;
    });
    const mergedIds = new Set(merged.map((s) => s.id));
    for (const s of existing) if (!mergedIds.has(s.id)) merged.push(s);
    useChatStore.getState().setSessions(merged);
    lastRun = Date.now();
  } catch {
    /* non-fatal — a failed refresh just leaves the last-known sessions */
  } finally {
    inFlight = false;
  }
}

/**
 * Refresh sessions whenever the tab regains focus / becomes visible (while
 * `enabled`). Mirrors mobile's focus-based chat sync so admin-started sessions,
 * cross-session messages, and resolves/reopens on non-active sessions show up
 * when the user comes back to the page — and keeps the launcher's unread badge
 * fresh. The throttle in refreshSessions() de-dupes focus+visibility doublefire.
 */
export function useSessionRefresh(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => {
      void refreshSessions();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshSessions();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);
}
