"use client";

import { useCallback } from "react";
import { MessageCircle } from "lucide-react";

import { useI18n } from "@/components/providers/language-provider";
import type { ProductRef } from "@/components/chat/core/types";

/**
 * "Chat about this" entry point on the product page. Opens the floating chat
 * launcher (`LiveChat`) pre-loaded with this listing by dispatching the global
 * `shwe:open-chat` event with a serializable {@link ProductRef} in `detail`.
 * The launcher attaches the listing ref to the user's first sent message, which
 * the worker enriches into a product card in the thread — mirroring the mobile
 * app's EnquirySheet → chat flow.
 *
 * Signed-out is handled by the launcher: it preserves the pending product and
 * shows the sign-in gate, then surfaces it once the user is authenticated.
 */
export function ChatAboutButton({
  product,
  variant = "cta",
}: {
  /** Plain serializable listing reference — passed straight into the event. */
  product: ProductRef;
  /** "cta" = full-width labelled button (contact card). "compact" = icon-only
   *  pill for the mobile sticky bar. */
  variant?: "cta" | "compact";
}) {
  const { t } = useI18n();

  const openChat = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("shwe:open-chat", { detail: { product } }),
    );
  }, [product]);

  if (variant === "compact") {
    return (
      <button
        type="button"
        className="pdp-mbar-chat"
        onClick={openChat}
        aria-label={t("product.chatAboutThis")}
      >
        <MessageCircle aria-hidden="true" />
      </button>
    );
  }

  return (
    <button type="button" className="cc-chat-btn" onClick={openChat}>
      <MessageCircle className="icon-sm" aria-hidden="true" />
      {t("product.chatAboutThis")}
    </button>
  );
}
