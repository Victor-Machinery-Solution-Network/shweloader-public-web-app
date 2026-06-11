"use client";
import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export function Lightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onNavigate: (next: number) => void;
}) {
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  // Close on Escape, navigate with arrow keys.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && hasPrev) {
        onNavigate(index - 1);
      } else if (e.key === "ArrowRight" && hasNext) {
        onNavigate(index + 1);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [index, hasPrev, hasNext, onClose, onNavigate]);

  const src = images[index];

  return (
    <div
      className="chat-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onClick={onClose}
    >
      {/* Close */}
      <button
        type="button"
        className="chat-lightbox-close"
        aria-label="Close image viewer"
        onClick={onClose}
      >
        <X size={22} />
      </button>

      {/* Prev */}
      {hasPrev && (
        <button
          type="button"
          className="chat-lightbox-nav chat-lightbox-prev"
          aria-label="Previous image"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(index - 1);
          }}
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {/* Image — stop propagation so clicking the image itself doesn't close */}
      <div
        className="chat-lightbox-img-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`Attachment ${index + 1} of ${images.length}`} className="chat-lightbox-img" />
        {images.length > 1 && (
          <div className="chat-lightbox-counter" aria-label={`Image ${index + 1} of ${images.length}`}>
            {index + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Next */}
      {hasNext && (
        <button
          type="button"
          className="chat-lightbox-nav chat-lightbox-next"
          aria-label="Next image"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(index + 1);
          }}
        >
          <ChevronRight size={28} />
        </button>
      )}
    </div>
  );
}
