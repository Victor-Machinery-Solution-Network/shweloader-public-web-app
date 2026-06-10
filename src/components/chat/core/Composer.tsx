"use client";
import { useState } from "react";
import { ArrowUp } from "lucide-react";

export function Composer({
  onSend,
  onTyping,
  disabled,
}: {
  onSend: (text: string) => void;
  onTyping: () => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };
  return (
    <form
      className="chat-card-foot"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        type="text"
        className="chat-foot-input"
        placeholder="Type a message…"
        value={text}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          onTyping();
        }}
        aria-label="Message"
      />
      <button type="submit" className="chat-send" aria-label="Send" disabled={disabled || !text.trim()}>
        <ArrowUp />
      </button>
    </form>
  );
}
