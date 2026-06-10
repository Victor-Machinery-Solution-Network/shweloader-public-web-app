import { cn } from "@/lib/utils";
import type { ChatMessage } from "./types";
import { SeenTick } from "./SeenTick";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function MessageBubble({
  message,
  isLastOutgoing,
  adminReadAt,
}: {
  message: ChatMessage;
  isLastOutgoing: boolean;
  adminReadAt: string | null;
}) {
  const mine = message.senderType === "user";
  return (
    <div className={cn("chat-msg", mine ? "is-me" : "is-agent")}>
      {message.text && <div className="chat-bubble">{message.text}</div>}
      <div className="chat-msg-meta">
        <span className="chat-msg-time">{fmtTime(message.createdAt)}</span>
        {mine && isLastOutgoing && <SeenTick message={message} adminReadAt={adminReadAt} />}
      </div>
    </div>
  );
}
