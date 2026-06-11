"use client";
import { useEffect, useRef, useState } from "react";
import type { Channel } from "pusher-js";
import { getPusher } from "./pusher-client";
import { useChatStore } from "./store";
import { fromPusherMessage } from "./mappers";
import type { PusherMessage } from "./types";

/** Subscribe to the active session's realtime channel. Returns transient UI
 *  state (admin typing). Messages/read-state land in the store. */
export function usePusherChat(sessionId: number | null): { adminTyping: boolean } {
  const [adminTyping, setAdminTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addMessage = useChatStore((s) => s.addMessage);
  const bumpUnread = useChatStore((s) => s.bumpUnread);
  const setAdminReadAt = useChatStore((s) => s.setAdminReadAt);
  const setSessionStatus = useChatStore((s) => s.setSessionStatus);

  useEffect(() => {
    if (!sessionId) return;
    let channel: Channel | undefined;
    let cancelled = false;
    const name = `private-chat-${sessionId}`;

    getPusher().then((pusher) => {
      if (!pusher || cancelled) return;
      channel = pusher.subscribe(name);

      channel.bind("new-message", (raw: PusherMessage) => {
        const m = fromPusherMessage(raw);
        const added = addMessage(sessionId, m);
        // Only count unread for genuinely new, non-self messages.
        if (added && m.senderType !== "user") bumpUnread(sessionId);
      });

      channel.bind("messages-read", (raw: { reader_type: string; read_at: string }) => {
        if (raw.reader_type === "admin") setAdminReadAt(sessionId, raw.read_at);
      });

      channel.bind("typing-start", (raw: { sender_type: string }) => {
        if (raw.sender_type !== "admin") return;
        setAdminTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setAdminTyping(false), 1500);
      });

      channel.bind("session-reopened", () => {
        setSessionStatus(sessionId, "active");
      });

      // Defensive: the worker may emit this in a future release.
      channel.bind("session-resolved", () => {
        setSessionStatus(sessionId, "resolved");
      });
    });

    return () => {
      cancelled = true;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      getPusher().then((pusher) => {
        if (!pusher) return;
        pusher.unsubscribe(name);
      });
    };
  }, [sessionId, addMessage, bumpUnread, setAdminReadAt, setSessionStatus]);

  return { adminTyping };
}
