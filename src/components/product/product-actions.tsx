"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Heart } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/language-provider";
import { ShareIcon } from "@/components/shared/icons/share-icon";
import { IconButton } from "@/components/shared/icon-button";
import { SaveButton } from "@/components/shared/save-button";
import { useSaved } from "@/lib/saved/store";

/**
 * Product page action row: Back to results · Share · Save.
 * (The design uses this in place of a breadcrumb.) Save goes through the shared
 * saved-store (`useSaved`) — localStorage when signed out, the account when
 * signed in — same as the card hearts + /saved page.
 */
export function ProductActions({
  listingId,
  title,
  shareUrl,
  variant = "row",
}: {
  listingId: number;
  title: string;
  /** Server-supplied canonical absolute URL to share. Keeps shared links free
   *  of the visitor's tracking query/hash; falls back to the live URL. */
  shareUrl?: string;
  /** "row" = the labelled action bar (desktop). "overlay" = floating circular
   *  icon buttons over the gallery image (mobile). */
  variant?: "row" | "overlay";
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(listingId);

  const goBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/browse");
  }, [router]);

  const share = useCallback(async () => {
    const url = shareUrl ?? window.location.href;
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
  }, [title, shareUrl, t]);

  if (variant === "overlay") {
    return (
      <div className="pdp-gallery-actions">
        <IconButton
          icon={
            <ArrowRight
              className="icon-sm"
              strokeWidth={2}
              style={{ transform: "rotate(180deg)" }}
              aria-hidden="true"
            />
          }
          onClick={goBack}
          aria-label={t("actions.backToResults")}
        />
        <div className="pdp-gact-right">
          <IconButton
            icon={<ShareIcon className="icon-sm" aria-hidden="true" />}
            onClick={share}
            aria-label={t("actions.share")}
          />
          <SaveButton id={listingId} />
        </div>
      </div>
    );
  }

  return (
    <div className="pdp-actions">
      <button
        type="button"
        className={"pdp-btn" + (saved ? " is-on" : "")}
        onClick={() => toggle(listingId)}
        aria-pressed={saved}
      >
        <Heart
          className="icon-sm"
          strokeWidth={1.75}
          style={saved ? { fill: "currentColor" } : undefined}
          aria-hidden="true"
        />
        <span className="pdp-btn-label">
          {saved ? t("actions.saved") : t("actions.save")}
        </span>
      </button>
      <button type="button" className="pdp-btn" onClick={share}>
        <ShareIcon className="icon-sm" aria-hidden="true" />
        <span className="pdp-btn-label">{t("actions.share")}</span>
      </button>
    </div>
  );
}
