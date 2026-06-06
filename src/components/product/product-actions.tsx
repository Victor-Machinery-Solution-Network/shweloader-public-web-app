"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Heart } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/language-provider";
import { ShareIcon } from "@/components/shared/icons/share-icon";

const SAVED_KEY = "shweloader.saved";
const SAVED_EVENT = "saved-changed";

function readSaved(): number[] {
  try {
    const a = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
    return Array.isArray(a) ? a.filter((x): x is number => typeof x === "number") : [];
  } catch {
    return [];
  }
}

/**
 * Product page action row: Back to results · Share · Save.
 * (The design uses this in place of a breadcrumb.) Save toggles the same
 * `shweloader.saved` localStorage list the card hearts + /saved page use.
 */
export function ProductActions({
  listingId,
  title,
  variant = "row",
}: {
  listingId: number;
  title: string;
  /** "row" = the labelled action bar (desktop). "overlay" = floating circular
   *  icon buttons over the gallery image (mobile). */
  variant?: "row" | "overlay";
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(readSaved().includes(listingId));
    sync();
    window.addEventListener(SAVED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SAVED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [listingId]);

  const toggleSave = useCallback(() => {
    const list = readSaved();
    const next = list.includes(listingId)
      ? list.filter((x) => x !== listingId)
      : [...list, listingId];
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(SAVED_EVENT));
    setSaved(next.includes(listingId));
  }, [listingId]);

  const goBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/browse");
  }, [router]);

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

  if (variant === "overlay") {
    return (
      <div className="pdp-gallery-actions">
        <button
          type="button"
          className="pdp-gact"
          onClick={goBack}
          aria-label={t("actions.backToResults")}
        >
          <ArrowRight
            className="icon-sm"
            strokeWidth={2}
            style={{ transform: "rotate(180deg)" }}
            aria-hidden="true"
          />
        </button>
        <div className="pdp-gact-right">
          <button
            type="button"
            className="pdp-gact"
            onClick={share}
            aria-label={t("actions.share")}
          >
            <ShareIcon className="icon-sm" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={"pdp-gact" + (saved ? " is-on" : "")}
            onClick={toggleSave}
            aria-pressed={saved}
            aria-label={saved ? t("actions.saved") : t("actions.save")}
          >
            <Heart
              className="icon-sm"
              strokeWidth={2}
              style={saved ? { fill: "currentColor" } : undefined}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pdp-actions">
      <button type="button" className="pdp-btn" onClick={goBack}>
        <ArrowRight
          className="icon-sm"
          strokeWidth={1.75}
          style={{ transform: "rotate(180deg)" }}
          aria-hidden="true"
        />
        <span className="pdp-btn-label">{t("actions.backToResults")}</span>
      </button>
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className="pdp-btn" onClick={share}>
          <ShareIcon className="icon-sm" aria-hidden="true" />
          <span className="pdp-btn-label">{t("actions.share")}</span>
        </button>
        <button
          type="button"
          className={"pdp-btn" + (saved ? " is-on" : "")}
          onClick={toggleSave}
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
      </div>
    </div>
  );
}
