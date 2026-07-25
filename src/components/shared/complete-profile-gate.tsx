"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { useAuth } from "@/lib/auth/use-auth";
import { useAuthUI } from "@/components/providers/auth-ui";
import { useI18n } from "@/components/providers/language-provider";
import { SignUpStep3, EMPTY_SIGNUP, type SignUpData } from "@/components/shared/auth-modal";
// The reused Step-3 form is styled by these stylesheets (also imported by the
// auth modal). Importing here keeps the gate styled even on pages where the auth
// modal hasn't mounted yet.
import "@/styles/pages/auth.css";
import "@/styles/pages/profile.css";

/**
 * Business-details gate (mobile parity with the app's onboarding guard).
 *
 * A signed-in user who hasn't set a business type AND office township is
 * force-prompted to finish those details using the SAME form as signup step 3.
 * Option A behaviour: the user CAN close it to look around, but it re-appears on
 * the next route change — they can't permanently skip it. It clears for good the
 * moment the profile is completed (the PUT refreshes the `sl_user` cookie, which
 * flips the gate condition off).
 *
 * Trigger is keyed on `=== null`, NOT falsy: a stale `sl_user` cookie written
 * before these IDs existed omits the fields (`undefined`), and we must NOT prompt
 * those already-complete users — their cookie picks up the IDs on the next
 * focus/login refresh. Only a freshly-written cookie for an incomplete account
 * carries an explicit `null`.
 */
export function CompleteProfileGate() {
  const { signedIn, user, refresh } = useAuth();
  // While the auth modal is open, IT owns the business-details step (signup
  // step 3) — don't double up with this gate. The gate takes over once it closes.
  const { mode } = useAuthUI();
  const { locale } = useI18n();
  const t = (en: string, my: string) => (locale === "my" ? my : en);
  const pathname = usePathname();

  const [dismissed, setDismissed] = useState(false);
  // Optimistic: set once the form submits successfully, so the gate clears
  // immediately even if the refreshed `sl_user` cookie momentarily lags behind
  // the write (D1 read-replica). This component lives in Providers and isn't
  // unmounted on client navigation, so the flag persists for the session.
  const [completed, setCompleted] = useState(false);
  // Throwaway form state — SignUpStep3 only reads/writes the business fields.
  const [data, setData] = useState<SignUpData>(EMPTY_SIGNUP);

  // Backfill mode for the reused SignUpStep3: legacy accounts missing business
  // type/township get those fields rendered (new signups collect them in step 1).
  const missingBusiness =
    !!user && (user.businessTypeId === null || user.townshipId === null);

  const incomplete = signedIn && !!user && !completed && missingBusiness;

  // Re-prompt on navigation: clearing `dismissed` whenever the path changes means
  // a user who closed the gate sees it again on the next page (mobile parity).
  useEffect(() => {
    setDismissed(false);
  }, [pathname]);

  // Esc closes (dismisses for this page) — matches the close button.
  useEffect(() => {
    if (!incomplete || dismissed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDismissed(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [incomplete, dismissed]);

  if (!incomplete || dismissed || mode !== "closed") return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-profile-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(20,18,12,0.55)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 460,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--m-bg)",
          border: "1px solid var(--m-line)",
          borderRadius: 20,
          padding: "16px 24px 24px",
          boxShadow: "0 28px 64px -16px rgba(20,18,12,0.45)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label={t("Close", "ပိတ်ရန်")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 9999,
              border: 0,
              background: "transparent",
              color: "var(--m-ink-2)",
              cursor: "pointer",
            }}
          >
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        {/* SignUpStep3 renders its own "Tell us about your business" heading; we
            tag it for the dialog's aria-labelledby via a visually-grouped title. */}
        <span id="complete-profile-title" className="sr-only">
          {t("Complete your business details", "သင့်လုပ်ငန်းအချက်အလက်များ ဖြည့်ပါ")}
        </span>
        <SignUpStep3
          t={t}
          data={data}
          setData={setData}
          missingBusiness={missingBusiness}
          onSubmit={() => {
            // Mark complete optimistically (covers replica lag), and re-read the
            // refreshed sl_user cookie so the user object also reflects the IDs.
            setCompleted(true);
            refresh();
          }}
        />
      </div>
    </div>
  );
}
