"use client";

import { useState } from "react";
import { ArrowRight, KeyRound, Phone, Tag } from "lucide-react";

import { useAuth } from "@/lib/auth/use-auth";
import { useAuthUI } from "@/components/providers/auth-ui";
import { useI18n } from "@/components/providers/language-provider";
import { productRefFromListing } from "@/components/product/overview-card";
import type { Listing } from "@/lib/api/types";

export interface EnquiryFormProps {
  /** Dealer phone, already display-formatted; null when masked/absent. */
  phone: string | null;
  /** The normalized listing — the sale/rent listing ids it carries identify the
   *  listing to the worker. The ProductRef attached to the first chat message is
   *  built from the side the user picks (sale vs rent), so "both" listings never
   *  guess which side to enquire about. */
  listing: Listing;
}

/** Strip spaces for a `tel:` href. */
function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, "")}`;
}

/**
 * Enquiry block reused by the overview card and the mobile bottom sheet.
 *
 * When the listing is BOTH for sale and for rent, a "For sale" / "For rent"
 * segmented pill sits above the message box (mirrors the mobile EnquirySheet's
 * SegmentedControl): the user picks a side, the pre-filled message switches, and
 * the chosen side's listing id is attached to the enquiry — no guessing. Sale-only
 * or rent-only listings hide the pills and use that single side.
 *
 * "Send enquiry": opens the global auth modal when signed-out; once signed in it
 * opens the live chat and sends the typed message as the first chat message with
 * the product attached. The actual send is performed by the floating `LiveChat`
 * launcher, which listens for the global `shwe:open-chat` event. "Call dealer" is
 * a plain `tel:` link shown only when the seller phone is visible (masking
 * honoured by the caller).
 */
export function EnquiryForm({ phone, listing }: EnquiryFormProps) {
  const { t } = useI18n();
  const { signedIn } = useAuth();
  const { open } = useAuthUI();

  const hasSale = !!listing.sale;
  const hasRent = !!listing.rent;
  const hasBoth = hasSale && hasRent;
  const defaultType: "sale" | "rent" = hasRent && !hasSale ? "rent" : "sale";

  const [type, setType] = useState<"sale" | "rent">(defaultType);
  // null = untouched, so the pre-fill follows the live language + side; once the
  // user edits, their text wins. Deriving (not seeding state) keeps it locale-reactive.
  const [custom, setCustom] = useState<string | null>(null);
  // One stakeholder-authored default for every mode (sale and rent alike); the
  // admin still sees which listing it's about via the attached product card.
  const message = custom ?? t("product.enquiryMsg");

  function selectType(next: "sale" | "rent") {
    if (next === type) return;
    setType(next);
    setCustom(null); // reset to the new side's default pre-fill
  }

  function handleSend(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const text = message.trim();
    if (!text) return; // never send an empty enquiry
    // On "both", attach the user-picked side; otherwise the single available side.
    const product = productRefFromListing(listing, hasBoth ? type : defaultType);
    if (!signedIn) {
      // The launcher preserves a staged product+message across the sign-in gate,
      // so dispatch first; the auth modal handles the rest.
      window.dispatchEvent(
        new CustomEvent("shwe:open-chat", { detail: { product, message: text } }),
      );
      open("signin");
      return;
    }
    // Open the chat and send the enquiry. No disabled/loading latch — like the
    // mobile EnquirySheet, a user can enquire about the same product any number
    // of times.
    window.dispatchEvent(
      new CustomEvent("shwe:open-chat", { detail: { product, message: text } }),
    );
  }

  return (
    <>
      {hasBoth && (
        <div
          className="cc-seg"
          role="group"
          aria-label={t("product.messageLabel")}
        >
          <button
            type="button"
            className={"cc-seg-pill" + (type === "sale" ? " is-active" : "")}
            aria-pressed={type === "sale"}
            onClick={() => selectType("sale")}
          >
            <Tag className="icon-sm" aria-hidden="true" />
            {t("product.forSale")}
          </button>
          <button
            type="button"
            className={"cc-seg-pill" + (type === "rent" ? " is-active" : "")}
            aria-pressed={type === "rent"}
            onClick={() => selectType("rent")}
          >
            <KeyRound className="icon-sm" aria-hidden="true" />
            {t("product.forRent")}
          </button>
        </div>
      )}
      <label className="cc-field ov-msg-field">
        <span>{t("product.messageLabel")}</span>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setCustom(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="cc-send"
        onClick={handleSend}
      >
        {t("actions.enquire")}
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
