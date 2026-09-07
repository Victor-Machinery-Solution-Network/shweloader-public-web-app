import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { noindexMetadata } from "@/lib/seo/metadata";
import { getToken } from "@/lib/auth/session";
import { apiFetch } from "@/lib/api/client";
import { redirectIfBlacklisted } from "@/lib/auth/blacklist-redirect";
import { getSiteSettings } from "@/lib/api/settings";
import { ChatShell } from "@/components/chat/chat-shell";
import { ChatSignedOut } from "@/components/chat/chat-signed-out";
import type { ChatSession } from "@/components/chat/core/types";

import "@/styles/pages/chat.css";

export const metadata = noindexMetadata;

// Raw row shapes from the worker's GET /chat/sessions response.
interface RawSession {
  id?: string | number;
  status?: string;
  unread_user_count?: number;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  admin_last_read_at?: string | null;
}

function mapStatus(raw: string | undefined): ChatSession["status"] {
  const s = (raw ?? "").toLowerCase();
  if (s === "resolved" || s === "closed") return "resolved";
  if (s === "pending") return "pending";
  return "active";
}

function normalizeSession(row: RawSession): ChatSession {
  return {
    id: Number(row.id),
    status: mapStatus(row.status),
    unreadUserCount: row.unread_user_count ?? 0,
    lastMessageAt: row.last_message_at ?? null,
    lastMessagePreview: row.last_message_preview ?? null,
    adminLastReadAt: row.admin_last_read_at ?? null,
  };
}

/** Defensive fetch of sessions. Returns [] on any failure. */
async function loadSessions(token: string): Promise<ChatSession[]> {
  try {
    const raw = await apiFetch<unknown>("/chat/sessions", { token });
    const list: RawSession[] = Array.isArray(raw)
      ? (raw as RawSession[])
      : Array.isArray((raw as { sessions?: RawSession[] })?.sessions)
        ? ((raw as { sessions: RawSession[] }).sessions)
        : [];
    // Drop rows the API returned without an id — `Number(undefined)` is NaN and
    // `Number(null)` is 0, and an id of 0 trips every `!sessionId` guard
    // (send/markRead/Pusher), silently breaking the session.
    return list.filter((r) => r.id != null).map(normalizeSession);
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

  const [sessions, { contactPhone }] = await Promise.all([
    loadSessions(token),
    getSiteSettings(),
  ]);

  // No sessions is a real state, not one to paper over: ChatShell renders an
  // empty thread + composer and the first send creates the session (see
  // useChatSync.send). Creating one here left an empty "pending" row for
  // anyone who merely visited the page.
  return <ChatShell sessions={sessions} supportPhone={contactPhone} />;
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
