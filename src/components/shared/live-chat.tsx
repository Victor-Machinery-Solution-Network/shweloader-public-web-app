"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Image as ImageIcon, Maximize2, X } from "lucide-react";
import { HeadsetIcon } from "@/components/shared/icons/headset-icon";

import { useAuthUI } from "@/components/providers/auth-ui";
import { useI18n } from "@/components/providers/language-provider";
import { useAuth } from "@/lib/auth/use-auth";

type ChatMessage = {
  from: "agent" | "me";
  text: string;
  time: string;
  status?: "Sent" | "Delivered" | "Read";
};

const QUICK_REPLIES = [
  "I'm looking for an excavator",
  "Do you offer rentals?",
  "Request an inspection",
];

/**
 * Live chat support — floating gold pulsing launcher (bottom-right), shared
 * across pages. Opens on its own launcher OR when any element dispatches the
 * global `shwe:open-chat` event (e.g. the header "Messages" menu item).
 *
 * Signed-out: the launcher opens the global auth modal (sign in to chat). If the
 * panel is opened via the global event, it shows the sign-in gate instead.
 * Signed-in: the launcher toggles the chat panel (agent intro, quick replies,
 * composer). Sending is UI-only for now — realtime delivery needs Pusher.
 *
 * Motion is handled entirely by the design CSS, which already disables the
 * pulse/shake animations under `prefers-reduced-motion: reduce`.
 */
