"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { ShareIcon } from "@/components/shared/icons/share-icon";

import { useI18n } from "@/components/providers/language-provider";

/**
 * Share the current blog post via the Web Share API (native share sheet on
 * mobile), falling back to copying the link to the clipboard on desktop. Mirrors
 * the product page's share action.
 */
export function BlogShare({ title, url }: { title: string; url?: string }) {
  const { t } = useI18n();
  const share = useCallback(async () => {
    // Prefer the server-supplied canonical URL so shared links never carry the
    // visitor's tracking query/hash; fall back to the live URL if absent.
    const shareUrl = url ?? window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(t("common.linkCopied"));
      }
    } catch {
      /* user dismissed the share sheet */
    }
  }, [title, url, t]);

  return (
    <button type="button" className="bp-share" onClick={share}>
      <ShareIcon className="icon-sm" aria-hidden="true" />
      <span className="bp-btn-label">{t("actions.share")}</span>
    </button>
  );
}
