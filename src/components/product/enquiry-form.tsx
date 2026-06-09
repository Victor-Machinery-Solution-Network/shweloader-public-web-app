"use client";

import { useState } from "react";
import { ArrowRight, Phone, Send } from "lucide-react";

import { useAuth } from "@/lib/auth/use-auth";
import { useAuthUI } from "@/components/providers/auth-ui";
import { useI18n } from "@/components/providers/language-provider";

export interface EnquiryFormProps {
  /** Listing title — seeds the default message. */
  title: string;
  /** Listing id — referenced in the enquiry message. */
  listingId: number;
  /** Dealer phone, already display-formatted; null when masked/absent. */
  phone: string | null;
}

/** Strip spaces for a `tel:` href. */
function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, "")}`;
}

/**
 * Enquiry block reused by the overview card and the mobile bottom sheet.
 *
 * "Send enquiry": opens the global auth modal when signed-out; once signed in
 * the message is posted as feedback. "Call dealer" is a plain `tel:` link shown
 * only when the seller phone is visible (masking honoured by the caller).
 */
export function EnquiryForm({
  title,
  listingId,
  phone,
}: EnquiryFormProps) {
  const { t } = useI18n();
  const { signedIn } = useAuth();
  const { open } = useAuthUI();
  const [message, setMessage] = useState(
    `${t("product.enquiryMsgPre")}${title}${t("product.enquiryMsgPost")}`,
  );
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  async function handleSend(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (status === "sending") return;
    if (!signedIn) {
      open("signin");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, title, message }),
      });
      if (!res.ok) throw new Error("send failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  const sending = status === "sending";
  const sent = status === "sent";

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
          disabled={sending || sent}
        />
      </label>
      <button
        type="button"
        className="cc-send"
        onClick={handleSend}
        disabled={sending || sent}
      >
        {sent
          ? t("product.enquirySent")
          : sending
            ? t("product.enquirySending")
            : t("actions.enquire")}
        <ArrowRight className="icon-sm" aria-hidden="true" />
      </button>
      {status === "error" && (
        <p className="ov-foot" role="alert">
          {t("product.enquiryError")}
        </p>
      )}
      {phone && (
        <a href={telHref(phone)} className="cc-quick-btn">
          <Phone className="icon-sm" aria-hidden="true" />
          {phone}
        </a>
      )}
    </>
  );
}
