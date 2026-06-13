"use client";
import { useCallback, useEffect, useRef } from "react";
import { useChatStore, nextTempId } from "./store";
import { fromServerMessage, messageKey } from "./mappers";
import { startNewSession } from "./refresh-sessions";
import type { ChatAttachment, ChatMessage, ProductRef, ServerMessage } from "./types";

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function useChatSync(sessionId: number | null) {
  const addOptimistic = useChatStore((s) => s.addOptimistic);
  const confirmOptimistic = useChatStore((s) => s.confirmOptimistic);
  const setStatus = useChatStore((s) => s.setStatus);
  const setUnread = useChatStore((s) => s.setUnread);
  const lastTypingSent = useRef(0);

  // Load history when a session becomes active. MERGE (don't clobber): any live
  // Pusher message or optimistic send that landed during the fetch is preserved
  // by appending current entries whose key isn't already in the fetched history.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    fetch(`/api/chat/history?sessionId=${sessionId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((data: { messages: ServerMessage[] }) => {
        if (cancelled) return;
        const history = (data.messages ?? []).map(fromServerMessage);
        const seen = new Set(history.map(messageKey));
        // Compute `extras` against the CURRENT state inside the updater (not a
        // pre-read snapshot) so a live/optimistic message that arrives between
        // the fetch resolving and the commit isn't dropped by the replace.
        useChatStore.setState((st) => {
          const current = st.messages[sessionId] ?? [];
          const extras = current.filter((m) => !seen.has(messageKey(m)));
          return { messages: { ...st.messages, [sessionId]: [...history, ...extras] } };
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const send = useCallback(
    async (
      text: string,
      attachments?: ChatAttachment[],
      listing?: { saleListingId?: number; rentListingId?: number },
      product?: ProductRef | null,
    ) => {
      if (!sessionId) return;
      const trimmed = text.trim();
      // Allow sending if there's text, attachments, or a listing reference.
      if (!trimmed && !(attachments?.length) && !listing) return;

      // If the active conversation was closed by an admin, a new message starts
      // a FRESH session (mobile parity) — we never reopen the resolved one. Spin
      // up a new session and target it; the closed thread stays as read-only
      // history. Bail if creating one failed (don't silently reopen the closed
      // session via the worker's reopen-on-send path).
      let targetId = sessionId;
      const current = useChatStore
        .getState()
        .sessions.find((s) => s.id === sessionId);
      if (current?.status === "resolved") {
        const fresh = await startNewSession();
        if (fresh == null) return;
        targetId = fresh;
      }

      const tempId = nextTempId();
      const optimistic: ChatMessage = {
        id: tempId,
        serverId: null,
        senderType: "user",
        senderName: null,
        text: trimmed || null,
        attachments: attachments ?? [],
        // Show the enquiry's product card immediately (mobile parity) instead of
        // waiting for the server echo / history reload to attach it.
        product: product ?? null,
        createdAt: new Date().toISOString(),
        status: "sending",
      };
      addOptimistic(targetId, optimistic);
      try {
        const res = await postJson("/api/chat/send", {
          sessionId: targetId,
          text: trimmed,
          attachments: attachments?.length ? attachments : undefined,
          saleListingId: listing?.saleListingId,
          rentListingId: listing?.rentListingId,
        });
        if (res.ok) {
          const { messageId } = (await res.json()) as { messageId: number };
          confirmOptimistic(targetId, tempId, messageId);
        } else {
          setStatus(targetId, tempId, "failed");
          if (res.status === 403) {
            const d = (await res.json().catch(() => ({}))) as { error?: string; reason?: string };
            if (d.error === "ACCOUNT_BLACKLISTED") {
              window.dispatchEvent(new CustomEvent("account-blacklisted", { detail: { reason: d.reason } }));
            }
          }
        }
      } catch {
        setStatus(targetId, tempId, "failed");
      }
    },
    [sessionId, addOptimistic, confirmOptimistic, setStatus],
  );

  const markRead = useCallback(() => {
    if (!sessionId) return;
    // Read the guard BEFORE zeroing: if there's nothing unread, bail without
    // touching state. This also avoids a TOCTOU where a message arriving
    // between the zero and the POST would be silently cleared locally.
    const s = useChatStore.getState().sessions.find((x) => x.id === sessionId);
    if (!s || s.unreadUserCount === 0) return; // nothing to clear server-side
    setUnread(sessionId, 0);
    void postJson("/api/chat/read", { sessionId }).catch(() => {});
  }, [sessionId, setUnread]);

  const notifyTyping = useCallback(() => {
    if (!sessionId) return;
    const t = Date.now();
    if (t - lastTypingSent.current < 1000) return; // throttle 1s
    lastTypingSent.current = t;
    void postJson("/api/chat/typing", { sessionId }).catch(() => {});
  }, [sessionId]);

  return { send, markRead, notifyTyping };
}
