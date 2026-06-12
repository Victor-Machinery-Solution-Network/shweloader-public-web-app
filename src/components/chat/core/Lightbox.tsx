"use client";
import { useEffect, useRef } from "react";
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

  const closeRef = useRef<HTMLButtonElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // Move focus to the close button on mount; restore focus to whatever was
  // focused before the lightbox opened when it unmounts/closes.
  useEffect(() => {
    const prevFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      prevFocused?.focus?.();
    };
  }, []);

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

  // Focus trap: keep Tab / Shift+Tab cycling among the visible buttons so focus
  // can never leave the modal.
  const onTrapKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const focusables = [closeRef.current, prevRef.current, nextRef.current].filter(
      (el): el is HTMLButtonElement => el != null,
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const activeEl = document.activeElement;
    if (e.shiftKey) {
      if (activeEl === first || !focusables.includes(activeEl as HTMLButtonElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (activeEl === last || !focusables.includes(activeEl as HTMLButtonElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const src = images[index];

  return (
    <div
      className="chat-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onClick={onClose}
      onKeyDown={onTrapKeyDown}
    >
      {/* Persistent polite live region — announces the current position on navigate. */}
      <div aria-live="polite" className="sr-only">
        {`Image ${index + 1} of ${images.length}`}
      </div>

      {/* Close */}
      <button
        ref={closeRef}
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
          ref={prevRef}
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
          ref={nextRef}
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
