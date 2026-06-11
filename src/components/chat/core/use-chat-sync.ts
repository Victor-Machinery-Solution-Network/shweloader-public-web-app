"use client";
import { useCallback, useEffect, useRef } from "react";
import { useChatStore, nextTempId } from "./store";
import { fromServerMessage, messageKey } from "./mappers";
import type { ChatAttachment, ChatMessage, ServerMessage } from "./types";

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function useChatSync(sessionId: number | null) {
  const setMessages = useChatStore((s) => s.setMessages);
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
        const extras = (useChatStore.getState().messages[sessionId] ?? []).filter(
          (m) => !seen.has(messageKey(m)),
        );
        setMessages(sessionId, [...history, ...extras]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionId, setMessages]);

  const send = useCallback(
    async (text: string, attachments?: ChatAttachment[]) => {
      if (!sessionId) return;
      const trimmed = text.trim();
      if (!trimmed && !(attachments?.length)) return;
      const tempId = nextTempId();
      const optimistic: ChatMessage = {
        id: tempId,
        serverId: null,
        senderType: "user",
        senderName: null,
        text: trimmed || null,
        attachments: attachments ?? [],
        product: null,
        createdAt: new Date().toISOString(),
        status: "sending",
      };
      addOptimistic(sessionId, optimistic);
      try {
        const res = await postJson("/api/chat/send", {
          sessionId,
          text: trimmed,
          attachments: attachments?.length ? attachments : undefined,
        });
        if (res.ok) {
          const { messageId } = (await res.json()) as { messageId: number };
          confirmOptimistic(sessionId, tempId, messageId);
        } else {
          setStatus(sessionId, tempId, "failed");
          if (res.status === 403) {
            const d = (await res.json().catch(() => ({}))) as { error?: string; reason?: string };
            if (d.error === "ACCOUNT_BLACKLISTED") {
              window.dispatchEvent(new CustomEvent("account-blacklisted", { detail: { reason: d.reason } }));
            }
          }
        }
      } catch {
        setStatus(sessionId, tempId, "failed");
      }
    },
    [sessionId, addOptimistic, confirmOptimistic, setStatus],
  );

  const markRead = useCallback(() => {
    if (!sessionId) return;
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
