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
  const updateMessage = useChatStore((s) => s.updateMessage);

  useEffect(() => {
    if (!sessionId) return;
    let channel: Channel | undefined;
    let cancelled = false;
    const name = `private-chat-${sessionId}`;

    getPusher().then((pusher) => {
      if (!pusher || cancelled) return;
      channel = pusher.subscribe(name);

      // Diagnostics: make the private-channel handshake visible in the console so
      // a subscribe/auth failure (the usual cause of "outbound works, inbound
      // dead") is obvious rather than silent.
      channel.bind("pusher:subscription_succeeded", () => {
        console.info("[chat] subscribed OK:", name);
      });
      channel.bind("pusher:subscription_error", (status: unknown) => {
        console.error("[chat] subscription_error:", name, status);
      });

      channel.bind("new-message", (raw: PusherMessage) => {
        const m = fromPusherMessage(raw);
        const added = addMessage(sessionId, m);
        // Only count unread for genuinely new, non-self messages — and not when
        // the user is actively viewing this session in a visible tab (it'll be
        // read immediately, so bumping would flash a phantom unread badge).
        if (added && m.senderType !== "user") {
          const activeVisible =
            useChatStore.getState().activeSessionId === sessionId &&
            typeof document !== "undefined" &&
            document.visibilityState === "visible";
          if (!activeVisible) bumpUnread(sessionId);
        }
      });

      // An admin edited or deleted a message in this thread. The payload is
      // deliberately not viewer-specific — every client re-renders from these
      // fields. Older builds simply don't bind this and pick the change up on
      // their next fetch.
      channel.bind(
        "message-updated",
        (raw: {
          messageId: number;
          message: string | null;
          editedAt?: string | null;
          deletedAt?: string | null;
        }) => {
          // Spreading `edited: undefined` would clobber a true already in the
          // store, so only include the key when the event actually sets it.
          updateMessage(sessionId, raw.messageId, {
            text: raw.deletedAt ? null : raw.message,
            deletedAt: raw.deletedAt ?? null,
            ...(raw.editedAt ? { edited: true } : {}),
          });
        },
      );

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
  }, [sessionId, addMessage, bumpUnread, setAdminReadAt, setSessionStatus, updateMessage]);

  return { adminTyping };
}
