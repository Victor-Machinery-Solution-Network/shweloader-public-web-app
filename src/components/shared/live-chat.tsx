"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Bell, BellOff, Maximize2, X } from "lucide-react";
import { HeadsetIcon } from "@/components/shared/icons/headset-icon";

import { useAuthUI } from "@/components/providers/auth-ui";
import { useI18n } from "@/components/providers/language-provider";
import { useAuth } from "@/lib/auth/use-auth";
import { useChatStore } from "@/components/chat/core/store";
import { usePusherChat } from "@/components/chat/core/use-pusher-chat";
import { useChatSync } from "@/components/chat/core/use-chat-sync";
import { usePresence } from "@/components/chat/core/use-presence";
import { resetPusher } from "@/components/chat/core/pusher-client";
import { Thread } from "@/components/chat/core/Thread";
import { Composer } from "@/components/chat/core/Composer";
import type { ChatSession } from "@/components/chat/core/types";
import { PRESENCE_ENABLED, WEB_PUSH_ENABLED } from "@/lib/env";
import { useWebPush } from "@/components/chat/core/use-web-push";
import { useSessionRefresh, refreshSessions } from "@/components/chat/core/refresh-sessions";
import { cn } from "@/lib/utils";
// The launcher renders the shared chat-core (Thread/Composer/MessageBubble),
// which emit .chat-* classes. Those styles live in chat.css — imported here so
// the floating panel is styled too (the /chat page imports it separately).
import "@/styles/pages/chat.css";

/**
 * Live chat support — floating gold pulsing launcher (bottom-right), shared
 * across pages. Opens on its own launcher OR when any element dispatches the
 * global `shwe:open-chat` event (e.g. the header "Messages" menu item).
 *
 * Signed-out: the launcher opens the global auth modal (sign in to chat). If the
 * panel is opened via the global event, it shows the sign-in gate instead.
 * Signed-in: bootstraps the user's primary session via POST /api/chat/sessions
 * (get-or-create, once per component lifecycle), then renders the shared Thread +
 * Composer backed by the realtime core. The launcher button keeps its static
 * always-green dot — purely decorative, no presence call.
 *
 * Motion is handled entirely by the design CSS, which already disables the
 * pulse/shake animations under `prefers-reduced-motion: reduce`.
 */
