"use client";

import { useEffect, useState } from "react";
import { Phone, X } from "lucide-react";

import { EnquiryForm } from "@/components/product/enquiry-form";
import { useI18n } from "@/components/providers/language-provider";
import type { ProductRef } from "@/components/chat/core/types";

/** i18n keys for the kind tag, keyed by listing mode. */
const KIND_KEY = {
  sale: "product.forSale",
  rent: "product.forRent",
  both: "product.forBoth",
} as const;

export interface MobileBarProps {
  title: string;
  /** Pre-split price parts for the sticky bar. */
  priceUnits: string;
  priceNum: string;
  priceSuffix: string;
  /** When true, the amount slot shows the localized "price on enquiry" label. */
  priceOnRequest: boolean;
  kind: "sale" | "rent" | "both";
  /** Visible dealer phone (masking honoured by caller), or null. */
  phone: string | null;
  /** Serializable listing reference — attached to the first chat message when
   *  the enquiry sheet routes into the live chat. */
  product: ProductRef;
}

/**
 * Mobile-only sticky action bar (price + "Enquiry now") plus a bottom sheet
 * holding the enquiry form. Both are hidden on desktop by the design CSS.
 */
export function MobileBar({
  title,
  priceUnits,
  priceNum,
  priceSuffix,
  priceOnRequest,
  kind,
  phone,
  product,
}: MobileBarProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="pdp-mbar" role="region" aria-label={t("product.contactSeller")}>
        <div className="pdp-mbar-price">
          <span className={`pdp-mbar-kind pdp-mbar-kind--${kind}`}>
            {t(KIND_KEY[kind])}
          </span>
          <span className="pdp-mbar-amount">
            {priceOnRequest ? (
              <span className="pdp-mbar-num pdp-mbar-num--request">
                {t("product.priceOnRequest")}
              </span>
            ) : (
              <>
                {priceUnits && (
                  <span className="pdp-mbar-units">{priceUnits}</span>
                )}
                <span className="pdp-mbar-num tnum">{priceNum}</span>
                {priceSuffix && (
                  <span className="pdp-mbar-suf">{priceSuffix}</span>
                )}
              </>
            )}
          </span>
        </div>
        <div className="pdp-mbar-actions">
          {phone && (
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="pdp-mbar-call"
              aria-label={t("actions.callDealer")}
            >
              <Phone aria-hidden="true" />
            </a>
          )}
          <button
            type="button"
            className="pdp-mbar-cta"
            onClick={() => setOpen(true)}
          >
            {t("product.enquiryNow")}
          </button>
        </div>
      </div>

      <div
        className={"pdp-sheet-root" + (open ? " is-open" : "")}
        aria-hidden={!open}
      >
        <div className="pdp-sheet-scrim" onClick={() => setOpen(false)} />
        <div
          className="pdp-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={t("actions.enquire")}
        >
          <div className="pdp-sheet-grab" onClick={() => setOpen(false)} />
          <div className="pdp-sheet-head">
            <div className="pdp-sheet-titles">
              <div className="pdp-sheet-title">{t("actions.enquire")}</div>
              <div className="pdp-sheet-sub">{title}</div>
            </div>
            <button
              type="button"
              className="pdp-sheet-x"
              onClick={() => setOpen(false)}
              aria-label={t("actions.close")}
            >
              <X className="icon-sm" aria-hidden="true" />
            </button>
          </div>
          <div className="pdp-sheet-body">
            <EnquiryForm
              title={title}
              phone={phone}
              product={product}
            />
          </div>
        </div>
      </div>
    </>
  );
}
