"use client";

import { Headset } from "lucide-react";
import { useAuthUI } from "@/components/providers/auth-ui";

/**
 * Signed-out gate for the support chat page. Renders inside the two-pane shell
 * frame so the layout stays coherent, and opens the global auth modal.
 */
export function ChatSignedOut() {
  const { open } = useAuthUI();
  return (
    <div className="chat-shell2">
      <section className="chat-conv" style={{ gridColumn: "1 / -1" }}>
        <div
          className="chat-card-body"
          style={{
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: 14,
          }}
        >
          <span className="chat-id-av" aria-hidden="true">
            <Headset />
          </span>
          <div className="chat-id-name">Sign in to chat with support</div>
          <p className="chat-id-status" style={{ maxWidth: 320 }}>
            Get help finding the right machine, book an inspection, or ask about
            listing fees — our team typically replies in under 5 minutes.
          </p>
          <button
            type="button"
            className="chat-restart"
            onClick={() => open("signin")}
          >
            Sign in
          </button>
        </div>
      </section>
    </div>
  );
}