export function LiveChat() {
  const { signedIn, user } = useAuth();
  const { open: openAuth } = useAuthUI();
  const { t } = useI18n();
  // Lift the launcher above the product page's sticky enquiry bar. Driven by the
  // current route (not the DOM) so it resets correctly on client navigation —
  // route CSS + the product DOM can briefly persist after a soft nav.
  const pathname = usePathname();
  const onProductPage = pathname?.startsWith("/product/") ?? false;
  // Hide the floating launcher on the full /chat page — it renders the same
  // core, and the two would otherwise fight over the shared activeSessionId.
  const onChatPage = pathname?.startsWith("/chat") ?? false;

  const [open, setOpen] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);

  // Focus management: move focus into the panel (close button) on open, and
  // restore it to the launcher FAB on close.
  const fabRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current) closeBtnRef.current?.focus();
    else if (!open && prevOpen.current) fabRef.current?.focus();
    prevOpen.current = open;
  }, [open]);

  // Guard: POST /api/chat/sessions only once per component lifecycle.
  const bootstrappedRef = useRef(false);
  // Guard: GET /api/chat/sessions once per sign-in.
  const sessionSyncedRef = useRef(false);

  const { activeSessionId, sessions, adminReadAt, messages, setActive, setSessions } =
    useChatStore();
  const sessionMessages =
    activeSessionId != null ? (messages[activeSessionId] ?? []) : [];
  const sessionAdminReadAt =
    activeSessionId != null ? (adminReadAt[activeSessionId] ?? null) : null;
  const activeSession =
    activeSessionId != null ? sessions.find((s) => s.id === activeSessionId) ?? null : null;

  const { adminTyping } = usePusherChat(open && signedIn ? activeSessionId : null);
  const { send, markRead, notifyTyping } = useChatSync(
    open && signedIn ? activeSessionId : null,
  );

  // Mirror mobile's focus-based chat sync: refresh sessions on tab focus (keeps
  // the FAB unread badge fresh + surfaces admin-started/closed sessions), and
  // also whenever the panel is opened.
  useSessionRefresh(signedIn);
  useEffect(() => {
    if (open && signedIn) void refreshSessions();
  }, [open, signedIn]);

  // Phase 3: Firebase RTDB presence. No-op when PRESENCE_ENABLED is false
  // (no Firebase config present), keeping the static green dot unchanged.
  const numericUserId =
    user?.id != null ? Number(user.id) : null;
  const { supportOnline } = usePresence(numericUserId, open && signedIn);

  // Phase 4: Web push notification toggle. No-op when WEB_PUSH_ENABLED is false
  // (NEXT_PUBLIC_VAPID_PUBLIC_KEY not set) or the browser lacks SW/Push support.
  const webPush = useWebPush();

  // Bootstrap the session when the panel is opened while signed in.
  // Guard ensures only one POST per component lifecycle regardless of
  // how many times the panel is opened/closed.
  useEffect(() => {
    if (!open || !signedIn || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    setBootstrapping(true);
    fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((r) => (r.ok ? (r.json() as Promise<{ sessionId: number }>) : null))
      .then((data) => {
        if (!data) return;
        const { sessionId } = data;
        // Only seed if the store doesn't already know this session — never clobber
        // existing sessions (the /chat page may have populated the full list).
        const existing = useChatStore.getState().sessions;
        if (!existing.some((s) => s.id === sessionId)) {
          const seedSession: ChatSession = {
            id: sessionId,
            status: "active",
            lastMessageAt: null,
            lastMessagePreview: null,
            unreadUserCount: 0,
            adminLastReadAt: null,
          };
          setSessions([...existing, seedSession]);
        }
        setActive(sessionId);
      })
      .catch(() => {})
      .finally(() => setBootstrapping(false));
  }, [open, signedIn, setActive, setSessions]);

  // Post-login sync: when the user signs in, load all their sessions from the
  // server and merge into the store. Runs once per sign-in (guard by ref that
  // resets when signedIn flips false → true).
  useEffect(() => {
    if (!signedIn) {
      // Tear down the Pusher connection on logout so the next user doesn't
      // inherit the previous user's authenticated socket / channel subscriptions.
      resetPusher();
      // Reset so both the sync AND the session bootstrap fire again on the next
      // sign-in (e.g. after a token-expiry logout + re-login as another user).
      sessionSyncedRef.current = false;
      bootstrappedRef.current = false;
      return;
    }
    if (sessionSyncedRef.current) return;
    sessionSyncedRef.current = true;
    fetch("/api/chat/sessions")
      .then((r) => (r.ok ? (r.json() as Promise<{ sessions: Array<{
        id: number | string;
        status: ChatSession["status"];
        unread_user_count?: number;
        last_message_at?: string | null;
        last_message_preview?: string | null;
        admin_last_read_at?: string | null;
      }> }>) : null))
      .then((data) => {
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
        // Merge: server rows provide status/unread updates; existing store entries
        // win for identity continuity (activeSessionId won't be invalidated).
        const existingMap = new Map(existing.map((s) => [s.id, s]));
        const merged = mapped.map((s) => {
          const ex = existingMap.get(s.id);
          return ex
            ? { ...ex, status: s.status, unreadUserCount: s.unreadUserCount,
                lastMessageAt: s.lastMessageAt, lastMessagePreview: s.lastMessagePreview,
                adminLastReadAt: s.adminLastReadAt }
            : s;
        });
        // Preserve any sessions only known locally (e.g. just bootstrapped).
        const mergedIds = new Set(merged.map((s) => s.id));
        for (const s of existing) {
          if (!mergedIds.has(s.id)) merged.push(s);
        }
        setSessions(merged);
      })
      .catch(() => {});
  }, [signedIn, setSessions]);

  // Mark messages read when panel opens (signed in + active session).
  useEffect(() => {
    if (open && signedIn && activeSessionId != null) {
      markRead();
    }
  }, [open, signedIn, activeSessionId, markRead]);

  const openPanel = useCallback(() => {
    // Always open the panel. Signed-out users see the sign-in gate (with the
    // "Sign in →" CTA that routes to the auth modal) — so the bubble shows the
    // teasing "3 online" presence rather than jumping straight to auth.
    setOpen(true);
  }, []);

  // Allow any part of the app (header Messages link, etc.) to open the chat.
  useEffect(() => {
    const onOpenChat = () => {
      // Always open the panel here; signed-out users see the sign-in gate.
      setOpen(true);
    };
    window.addEventListener("shwe:open-chat", onOpenChat);
    return () => window.removeEventListener("shwe:open-chat", onOpenChat);
  }, []);

  // Don't render the floating launcher on the full chat page (avoids a second
  // chat surface fighting over the shared store). All hooks above still run.
  if (onChatPage) return null;

  return (
    <>
      {/* Mobile-only blurred backdrop behind the panel */}
      <div
        className={"lc-backdrop" + (open ? " is-open" : "")}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div
        id="lc-chat-panel"
        className={"lc-panel" + (open ? " is-open" : "")}
        role="dialog"
        aria-label={t("chat.title")}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="lc-head">
          <div className="lc-head-avatar" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <clipPath id="lcAvatarClip">
                  <circle cx="20" cy="20" r="20" />
                </clipPath>
              </defs>
              <g clipPath="url(#lcAvatarClip)">
                <rect width="40" height="40" fill="#f1d9a8" />
                {/* shoulders / shirt */}
                <path d="M2 40 C 6 30, 14 27, 20 27 C 26 27, 34 30, 38 40 Z" fill="#2a2a2a" />
                <path d="M14 28 L 20 33 L 26 28 L 26 30 L 20 35 L 14 30 Z" fill="#fff" opacity="0.92" />
                {/* neck */}
                <rect x="17.5" y="22" width="5" height="6" fill="#d9b07a" />
                {/* head */}
                <circle cx="20" cy="17" r="8" fill="#e8c290" />
                {/* hair */}
                <path d="M12 16 C 12 9, 28 9, 28 16 C 28 13, 26 11, 23 11 C 21 11, 19 12, 17 12 C 14 12, 12 13, 12 16 Z" fill="#2a1f15" />
                {/* eyes */}
                <circle cx="17" cy="17" r="0.9" fill="#2a1f15" />
                <circle cx="23" cy="17" r="0.9" fill="#2a1f15" />
                {/* smile */}
                <path d="M17.5 20 Q 20 22, 22.5 20" stroke="#7a4a2a" strokeWidth="0.8" fill="none" strokeLinecap="round" />
              </g>
            </svg>
            <span className="lc-pulse" aria-hidden="true" />
          </div>
          <div className="lc-head-meta">
            <div className="lc-head-title">{t("chat.supportName")}</div>
            <div className="lc-head-sub">
              {/* When presence is enabled show a live dot; otherwise keep the
                  static always-green dot so the UI is unchanged today. */}
              {PRESENCE_ENABLED ? (
                supportOnline ? (
                  <>
                    <span className="lc-dot" /> {t("chat.status")}
                  </>
                ) : (
                  <span className="lc-dot lc-dot--away" />
                )
              ) : (
                <>
                  <span className="lc-dot" /> {t("chat.status")}
                </>
              )}
            </div>
          </div>
          {signedIn && (
            <Link className="lc-expand" href="/chat" aria-label="Open full screen">
              <Maximize2 />
            </Link>
          )}
          {WEB_PUSH_ENABLED && webPush.supported && signedIn && (
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
          <button
            ref={closeBtnRef}
            type="button"
            className="lc-close"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
          >
            <X />
          </button>
        </div>

        {signedIn ? (
          <>
            {bootstrapping || activeSessionId == null ? (
              <div className="lc-body lc-body--loading" aria-live="polite">
                <span className="chat-typing" aria-label="Loading…">
                  <span /><span /><span />
                </span>
              </div>
            ) : (
              <Thread
                messages={sessionMessages}
                adminReadAt={sessionAdminReadAt}
                adminTyping={adminTyping}
              />
            )}
            {activeSession?.status === "resolved" && (
              <div className="chat-reopen-note" role="status">
                This conversation was closed — send a message to reopen.
              </div>
            )}
            <Composer
              onSend={send}
              onTyping={notifyTyping}
              disabled={bootstrapping || activeSessionId == null}
              sessionId={activeSessionId ?? null}
            />
          </>
        ) : (
          <div className="lc-gate" role="region" aria-label="Sign in to chat">
            <div className="lc-gate-hero" aria-hidden="true">
              <span className="lc-gate-halo" />
              <span className="lc-gate-icon">
                <HeadsetIcon />
              </span>
            </div>

            <h3 className="lc-gate-h">{t("chat.gateTitle")}</h3>
            <p className="lc-gate-sub">{t("chat.gateSub")}</p>

            <div className="lc-gate-cta">
              <button
                type="button"
                className="lc-gate-primary"
                onClick={() => openAuth("signin")}
              >
                {t("actions.signIn")}
                <ArrowRight className="icon-sm" />
              </button>
              <div className="lc-gate-foot">
                {t("chat.newHere")}{" "}
                <button
                  type="button"
                  className="lc-gate-link"
                  onClick={() => openAuth("register")}
                >
                  {t("chat.createAccount")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating launcher */}
      <button
        ref={fabRef}
        type="button"
        className={
          "lc-fab" +
          (open ? " is-open" : "") +
          (onProductPage ? " lc-fab--product" : "")
        }
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label={open ? "Close chat" : "Open live chat"}
        aria-expanded={open}
        aria-controls="lc-chat-panel"
      >
        <span className="lc-fab-icon lc-fab-chat" aria-hidden="true">
          <HeadsetIcon />
        </span>
        {!open && <span className="lc-fab-status" aria-hidden="true" />}
        <span className="lc-fab-icon lc-fab-close" aria-hidden="true">
          <X />
        </span>
      </button>
    </>
  );
}
