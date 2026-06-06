"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Phone, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/components/providers/language-provider";

type Step = "idle" | "phone" | "otp";

/**
 * Phone-number change. The worker won't accept `phone` on the profile update —
 * it's OTP-gated: POST /me/send-phone-otp → POST /me/verify-phone. This mirrors
 * the mobile flow: enter a new number, receive a 6-digit code, verify.
 */
export function PhoneChange({ phone }: { phone: string }) {
  const router = useRouter();
  const { locale } = useI18n();
  const t = (en: string, my: string) => (locale === "my" ? my : en);

  const [step, setStep] = useState<Step>("idle");
  const [newPhone, setNewPhone] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [secs, setSecs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend countdown.
  useEffect(() => {
    if (secs <= 0) return;
    const id = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secs]);

  const reset = () => {
    setStep("idle");
    setNewPhone("");
    setRequestId(null);
    setDigits(["", "", "", "", "", ""]);
    setError("");
    setBusy(false);
  };

  async function sendOtp() {
    const trimmed = newPhone.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        requestId?: string | null;
      };
      if (!res.ok) {
        setError(
          data.error ||
            (res.status === 409
              ? t("That number is already in use.", "ဤနံပါတ်ကို အသုံးပြုပြီးသားဖြစ်သည်။")
              : t("Could not send the code.", "ကုဒ်ပို့၍မရပါ။")),
        );
        return;
      }
      setRequestId(data.requestId ?? null);
      setDigits(["", "", "", "", "", ""]);
      setSecs(45);
      setStep("otp");
    } catch {
      setError(t("Could not reach the server.", "ဆာဗာသို့ မချိတ်ဆက်နိုင်ပါ။"));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    const code = digits.join("");
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone.trim(), code, requestId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(
          data.error ||
            (res.status === 409
              ? t("That number is already in use.", "ဤနံပါတ်ကို အသုံးပြုပြီးသားဖြစ်သည်။")
              : t("Invalid or expired code.", "ကုဒ်မမှန် သို့မဟုတ် သက်တမ်းကုန်သွားပါပြီ။")),
        );
        return;
      }
      toast.success(t("Phone number updated", "ဖုန်းနံပါတ် ပြောင်းပြီးပါပြီ"));
      reset();
      router.refresh();
      window.dispatchEvent(new Event("auth-changed"));
    } catch {
      setError(t("Could not reach the server.", "ဆာဗာသို့ မချိတ်ဆက်နိုင်ပါ။"));
    } finally {
      setBusy(false);
    }
  }

  const setDigit = (i: number, v: string) => {
    const c = v.replace(/\D/g, "").slice(0, 1);
    const next = [...digits];
    next[i] = c;
    setDigits(next);
    if (c && i < 5) refs.current[i + 1]?.focus();
  };

  return (
    <div className="pf-phone">
      <div className="pf-phone-row">
        <div className="pf-phone-current">
          <span className="pf-phone-label">{t("Phone number", "ဖုန်းနံပါတ်")}</span>
          <span className="pf-phone-value">
            <Phone className="icon-sm" strokeWidth={1.75} />
            {phone || "—"}
          </span>
        </div>
        {step === "idle" ? (
          <button
            type="button"
            className="pf-phone-change-btn"
            onClick={() => {
              setNewPhone(phone);
              setError("");
              setStep("phone");
            }}
          >
            {t("Change number", "နံပါတ်ပြောင်းရန်")}
          </button>
        ) : (
          <button type="button" className="pf-phone-cancel" onClick={reset}>
            <X className="icon-sm" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {step === "phone" && (
        <div className="pf-phone-panel">
          <label className="auth-field auth-float full">
            <input
              type="tel"
              inputMode="numeric"
              value={newPhone}
              placeholder=" "
              autoFocus
              onChange={(e) => setNewPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void sendOtp();
                }
              }}
            />
            <span className="auth-label">{t("New phone number", "ဖုန်းနံပါတ်အသစ်")}</span>
          </label>
          {error && <p className="pf-phone-error">{error}</p>}
          <button
            type="button"
            className="pf-save"
            onClick={() => void sendOtp()}
            disabled={busy || !newPhone.trim()}
          >
            {busy ? t("Sending…", "ပို့နေသည်…") : t("Send code", "ကုဒ်ပို့ပါ")}
          </button>
        </div>
      )}

      {step === "otp" && (
        <div className="pf-phone-panel">
          <p className="pf-phone-sub">
            {t("Enter the 6-digit code sent to ", "ဤနံပါတ်သို့ ပို့သော ၆ လုံးကုဒ်ကို ထည့်ပါ ")}
            <strong>{newPhone}</strong>
          </p>
          <div className="auth-otp">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                autoFocus={i === 0}
                aria-label={`Digit ${i + 1}`}
                className={d ? "is-filled" : ""}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digits[i] && i > 0) {
                    refs.current[i - 1]?.focus();
                  }
                }}
              />
            ))}
          </div>
          {error && <p className="pf-phone-error">{error}</p>}
          <div className="pf-phone-otp-actions">
            <button
              type="button"
              className="pf-save"
              onClick={() => void verify()}
              disabled={busy || digits.join("").length !== 6}
            >
              {busy ? t("Verifying…", "စစ်ဆေးနေသည်…") : t("Verify", "အတည်ပြုပါ")}
              <Check className="icon-sm" strokeWidth={1.75} />
            </button>
            {secs > 0 ? (
              <span className="pf-phone-resend-wait">
                {t("Resend in ", "ပြန်ပို့ရန် ")}
                <strong>{secs}s</strong>
              </span>
            ) : (
              <button
                type="button"
                className="auth-link"
                onClick={() => void sendOtp()}
                disabled={busy}
              >
                {t("Resend code", "ပြန်ပို့ပါ")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
