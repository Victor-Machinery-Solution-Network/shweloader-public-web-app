"use client";

import { useState } from "react";
import { ArrowRight, Phone, Send } from "lucide-react";

import { useAuth } from "@/lib/auth/use-auth";
import { useAuthUI } from "@/components/providers/auth-ui";
import { useI18n } from "@/components/providers/language-provider";
import type { ProductRef } from "@/components/chat/core/types";

export interface EnquiryFormProps {
  /** Listing title — seeds the default message. */
  title: string;
  /** Dealer phone, already display-formatted; null when masked/absent. */
  phone: string | null;
  /** Serializable listing reference — attached to the first chat message so the
   *  worker enriches it into a product card (1-click enquiry → chat). The
   *  sale/rent listing ids it carries identify the listing to the worker. */
  product: ProductRef;
}

/** Strip spaces for a `tel:` href. */
function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, "")}`;
}

/**
 * Enquiry block reused by the overview card and the mobile bottom sheet.
 *
 * "Send enquiry": opens the global auth modal when signed-out; once signed in it
 * opens the live chat and sends the typed message as the first chat message with
 * the product attached (mirrors the mobile app's EnquirySheet). The actual send
 * is performed by the floating `LiveChat` launcher, which listens for the global
 * `shwe:open-chat` event. "Call dealer" is a plain `tel:` link shown only when
 * the seller phone is visible (masking honoured by the caller).
 */
export function EnquiryForm({
  title,
  phone,
  product,
}: EnquiryFormProps) {
  const { t } = useI18n();
  const { signedIn } = useAuth();
  const { open } = useAuthUI();
  const [message, setMessage] = useState(
    `${t("product.enquiryMsgPre")}${title}${t("product.enquiryMsgPost")}`,
  );
  const [opening, setOpening] = useState(false);

  function handleSend(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const text = message.trim();
    if (!text) return; // never send an empty enquiry
    if (!signedIn) {
      // The launcher preserves a staged product+message across the sign-in gate,
      // so dispatch first; the auth modal handles the rest.
      window.dispatchEvent(
        new CustomEvent("shwe:open-chat", { detail: { product, message: text } }),
      );
      open("signin");
      return;
    }
    // Brief "Opening chat…" affordance; the launcher takes over from here.
    setOpening(true);
    window.dispatchEvent(
      new CustomEvent("shwe:open-chat", { detail: { product, message: text } }),
    );
  }

  return (
    <>
      <label className="cc-field ov-msg-field">
        <span>
          <Send className="ov-msg-i" aria-hidden="true" />
          {t("product.messageLabel")}
        </span>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="cc-send"
        onClick={handleSend}
        disabled={opening}
      >
        {opening ? t("product.enquiryOpening") : t("actions.enquire")}
        <ArrowRight className="icon-sm" aria-hidden="true" />
      </button>
      {phone && (
        <a href={telHref(phone)} className="cc-quick-btn">
          <Phone className="icon-sm" aria-hidden="true" />
          {phone}
        </a>
      )}
    </>
  );
}
