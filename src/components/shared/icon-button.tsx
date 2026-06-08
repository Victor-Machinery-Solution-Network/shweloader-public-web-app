import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Swappable icon — heart, share, back arrow, … */
  icon: ReactNode;
  /** Active/selected state → `.is-on` (e.g. a saved heart turns red + pops). */
  active?: boolean;
}

/**
 * Round icon button — the shared "browse card heart" shell (`.sl-iconbtn`).
 * Swap the `icon` to reuse it for back / share / save, etc. Pass `className`
 * for per-context positioning (e.g. `.lcard-fav` on a card, or inside
 * `.pdp-gallery-actions` over the product image). All other button props
 * (`onClick`, `aria-label`, `aria-pressed`, …) pass straight through.
 */
export function IconButton({ icon, active, className, type, ...rest }: IconButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cn("sl-iconbtn", active && "is-on", className)}
      {...rest}
    >
      {icon}
    </button>
  );
}
