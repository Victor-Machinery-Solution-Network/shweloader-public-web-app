"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Headset,
  Image as ImageIcon,
  Phone,
  Search,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { buildBlocks, ChatBubble, type ChatMessage } from "./chat-bubble";

/**
 * Support chat — Messenger-style two-pane client UI. Left: session list with
 * search. Right: the selected conversation thread + composer. Closed sessions
 * are read-only history.
 *
 * Data (sessions + messages) is fetched server-side and passed in via props;
 * this component owns local interaction (active session, composer, optimistic
 * echo). Sending POSTs to /api/chat/send (best-effort proxy).
 *
 * Realtime: if NEXT_PUBLIC_PUSHER_KEY is set we lazy-import "pusher-js" and
 * subscribe to the active session's channel; otherwise the thread is static.
 *
 * TODO: verify against live worker — session/message field names, the Pusher
 * channel name (`chat-session-<id>` is a guess), and the `new-message` event
 * payload shape are all UNVERIFIED.
 */
export interface ChatSession {
  id: string;
  status: "open" | "closed";
  topic?: string;
  closedBy?: string;
  closedOn?: string;
  messages: ChatMessage[];
}

interface ChatShellProps {
  sessions: ChatSession[];
  /** Phone number for the "call support" affordance. */
  supportPhone?: string;
  pusherKey?: string;
  pusherCluster?: string;
}

const lastMsg = (s: ChatSession): ChatMessage => s.messages[s.messages.length - 1] ?? {} as ChatMessage;
const previewOf = (s: ChatSession): string => {
  const m = lastMsg(s);
  return m.image ? "📷 Photo" : m.text ?? "";
};
const dayOf = (s: ChatSession): string => lastMsg(s).day ?? "";

const SUPPORT_NAME = "ShweLoader Support";

