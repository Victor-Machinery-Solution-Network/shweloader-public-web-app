import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { noindexMetadata } from "@/lib/seo/metadata";
import { getToken } from "@/lib/auth/session";
import { apiFetch } from "@/lib/api/client";
import { redirectIfBlacklisted } from "@/lib/auth/blacklist-redirect";
import { PUSHER_KEY, PUSHER_CLUSTER } from "@/lib/env";
import { ChatShell, type ChatSession } from "@/components/chat/chat-shell";
import { ChatSignedOut } from "@/components/chat/chat-signed-out";
import type { ChatMessage } from "@/components/chat/chat-bubble";

import "@/styles/pages/chat.css";

export const metadata = noindexMetadata;

// Loosely-typed worker shapes — the /chat endpoints are UNVERIFIED.
// We treat every field as optional and normalize defensively.
// TODO: verify against live worker.
interface RawMessage {
  from?: string;
  sender?: string;
  name?: string;
  text?: string;
  message?: string;
  body?: string;
  image?: string;
  imageUrl?: string;
  time?: string;
  createdAt?: string;
  day?: string;
  status?: string;
}

interface RawSession {
  id?: string | number;
  sessionId?: string | number;
  status?: string;
  state?: string;
  topic?: string;
  subject?: string;
  closedBy?: string;
  closedOn?: string;
  closedAt?: string;
  messages?: RawMessage[];
}

function normalizeMessage(m: RawMessage): ChatMessage {
  const senderRaw = (m.from ?? m.sender ?? "agent").toLowerCase();
  const isMe = senderRaw === "me" || senderRaw === "user" || senderRaw === "self";
  return {
    from: isMe ? "me" : "agent",
    name: m.name,
    text: m.text ?? m.message ?? m.body ?? "",
    image: m.image ?? m.imageUrl,
    time: m.time ?? m.createdAt ?? "",
    day: m.day ?? "Today",
    status: m.status,
  };
}

function normalizeSession(s: RawSession, idx: number): ChatSession {
  const statusRaw = (s.status ?? s.state ?? "open").toLowerCase();
  const status: ChatSession["status"] = statusRaw === "closed" ? "closed" : "open";
  return {
    id: String(s.id ?? s.sessionId ?? `s${idx}`),
    status,
    topic: s.topic ?? s.subject,
    closedBy: s.closedBy,
    closedOn: s.closedOn ?? s.closedAt,
    messages: Array.isArray(s.messages) ? s.messages.map(normalizeMessage) : [],
  };
}

/** Defensive fetch of sessions (+ their messages). Returns [] on any failure. */
async function loadSessions(token: string): Promise<ChatSession[]> {
  try {
    // TODO: verify against live worker — path + response envelope are best-effort.
    const raw = await apiFetch<unknown>("/chat/sessions", { token });
    const list: RawSession[] = Array.isArray(raw)
      ? (raw as RawSession[])
      : Array.isArray((raw as { sessions?: RawSession[] })?.sessions)
        ? ((raw as { sessions: RawSession[] }).sessions)
        : [];
    const sessions = list.map(normalizeSession);

    // Some workers return sessions without inlined messages — best-effort
    // hydrate each thread. Failures degrade to an empty thread, never throw.
    await Promise.all(
      sessions.map(async (s) => {
        if (s.messages.length > 0) return;
        try {
          // TODO: verify against live worker — message endpoint shape unverified.
          const msgRaw = await apiFetch<unknown>(
            `/chat/sessions/${encodeURIComponent(s.id)}/messages`,
            { token },
          );
          const msgs: RawMessage[] = Array.isArray(msgRaw)
            ? (msgRaw as RawMessage[])
            : Array.isArray((msgRaw as { messages?: RawMessage[] })?.messages)
              ? ((msgRaw as { messages: RawMessage[] }).messages)
              : [];
          s.messages = msgs.map(normalizeMessage);
        } catch {
          /* leave thread empty */
        }
      }),
    );

    return sessions;
  } catch (e) {
    redirectIfBlacklisted(e);
    return [];
  }
}

function ChatLoading() {
  return (
    <div className="chat-shell2" aria-busy="true">
      <section className="chat-conv" style={{ gridColumn: "1 / -1" }}>
        <div
          className="chat-card-body"
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          <div className="chat-day">
            <span>Loading conversations…</span>
          </div>
        </div>
      </section>
    </div>
  );
}

async function Content() {
  const token = await getToken();

  if (!token) {
    return <ChatSignedOut />;
  }

  const sessions = await loadSessions(token);

  if (sessions.length === 0) {
    // Seed a single empty open session so the user can start chatting even
    // when the worker returns nothing (or the endpoint is unavailable).
    const seed: ChatSession[] = [
      {
        id: "new",
        status: "open",
        topic: "Support",
        messages: [
          {
            from: "agent",
            name: "ShweLoader Support",
            text: "Hi! How can we help you find the right machine today?",
            time: "",
            day: "Today",
          },
        ],
      },
    ];
    return (
      <ChatShell
        sessions={seed}
        pusherKey={PUSHER_KEY || undefined}
        pusherCluster={PUSHER_CLUSTER}
      />
    );
  }

  return (
    <ChatShell
      sessions={sessions}
      pusherKey={PUSHER_KEY || undefined}
      pusherCluster={PUSHER_CLUSTER}
    />
  );
}

export default function ChatPage() {
  return (
    <div className="chat-page" data-screen-label="Support chat">
      <div className="chat-wrap">
        <nav className="chat-crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <ChevronRight className="icon-sm" />
          <span className="cur">Support</span>
        </nav>

        <Suspense fallback={<ChatLoading />}>
          <Content />
        </Suspense>
      </div>
    </div>
  );
}
