"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { assetUrl } from "@/lib/assets";
import { Lightbox } from "./Lightbox";
import { SeenTick } from "./SeenTick";
import type { ChatMessage, ChatAttachment } from "./types";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Renders the image grid (1/2/3-4/4+ with +N overlay). */
function ImageGrid({
  images,
  onOpen,
}: {
  images: ChatAttachment[];
  onOpen: (index: number) => void;
}) {
  const displayed = images.slice(0, 4);
  const extra = images.length > 4 ? images.length - 4 : 0;
  const count = displayed.length;

  return (
    <div
      className={cn(
        "chat-att-grid",
        count === 1 && "chat-att-grid-1",
        count === 2 && "chat-att-grid-2",
        count >= 3 && "chat-att-grid-4",
      )}
    >
      {displayed.map((att, i) => {
        const src = assetUrl(att.fileUrl);
        const isLast = i === 3 && extra > 0;
        return (
          <button
            key={att.fileUrl}
            type="button"
            className={cn("chat-att-tile", isLast && "chat-att-tile-overflow")}
            aria-label={isLast ? `View all ${images.length} images` : `View image ${i + 1}`}
            onClick={() => onOpen(i)}
          >
            {src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={att.fileName} className="chat-att-img" />
            )}
            {isLast && (
              <span className="chat-att-more" aria-hidden="true">
                +{extra}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Renders a single PDF/non-image file chip. */
function FileChip({ att }: { att: ChatAttachment }) {
  const href = assetUrl(att.fileUrl);
  return (
    <a
      href={href ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="chat-att-file"
      aria-label={`Download ${att.fileName}`}
    >
      <span className="chat-att-file-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      </span>
      <span className="chat-att-file-meta">
        <span className="chat-att-file-name">{att.fileName}</span>
        <span className="chat-att-file-size">{humanSize(att.fileSize)}</span>
      </span>
    </a>
  );
}

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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const attachments = message.attachments ?? [];
  const imageAtts = attachments.filter((a) => a.fileType.startsWith("image/"));
  const fileAtts = attachments.filter((a) => !a.fileType.startsWith("image/"));

  // Full list of resolved image URLs for the lightbox.
  const imageUrls = imageAtts
    .map((a) => assetUrl(a.fileUrl))
    .filter((u): u is string => u != null);

  return (
    <div className={cn("chat-msg", mine ? "is-me" : "is-agent")}>
      {message.text && <div className="chat-bubble">{message.text}</div>}

      {/* Image grid */}
      {imageAtts.length > 0 && (
        <ImageGrid
          images={imageAtts}
          onOpen={(i) => setLightboxIndex(i)}
        />
      )}

      {/* File chips */}
      {fileAtts.length > 0 && (
        <div className="chat-att-files">
          {fileAtts.map((att) => (
            <FileChip key={att.fileUrl} att={att} />
          ))}
        </div>
      )}

      <div className="chat-msg-meta">
        <span className="chat-msg-time">{fmtTime(message.createdAt)}</span>
        {mine && isLastOutgoing && <SeenTick message={message} adminReadAt={adminReadAt} />}
      </div>

      {/* Lightbox */}
      {lightboxIndex != null && imageUrls.length > 0 && (
        <Lightbox
          images={imageUrls}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(next) => setLightboxIndex(next)}
        />
      )}
    </div>
  );
}
