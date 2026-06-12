"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ChatMessage } from "./types";
import { MessageBubble } from "./MessageBubble";
import { TypingDots } from "./TypingDots";

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay ? "Today" : d.toLocaleDateString([], { month: "short", day: "numeric" });
};

export function Thread({
  messages,
  adminReadAt,
  adminTyping,
}: {
  messages: ChatMessage[];
  adminReadAt: string | null;
  adminTyping: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Tracked via ref (not state) so the new-message effect reads it without
  // re-subscribing — avoids yanking a user who has scrolled up to read history.
  const atBottomRef = useRef(true);
  const prevCountRef = useRef(messages.length);
  const [showFab, setShowFab] = useState(false);
  const [newCount, setNewCount] = useState(0);

  // Scroll the container straight to the bottom. NOTE: smooth scrolling (both
  // scrollIntoView and scrollTo with behavior:"smooth") silently no-ops inside
  // this nested flex scroll area — only instant works — so we jump instantly.
  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
    atBottomRef.current = true;
    setNewCount(0);
    setShowFab(false);
  };

  // New message / typing: pin to bottom only if the user is already there;
  // otherwise count the arrivals for the FAB badge (mobile parity).
  useEffect(() => {
    const delta = messages.length - prevCountRef.current;
    prevCountRef.current = messages.length;
    if (atBottomRef.current) {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight });
    } else if (delta > 0) {
      setNewCount((n) => n + delta);
      setShowFab(true);
    }
  }, [messages.length, adminTyping]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = atBottom;
    if (atBottom) {
      setShowFab(false);
      setNewCount(0);
    } else {
      setShowFab(true);
    }
  };

  const lastOutgoingIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].senderType === "user") return i;
    return -1;
  })();

  const days = messages.map((m, i) => {
    const day = dayLabel(m.createdAt);
    const prev = i > 0 ? dayLabel(messages[i - 1].createdAt) : "";
    return day !== prev ? day : null;
  });

  // Consecutive same-sender messages within a 3-min window (and no day break
  // between them) are visually grouped: tighter spacing, connected corners, and
  // a single timestamp at the group's bottom (mobile parity).
  const GROUP_WINDOW_MS = 3 * 60 * 1000;
  // Group by visual SIDE (user vs support), not exact senderType — so a support
  // auto-reply (system) and a human admin message stack together, as they do on
  // the same side of the thread.
  const sameSide = (a: ChatMessage, b: ChatMessage) =>
    (a.senderType === "user") === (b.senderType === "user");
  const grouped = messages.map((m, i) => {
    const ms = new Date(m.createdAt).getTime();
    const withPrev =
      i > 0 &&
      sameSide(messages[i - 1], m) &&
      days[i] === null &&
      ms - new Date(messages[i - 1].createdAt).getTime() < GROUP_WINDOW_MS;
    const withNext =
      i < messages.length - 1 &&
      sameSide(messages[i + 1], m) &&
      days[i + 1] === null &&
      new Date(messages[i + 1].createdAt).getTime() - ms < GROUP_WINDOW_MS;
    return { withPrev, withNext };
  });

  return (
    <div className="chat-thread">
      <div
        className="chat-card-body"
        ref={scrollRef}
        onScroll={onScroll}
        role="log"
        aria-label="Chat messages"
      >
        {/* Persistent polite live region so AT reliably announces typing. */}
        <div aria-live="polite" className="sr-only">
          {adminTyping ? "Support is typing" : ""}
        </div>
        {messages.map((m, i) => (
          <div key={m.id}>
            {days[i] !== null && (
              <div className="chat-day" key={`d${i}`}><span>{days[i]}</span></div>
            )}
            <MessageBubble
              message={m}
              isLastOutgoing={i === lastOutgoingIdx}
              adminReadAt={adminReadAt}
              groupedWithPrev={grouped[i].withPrev}
              groupedWithNext={grouped[i].withNext}
            />
          </div>
        ))}
        {adminTyping && <TypingDots />}
      </div>

      {showFab && (
        <button
          type="button"
          className="chat-scroll-fab"
          onClick={scrollToBottom}
          aria-label={newCount > 0 ? `${newCount} new messages — scroll to latest` : "Scroll to latest"}
        >
          <ChevronDown aria-hidden="true" />
          {newCount > 0 && <span className="chat-scroll-fab-badge">{newCount > 9 ? "9+" : newCount}</span>}
        </button>
      )}
    </div>
  );
}
