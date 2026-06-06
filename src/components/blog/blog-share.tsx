"use client";

import { useCallback } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/language-provider";

/**
 * Share the current blog post via the Web Share API (native share sheet on
 * mobile), falling back to copying the link to the clipboard on desktop. Mirrors
 * the product page's share action.
 */
export function BlogShare({ title }: { title: string }) {
  const { t } = useI18n();
  const share = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t("common.linkCopied"));
      }
    } catch {
      /* user dismissed the share sheet */
    }
  }, [title]);

  return (
    <button type="button" className="bp-share" onClick={share}>
      <Share2 className="icon-sm" strokeWidth={1.75} aria-hidden="true" />
      <span className="bp-btn-label">{t("actions.share")}</span>
    </button>
  );
}
