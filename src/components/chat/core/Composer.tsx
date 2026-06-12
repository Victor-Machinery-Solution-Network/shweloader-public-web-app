"use client";
import { useRef, useState } from "react";
import { ArrowUp, Paperclip, X } from "lucide-react";
import type { ChatAttachment } from "./types";

interface PendingFile {
  /** Client-side key for React list rendering. */
  key: string;
  file: File;
  /** Local blob URL for image previews (revoked on cleanup/remove). */
  previewUrl: string | null;
  /** Upload state. */
  status: "uploading" | "done" | "error";
  /** Populated once the upload completes. */
  attachment: ChatAttachment | null;
}

let keyCounter = 0;
function nextKey() {
  keyCounter += 1;
  return `pf-${keyCounter}`;
}


export function Composer({
  onSend,
  onTyping,
  disabled,
  sessionId,
}: {
  onSend: (
    text: string,
    attachments?: ChatAttachment[],
    listing?: { saleListingId?: number; rentListingId?: number },
  ) => void;
  onTyping: () => void;
  disabled?: boolean;
  sessionId: number | null;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const anyUploading = pending.some((p) => p.status === "uploading");
  const doneAttachments = pending
    .filter((p) => p.status === "done" && p.attachment != null)
    .map((p) => p.attachment as ChatAttachment);

  const canSend = !disabled && !anyUploading && (text.trim().length > 0 || doneAttachments.length > 0);

  const submit = () => {
    if (!canSend) return;
    const t = text.trim();
    onSend(t, doneAttachments.length > 0 ? doneAttachments : undefined);
    setText("");
    // Revoke remaining blob URLs and clear pending chips.
    setPending((prev) => {
      prev.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
      return [];
    });
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newPending: PendingFile[] = Array.from(files).map((file) => {
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : null;
      return {
        key: nextKey(),
        file,
        previewUrl,
        status: "uploading" as const,
        attachment: null,
      };
    });
    setPending((prev) => [...prev, ...newPending]);

    // Upload each file independently.
    newPending.forEach((pf) => {
      const form = new FormData();
      form.append("file", pf.file);
      if (sessionId != null) form.append("sessionId", String(sessionId));

      fetch("/api/chat/upload", { method: "POST", body: form })
        .then((r) => (r.ok ? (r.json() as Promise<ChatAttachment>) : Promise.reject(r.status)))
        .then((att) => {
          setPending((prev) =>
            prev.map((p) =>
              p.key === pf.key
                ? { ...p, status: "done" as const, attachment: att }
                : p,
            ),
          );
        })
        .catch(() => {
          setPending((prev) =>
            prev.map((p) =>
              p.key === pf.key ? { ...p, status: "error" as const } : p,
            ),
          );
        });
    });
  };

  const removePending = (key: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
  };

  return (
    <div className="chat-card-foot-wrap">
      {/* Pending upload chips */}
      {pending.length > 0 && (
        <div className="chat-pending-row">
          {pending.map((pf) => (
            <div
              key={pf.key}
              className={
                "chat-pending-chip" +
                (pf.status === "uploading" ? " is-uploading" : "") +
                (pf.status === "error" ? " is-error" : "")
              }
            >
              {pf.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pf.previewUrl}
                  alt={pf.file.name}
                  className="chat-pending-thumb"
                />
              ) : (
                <span className="chat-pending-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </span>
              )}
              <span className="chat-pending-name">{pf.file.name}</span>
              {pf.status === "uploading" && (
                <span className="chat-pending-spinner" aria-label="Uploading…" />
              )}
              {pf.status === "error" && (
                <span className="chat-pending-err" title="Upload failed">!</span>
              )}
              <button
                type="button"
                className="chat-pending-remove"
                aria-label={`Remove ${pf.file.name}`}
                onClick={() => removePending(pf.key)}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        className="chat-card-foot"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            handleFiles(e.target.files);
            // Reset so the same file can be re-picked after removal.
            e.target.value = "";
          }}
        />

        {/* Paperclip / attach button */}
        <button
          type="button"
          className="chat-attach-btn"
          aria-label="Attach image or PDF"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={20} />
        </button>

        <textarea
          className="chat-foot-input"
          placeholder="Type a message…"
          value={text}
          disabled={disabled}
          rows={1}
          onChange={(e) => {
            setText(e.target.value);
            onTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          aria-label="Message"
        />
        <button
          type="submit"
          className="chat-send"
          aria-label="Send"
          disabled={!canSend}
        >
          <ArrowUp />
        </button>
      </form>
    </div>
  );
}
