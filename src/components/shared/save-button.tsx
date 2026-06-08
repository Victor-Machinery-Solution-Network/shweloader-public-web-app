"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { IconButton } from "@/components/shared/icon-button";

const SAVED_KEY = "shweloader.saved";
const SAVED_EVENT = "saved-changed";

/** Read the saved-listing id array from localStorage (resilient to bad data). */
function readSaved(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is number => typeof x === "number") : [];
  } catch {
    return [];
  }
}

export interface SaveButtonProps {
  id: number;
  className?: string;
}

/**
 * Heart toggle that persists saved listing ids to localStorage and broadcasts a
 * `saved-changed` window event so every mounted instance stays in sync. The
 * heart-pop micro-interaction is driven entirely by the design CSS via the
 * `.lcard-fav.is-on` rule.
 */
export function SaveButton({ id, className }: SaveButtonProps) {
  const [saved, setSaved] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR/CSR mismatch).
  useEffect(() => {
    setSaved(readSaved().includes(id));
  }, [id]);

  // Keep in sync when any other instance toggles the same key.
  useEffect(() => {
    const onChange = () => setSaved(readSaved().includes(id));
    window.addEventListener(SAVED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(SAVED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [id]);

  const toggle = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const current = readSaved();
      const isSaved = current.includes(id);
      const next = isSaved ? current.filter((x) => x !== id) : [...current, id];
      try {
        window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage write failures (private mode / quota).
      }
      setSaved(!isSaved);
      window.dispatchEvent(new CustomEvent(SAVED_EVENT));
    },
    [id],
  );

  return (
    <IconButton
      icon={<Heart className="icon-sm" aria-hidden="true" />}
      active={saved}
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save to favorites"}
      className={className}
    />
  );
}
