"use client";
import { useEffect, useRef } from "react";
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
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, adminTyping]);

  const lastOutgoingIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].senderType === "user") return i;
    return -1;
  })();

  const days = messages.map((m, i) => {
    const day = dayLabel(m.createdAt);
    const prev = i > 0 ? dayLabel(messages[i - 1].createdAt) : "";
    return day !== prev ? day : null;
  });

  return (
    <div className="chat-card-body">
      {messages.map((m, i) => (
        <div key={m.id}>
          {days[i] !== null && (
            <div className="chat-day" key={`d${i}`}><span>{days[i]}</span></div>
          )}
          <MessageBubble message={m} isLastOutgoing={i === lastOutgoingIdx} adminReadAt={adminReadAt} />
        </div>
      ))}
      {adminTyping && <TypingDots />}
      <div ref={endRef} />
    </div>
  );
}
