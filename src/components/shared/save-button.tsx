"use client";

import { Heart } from "lucide-react";
import { IconButton } from "@/components/shared/icon-button";
import { useSaved } from "@/lib/saved/store";

export interface SaveButtonProps {
  id: number;
  className?: string;
}

/**
 * Heart toggle backed by the shared saved-store (`useSaved`): signed-out saves
 * persist to localStorage; signed-in saves go to the account via the
 * /api/saved-items proxy (optimistic). Every mounted instance stays in sync
 * because they all read the same store. The heart-pop micro-interaction is
 * driven by the design CSS via the `.lcard-fav.is-on` rule.
 */
export function SaveButton({ id, className }: SaveButtonProps) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(id);

  return (
    <IconButton
      icon={<Heart className="icon-sm" aria-hidden="true" />}
      active={saved}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save to favorites"}
      className={className}
    />
  );
}
