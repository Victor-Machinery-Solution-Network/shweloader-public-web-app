"use client";

import { Bell } from "lucide-react";
import { useAuthUI } from "@/components/providers/auth-ui";

/** Friendly signed-out state — opens the global auth modal on sign-in. */
export function SignedOutPrompt() {
  const { open } = useAuthUI();
  return (
    <div className="nf-empty">
      <span className="nf-empty-ic" aria-hidden="true">
        <Bell strokeWidth={1.75} />
      </span>
      <div className="nf-empty-h">Sign in to see your notifications</div>
      <div className="nf-empty-s">
        Account updates, partner status changes, and replies from ShweLoader
        Support appear here once you&apos;re signed in.
      </div>
      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: 18 }}
        onClick={() => open("signin")}
      >
        Sign in
      </button>
    </div>
  );
}
