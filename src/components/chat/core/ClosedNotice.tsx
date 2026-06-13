"use client";
import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { startNewSession } from "./refresh-sessions";

interface ClosedNoticeProps {
  /** Short note explaining the conversation is closed (i18n string). */
  note: string;
  /** Label for the start-new-conversation button (i18n string). */
  action: string;
}

/**
 * Shown in place of the Composer when the active session was closed by an admin
 * (`status === "resolved"`). A resolved thread is read-only — instead of typing
 * to silently reopen it, the user explicitly starts a fresh conversation. That
 * new session becomes active (via `startNewSession` → store `setActive`), so both
 * the floating widget and the `/chat` page reactively swap back to the Composer;
 * the closed thread stays in the store as read-only history.
 *
 * Shared by both chat surfaces so the closed-session UX stays in parity.
 */
export function ClosedNotice({ note, action }: ClosedNoticeProps) {
  const [creating, setCreating] = useState(false);

  async function handleStart() {
    if (creating) return; // guard against double-clicks while the POST is in flight
    setCreating(true);
    try {
      await startNewSession();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="chat-foot-closed" role="status">
      <span className="chat-foot-closed-text">{note}</span>
      <button
        type="button"
        className="chat-restart"
        onClick={handleStart}
        disabled={creating}
      >
        <MessageSquarePlus aria-hidden="true" />
        {action}
      </button>
    </div>
  );
}