export function ChatShell({
  sessions: initial,
  supportPhone = "+95977123456",
  pusherKey,
  pusherCluster = "ap1",
}: ChatShellProps) {
  const [sessions, setSessions] = useState<ChatSession[]>(initial);
  const [activeId, setActiveId] = useState<string>(
    () => initial.find((s) => s.status === "open")?.id ?? initial[initial.length - 1]?.id ?? "",
  );
  const [msg, setMsg] = useState("");
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? sessions[sessions.length - 1],
    [sessions, activeId],
  );

  const now = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Scroll the thread to the bottom on session switch / new message.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activeId, active?.messages.length]);

  const appendToActive = useCallback(
    (m: ChatMessage) =>
      setSessions((ss) =>
        ss.map((s) =>
          s.id === activeId ? { ...s, messages: [...s.messages, m] } : s,
        ),
      ),
    [activeId],
  );

  // Realtime subscription (best-effort). Only when a key is configured.
  useEffect(() => {
    if (!pusherKey || !activeId) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    // Lazy-import so pusher-js never loads when realtime is off.
    import("pusher-js")
      .then(({ default: Pusher }) => {
        if (cancelled) return;
        // TODO: verify against live worker — channel name + event name guessed.
        const pusher = new Pusher(pusherKey, { cluster: pusherCluster });
        const channel = pusher.subscribe(`chat-session-${activeId}`);
        const onMessage = (data: unknown) => {
          const m = data as Partial<ChatMessage> | null;
          if (!m || typeof m.text !== "string") return;
          appendToActive({
            from: m.from === "me" ? "me" : "agent",
            name: m.name ?? SUPPORT_NAME,
            text: m.text,
            time: m.time ?? now(),
            day: m.day ?? "Today",
          });
        };
        channel.bind("new-message", onMessage);
        cleanup = () => {
          channel.unbind("new-message", onMessage);
          pusher.unsubscribe(`chat-session-${activeId}`);
          pusher.disconnect();
        };
      })
      .catch(() => {
        /* realtime is optional — ignore load/subscribe failures */
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [pusherKey, pusherCluster, activeId, appendToActive]);

  const send = useCallback(async () => {
    if (!active || active.status !== "open") return;
    const text = msg.trim();
    if (!text) return;
    // Optimistic echo.
    appendToActive({ from: "me", text, time: now(), day: "Today", status: "Sending…" });
    setMsg("");
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: active.id, text }),
      });
      if (res.status === 403) {
        const d = (await res.json().catch(() => ({}))) as {
          error?: string;
          reason?: string;
        };
        if (d.error === "ACCOUNT_BLACKLISTED") {
          window.dispatchEvent(
            new CustomEvent("account-blacklisted", {
              detail: { reason: d.reason },
            }),
          );
        }
      }
      // Mark the last optimistic message as Sent or Failed.
      setSessions((ss) =>
        ss.map((s) => {
          if (s.id !== active.id) return s;
          const messages = [...s.messages];
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].from === "me" && messages[i].status === "Sending…") {
              messages[i] = { ...messages[i], status: res.ok ? "Sent" : "Not delivered" };
              break;
            }
          }
          return { ...s, messages };
        }),
      );
    } catch {
      setSessions((ss) =>
        ss.map((s) => {
          if (s.id !== active.id) return s;
          const messages = [...s.messages];
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].from === "me" && messages[i].status === "Sending…") {
              messages[i] = { ...messages[i], status: "Not delivered" };
              break;
            }
          }
          return { ...s, messages };
        }),
      );
    }
  }, [active, msg, appendToActive]);

  const attach = useCallback(
    (list: FileList | null) => {
      if (!active || active.status !== "open") return;
      const files = Array.from(list || []).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (!files.length) return;
      // Local preview only — upload wiring is unverified. // TODO: verify against live worker.
      for (const file of files) {
        const r = new FileReader();
        r.onload = () =>
          appendToActive({
            from: "me",
            image: typeof r.result === "string" ? r.result : undefined,
            name: file.name,
            time: now(),
            day: "Today",
            status: "Sent",
          });
        r.readAsDataURL(file);
      }
    },
    [active, appendToActive],
  );

  const visibleSessions = sessions
    .slice()
    .reverse()
    .filter(
      (s) =>
        !query.trim() ||
        previewOf(s).toLowerCase().includes(query.toLowerCase()),
    );

  if (!active) {
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

  const blocks = buildBlocks(active.messages);

  return (
    <div className="chat-shell2">
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
                s.status === "closed" && "is-closed",
              )}
              onClick={() => setActiveId(s.id)}
            >
              <span className="sess-av" aria-hidden="true">
                <Headset />
                {s.status === "open" && <span className="sess-on" />}
              </span>
              <span className="sess-main">
                <span className="sess-top">
                  <span className="sess-name">{SUPPORT_NAME}</span>
                  <span className="sess-time">{dayOf(s)}</span>
                </span>
                <span className="sess-prev">{previewOf(s)}</span>
                <span className="sess-meta">
                  <span className={cn("sess-status", s.status)}>
                    {s.status === "open" ? "Open" : "Closed"}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* Right: conversation */}
      <section className="chat-conv">
        <div className="chat-card-head">
          <span className="chat-id-av" aria-hidden="true">
            <Headset />
            {active.status === "open" && <span className="chat-id-on" />}
          </span>
          <div className="chat-id-meta">
            <div className="chat-id-name">{SUPPORT_NAME}</div>
            {active.status === "open" ? (
              <div className="chat-id-status">Active now</div>
            ) : (
              <div className="chat-id-status is-closed">
                Session closed{active.closedOn ? ` · ${active.closedOn}` : ""}
              </div>
            )}
          </div>
          <a
            href={`tel:${supportPhone}`}
            className="chat-id-call"
            aria-label="Call support"
          >
            <Phone />
          </a>
        </div>

        <div className="chat-card-body" ref={bodyRef}>
          {blocks.map((b, i) => (
            <ChatBubble key={b.kind === "day" ? `d${i}` : `g${i}`} block={b} />
          ))}
          {active.status === "closed" && (
            <div className="chat-closed-note">
              This session was closed
              {active.closedBy ? ` by ${active.closedBy}` : ""}
              {active.closedOn ? ` · ${active.closedOn}` : ""}
            </div>
          )}
        </div>

        {active.status === "open" ? (
          <form
            className="chat-card-foot"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                attach(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className="chat-attach"
              onClick={() => fileRef.current?.click()}
              aria-label="Attach image"
            >
              <ImageIcon />
            </button>
            <input
              type="text"
              className="chat-foot-input"
              placeholder="Type a message…"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              aria-label="Message"
            />
            <button
              type="submit"
              className="chat-send"
              aria-label="Send"
              disabled={!msg.trim()}
            >
              <ArrowUp />
            </button>
          </form>
        ) : (
          <div className="chat-foot-closed">
            <span className="chat-foot-closed-text">
              This chat session has ended.
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