export function LiveChat() {
  const { signedIn } = useAuth();
  const { open: openAuth } = useAuthUI();
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [thread, setThread] = useState<ChatMessage[]>([
    {
      from: "agent",
      text: "Hi! How can we help you find the right machine today?",
      time: "2:30 PM",
    },
  ]);

  const fileRef = useRef<HTMLInputElement>(null);

  const now = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const openPanel = useCallback(() => {
    // Signed-out users can't chat — route them to the auth modal instead.
    if (!signedIn) {
      openAuth("signin");
      return;
    }
    setOpen(true);
  }, [signedIn, openAuth]);

  // Allow any part of the app (header Messages link, etc.) to open the chat.
  useEffect(() => {
    const onOpenChat = () => {
      // Always open the panel here; signed-out users see the sign-in gate.
      setOpen(true);
    };
    window.addEventListener("shwe:open-chat", onOpenChat);
    return () => window.removeEventListener("shwe:open-chat", onOpenChat);
  }, []);

  // TODO(pusher): wire to realtime. For now sending is UI-only and appends to
  // the local thread without dispatching to a backend / receiving agent replies.
  const send = () => {
    const text = msg.trim();
    if (!text) return;
    setThread((prev) => [
      ...prev,
      { from: "me", text, time: now(), status: "Sent" },
    ]);
    setMsg("");
  };

  const sendQuickReply = (text: string) => {
    // TODO(pusher): same realtime no-op as send().
    setThread((prev) => [
      ...prev,
      { from: "me", text, time: now(), status: "Sent" },
    ]);
  };

  const attachImages = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (!files.length) return;
    // TODO(pusher): upload + send attachments over realtime. UI-only for now.
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        setThread((prev) => [
          ...prev,
          {
            from: "me",
            text: file.name,
            time: now(),
            status: "Sent",
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const lastMe = thread.reduce(
    (acc, m, i) => (m.from === "me" ? i : acc),
    -1,
  );

  return (
    <>
      {/* Mobile-only blurred backdrop behind the panel */}
      <div
        className={"lc-backdrop" + (open ? " is-open" : "")}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div
        className={"lc-panel" + (open ? " is-open" : "")}
        role="dialog"
        aria-label={t("chat.title")}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="lc-head">
          <div className="lc-head-avatar" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <clipPath id="lcAvatarClip">
                  <circle cx="20" cy="20" r="20" />
                </clipPath>
              </defs>
              <g clipPath="url(#lcAvatarClip)">
                <rect width="40" height="40" fill="#f1d9a8" />
                {/* shoulders / shirt */}
                <path d="M2 40 C 6 30, 14 27, 20 27 C 26 27, 34 30, 38 40 Z" fill="#2a2a2a" />
                <path d="M14 28 L 20 33 L 26 28 L 26 30 L 20 35 L 14 30 Z" fill="#fff" opacity="0.92" />
                {/* neck */}
                <rect x="17.5" y="22" width="5" height="6" fill="#d9b07a" />
                {/* head */}
                <circle cx="20" cy="17" r="8" fill="#e8c290" />
                {/* hair */}
                <path d="M12 16 C 12 9, 28 9, 28 16 C 28 13, 26 11, 23 11 C 21 11, 19 12, 17 12 C 14 12, 12 13, 12 16 Z" fill="#2a1f15" />
                {/* eyes */}
                <circle cx="17" cy="17" r="0.9" fill="#2a1f15" />
                <circle cx="23" cy="17" r="0.9" fill="#2a1f15" />
                {/* smile */}
                <path d="M17.5 20 Q 20 22, 22.5 20" stroke="#7a4a2a" strokeWidth="0.8" fill="none" strokeLinecap="round" />
              </g>
            </svg>
            <span className="lc-pulse" aria-hidden="true" />
          </div>
          <div className="lc-head-meta">
            <div className="lc-head-title">ShweLoader Support</div>
            <div className="lc-head-sub">
              <span className="lc-dot" /> Online · replies in ~2 min
            </div>
          </div>
          <Link className="lc-expand" href="/chat" aria-label="Open full screen">
            <Maximize2 />
          </Link>
          <button
            type="button"
            className="lc-close"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
          >
            <X />
          </button>
        </div>

        {signedIn ? (
          <>
            <div className="lc-body">
              {thread.map((m, i) => (
                <div key={i} className={"lc-msg lc-msg-" + m.from}>
                  <div className="lc-bubble">{m.text}</div>
                  <div className="lc-meta">
                    {m.time}
                    {m.from === "me" && i === lastMe && m.status && (
                      <span className="lc-rcpt"> · {m.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="lc-quick">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="lc-quick-btn"
                  onClick={() => sendQuickReply(q)}
                >
                  {q}
                </button>
              ))}
            </div>

            <form
              className="lc-input"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  attachImages(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="lc-attach"
                onClick={() => fileRef.current?.click()}
                aria-label="Attach image"
              >
                <ImageIcon />
              </button>
              <input
                type="text"
                placeholder={t("chat.placeholder")}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                aria-label="Message"
              />
              <button
                type="submit"
                className="lc-send"
                aria-label={t("chat.send")}
                disabled={!msg.trim()}
              >
                <ArrowRight />
              </button>
            </form>
          </>
        ) : (
          <div className="lc-gate" role="region" aria-label="Sign in to chat">
            <div className="lc-gate-hero" aria-hidden="true">
              <span className="lc-gate-halo" />
              <span className="lc-gate-icon">
                <HeadsetIcon />
              </span>
            </div>

            <h3 className="lc-gate-h">Chat with our team</h3>
            <p className="lc-gate-sub">Sign in to get started.</p>

            <div className="lc-gate-cta">
              <button
                type="button"
                className="lc-gate-primary"
                onClick={() => openAuth("signin")}
              >
                {t("actions.signIn")}
                <ArrowRight className="icon-sm" />
              </button>
              <div className="lc-gate-foot">
                <button
                  type="button"
                  className="lc-gate-link"
                  onClick={() => openAuth("register")}
                >
                  Create an account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating launcher */}
      <button
        type="button"
        className={"lc-fab" + (open ? " is-open" : "")}
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label={open ? "Close chat" : "Open live chat"}
      >
        <span className="lc-fab-icon lc-fab-chat" aria-hidden="true">
          <HeadsetIcon />
        </span>
        {!open && <span className="lc-fab-status" aria-hidden="true" />}
        <span className="lc-fab-icon lc-fab-close" aria-hidden="true">
          <X />
        </span>
      </button>
    </>
  );
}
