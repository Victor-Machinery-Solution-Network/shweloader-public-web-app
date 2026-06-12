"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, Headset, Phone, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { useChatStore } from "./core/store";
import { usePusherChat } from "./core/use-pusher-chat";
import { useChatSync } from "./core/use-chat-sync";
import { usePresence } from "./core/use-presence";
import { Thread } from "./core/Thread";
import { Composer } from "./core/Composer";
import type { ChatSession } from "./core/types";
import { useAuth } from "@/lib/auth/use-auth";
import { PRESENCE_ENABLED, WEB_PUSH_ENABLED } from "@/lib/env";
import { useWebPush } from "./core/use-web-push";
import { Bell, BellOff } from "lucide-react";

/**
 * Support chat — Messenger-style two-pane client UI. Left: session list with
 * search. Right: the selected conversation thread + composer. Resolved sessions
 * are read-only history.
 *
 * Data is seeded from server-rendered sessions and kept live via the shared
 * chat-core (Zustand store + Pusher hook + sync hook).
 */

interface ChatShellProps {
  sessions: ChatSession[];
  /** Phone number for the "call support" affordance. */
  supportPhone?: string;
}

const SUPPORT_NAME = "ShweLoader Support";

/** Format a nullable ISO timestamp as a short time string for the session row. */
function fmtSessionTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ChatShell({
  sessions: initial,
  supportPhone = "+95977123456",
}: ChatShellProps) {
  const { user } = useAuth();

  const {
    sessions,
    messages,
    activeSessionId,
    adminReadAt,
    setSessions,
    setActive,
  } = useChatStore();

  // Phase 3: live admin presence via Firebase RTDB.
  // The /chat page is always "active" — the user is signed in to reach it.
  const numericUserId = user?.id != null ? Number(user.id) : null;
  const { supportOnline } = usePresence(numericUserId, true);

  const webPush = useWebPush();

  const [query, setQuery] = useState("");

  // Mobile-only master-detail toggle: "list" shows the session rail,
  // "conv" shows the open conversation. Ignored at desktop widths (>768px),
  // where both panes are always visible (the back button is hidden).
  const [mobileView, setMobileView] = useState<"list" | "conv">("list");

  // Seed the store with server-rendered sessions on mount / when they change.
  // Only set activeSessionId when none is set yet (preserve user navigation),
  // OR when the persisted activeSessionId is stale (not among the current
  // sessions) — e.g. User A logs out and User B logs in, leaving A's id in
  // localStorage, which would otherwise show the wrong/empty thread.
  useEffect(() => {
    setSessions(initial);
    const validPersisted = initial.some((s) => s.id === activeSessionId);
    if (initial.length && (activeSessionId == null || !validPersisted)) {
      const first =
        initial.find((s) => s.status !== "resolved") ?? initial[0];
      setActive(first.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const activeId = activeSessionId;

  const { adminTyping } = usePusherChat(activeId);
  const { send, markRead, notifyTyping } = useChatSync(activeId);

  // Mark read when the active session changes.
  useEffect(() => {
    markRead();
  }, [activeId, markRead]);

  // Mark read when the window regains focus.
  useEffect(() => {
    const onFocus = () => markRead();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [markRead]);

  const active = useMemo(
    () => (activeId != null ? sessions.find((s) => s.id === activeId) ?? null : null),
    [sessions, activeId],
  );

  const msgs = activeId != null ? (messages[activeId] ?? []) : [];
  const activeAdminReadAt =
    activeId != null ? (adminReadAt[activeId] ?? null) : null;

  const handleSetActive = useCallback(
    (id: number) => {
      setActive(id);
      setMobileView("conv");
    },
    [setActive],
  );

  const visibleSessions = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Most-recent-activity first (null timestamps sort last).
    const ordered = sessions.slice().sort((a, b) => {
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    });
    if (!q) return ordered;
    return ordered.filter((s) =>
      (s.lastMessagePreview ?? "").toLowerCase().includes(q),
    );
  }, [sessions, query]);

  if (!active && sessions.length === 0) {
    return (
      <div className="chat-shell2">
        <section className="chat-conv">
          <div className="chat-card-body">
            <div className="chat-day">
              <span>No conversations yet</span>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="chat-shell2" data-mobile-view={mobileView}>
      {/* Left: session list */}
      <aside className="chat-list">
        <div className="chat-list-head">
          <span className="chat-list-title">Chats</span>
        </div>
        <label className="chat-search">
          <Search />
          <input
            type="text"
            placeholder="Search messages"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search messages"
          />
        </label>
        <div className="chat-list-scroll">
          {visibleSessions.map((s) => (
            <button
              key={s.id}
              type="button"
              className={cn(
                "sess",
                s.id === activeId && "is-active",
                s.status === "resolved" && "is-closed",
              )}
              onClick={() => handleSetActive(s.id)}
            >
              <span className="sess-av" aria-hidden="true">
                <Headset />
                {s.status !== "resolved" && <span className="sess-on" />}
              </span>
              <span className="sess-main">
                <span className="sess-top">
                  <span className="sess-name">{SUPPORT_NAME}</span>
                  <span className="sess-time">{fmtSessionTime(s.lastMessageAt)}</span>
                </span>
                <span className="sess-prev">{s.lastMessagePreview ?? ""}</span>
                <span className="sess-meta">
                  <span className={cn("sess-status", s.status)}>
                    {s.status === "resolved"
                      ? "Closed"
                      : s.status === "pending"
                        ? "Pending"
                        : "Open"}
                  </span>
                  {s.unreadUserCount > 0 && (
                    <span className="chat-unread">{s.unreadUserCount}</span>
                  )}
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* Right: conversation */}
      <section className="chat-conv">
        <div className="chat-card-head">
          <button
            type="button"
            className="chat-back"
            aria-label="Back to chats"
            onClick={() => setMobileView("list")}
          >
            <ChevronLeft />
          </button>
          <span className="chat-id-av" aria-hidden="true">
            <Headset />
            {active && active.status !== "resolved" && (
              <span className="chat-id-on" />
            )}
          </span>
          <div className="chat-id-meta">
            <div className="chat-id-name">{SUPPORT_NAME}</div>
            {active && active.status !== "resolved" ? (
              <div className="chat-id-status">
                {/* When presence is enabled show live admin status; otherwise
                    keep the existing static "Active now" text unchanged. */}
                {PRESENCE_ENABLED
                  ? supportOnline
                    ? "Support online"
                    : "Support away"
                  : "Active now"}
              </div>
            ) : (
              <div className="chat-id-status is-closed">Session closed</div>
            )}
          </div>
          {WEB_PUSH_ENABLED && webPush.supported && (
            <button
              type="button"
              className={cn(
                "chat-notif-btn",
                webPush.permission === "denied" && "is-denied",
                webPush.subscribed && webPush.permission === "granted" && "is-on",
              )}
              onClick={() => (webPush.subscribed ? webPush.disable() : webPush.enable())}
              aria-label={
                webPush.permission === "denied"
                  ? "Notifications blocked — allow them in browser settings"
                  : webPush.subscribed
                    ? "Disable chat notifications"
                    : "Enable chat notifications"
              }
              disabled={webPush.permission === "denied"}
            >
              {webPush.subscribed && webPush.permission === "granted" ? <Bell /> : <BellOff />}
            </button>
          )}
          <a
            href={`tel:${supportPhone}`}
            className="chat-id-call"
            aria-label="Call support"
          >
            <Phone />
          </a>
        </div>

        <Thread
          messages={msgs}
          adminReadAt={activeAdminReadAt}
          adminTyping={adminTyping}
        />

        {active?.status === "resolved" && (
          <div className="chat-reopen-note" role="status">
            This conversation was closed — send a message to reopen.
          </div>
        )}
        <Composer
          onSend={send}
          onTyping={notifyTyping}
          disabled={false}
          sessionId={activeId ?? null}
        />
      </section>
    </div>
  );
}
