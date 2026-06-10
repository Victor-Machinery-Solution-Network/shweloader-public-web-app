import type { ChatMessage } from "./types";

/** "Seen" when admin's last-read is at/after this message; else "Sent". Only
 *  rendered on the last outgoing message. */
export function SeenTick({ message, adminReadAt }: { message: ChatMessage; adminReadAt: string | null }) {
  if (message.status === "sending") return <span className="chat-tick">Sending…</span>;
  if (message.status === "failed") return <span className="chat-tick is-failed">Not delivered</span>;
  const seen = adminReadAt != null && new Date(adminReadAt) >= new Date(message.createdAt);
  return <span className="chat-tick">{seen ? "Seen" : "Sent"}</span>;
}
