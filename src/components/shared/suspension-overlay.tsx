"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";

/**
 * Full-screen suspension notice. Appears when:
 *  - the URL carries ?blacklisted=1 (set by the proxy / blacklist handler after
 *    a navigation), or
 *  - an `account-blacklisted` event fires (a client-initiated mutation got 403).
 *
 * Sticky: once shown it stays until a successful new sign-in (`auth-changed`
 * with an sl_user cookie present), so it can't be dismissed by editing the URL.
 * Any reason text comes from the in-page event only and is rendered as text.
 */
export function SuspensionOverlay() {
  const { locale } = useI18n();
  const t = (en: string, my: string) => (locale === "my" ? my : en);
  const [shown, setShown] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("blacklisted") === "1") {
      setShown(true);
      // Strip the flag so a refresh/share doesn't re-trigger; keep showing.
      params.delete("blacklisted");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (qs ? `?${qs}` : ""),
      );
    }

    const onBan = (e: Event) => {
      const detail = (e as CustomEvent<{ reason?: string }>).detail;
      setReason(detail?.reason ?? null);
      setShown(true);
    };
    const onAuthChanged = () => {
      // A fresh sl_user means the visitor signed in (possibly another account).
      // Exact cookie-name match — substring would also match e.g. "x_sl_user=".
      if (/(?:^|;\s*)sl_user=/.test(document.cookie)) {
        setShown(false);
        setReason(null);
      }
    };
    window.addEventListener("account-blacklisted", onBan);
    window.addEventListener("auth-changed", onAuthChanged);
    return () => {
      window.removeEventListener("account-blacklisted", onBan);
      window.removeEventListener("auth-changed", onAuthChanged);
    };
  }, []);

  if (!shown) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="suspend-title"
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
          width: "100%",
          maxWidth: 420,
          background: "var(--m-bg)",
          border: "1px solid var(--m-line)",
          borderRadius: 20,
          padding: "32px 28px",
          textAlign: "center",
          boxShadow: "0 28px 64px -16px rgba(20,18,12,0.45)",
        }}
      >
        <ShieldAlert
          size={40}
          strokeWidth={1.75}
          style={{ color: "var(--m-danger, #c0392b)", margin: "0 auto 14px" }}
          aria-hidden="true"
        />
        <h2
          id="suspend-title"
          style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "var(--m-ink)" }}
        >
          {t("Account suspended", "အကောင့် ဆိုင်းငံ့ထားသည်")}
        </h2>
        <p style={{ margin: "0 0 8px", color: "var(--m-ink-2)", lineHeight: 1.5 }}>
          {t(
            "Your account has been suspended and you've been signed out. Please contact support if you think this is a mistake.",
            "သင့်အကောင့်ကို ဆိုင်းငံ့ထားပြီး ထွက်ခွာပြီးဖြစ်ပါသည်။ မှားယွင်းမှုဟု ထင်ပါက ဝန်ဆောင်မှုသို့ ဆက်သွယ်ပါ။",
          )}
        </p>
        {reason ? (
          <p style={{ margin: "0 0 18px", color: "var(--m-fg-2)", fontSize: 13 }}>
            {t("Reason:", "အကြောင်းရင်း -")} {reason}
          </p>
        ) : (
          <div style={{ height: 10 }} />
        )}
        <button
          type="button"
          onClick={() => window.location.assign("/?signin=1")}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 12,
            border: 0,
            background: "var(--m-ink)",
            color: "var(--m-bg)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {t("Sign in with another account", "အခြားအကောင့်ဖြင့် ဝင်ရန်")}
        </button>
      </div>
    </div>
  );
}
