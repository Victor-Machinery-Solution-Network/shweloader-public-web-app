"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ClipboardEvent as ReactClipboardEvent,
} from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Phone,
  Shield,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Flag } from "@/components/shared/flag";
import { useI18n } from "@/components/providers/language-provider";
import { useAuthUI } from "@/components/providers/auth-ui";
import { useAuth } from "@/lib/auth/use-auth";
import { TownshipCombobox } from "@/components/account/township-combobox";
import type { BusinessType, PartnerType, StateRegion } from "@/lib/api/types";
import "@/styles/pages/auth.css";
// Reuse the profile form's select/combobox styling (pf-select, pf-combo,
// auth-float--select) for the onboarding step's pickers.
import "@/styles/pages/profile.css";

/** Bilingual picker bound to the global locale — mirrors the design's `t(en,my)`. */
type Tr = (en: string, my: string) => string;

type Tab = "signin" | "signup";

/** "Other" sentinel for the business-type picker — mirrors the mobile app and
 *  routes through the worker's `custom_business_type` path. */
const OTHER_BUSINESS = -1;

interface SignUpData {
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  agree: boolean;
  // Business details (step 3 — mirrors the mobile onboarding screen).
  businessTypeId: number | null; // OTHER_BUSINESS (-1) → use customBusinessType
  customBusinessType: string;
  companyName: string;
  address: string; // office building / street (optional)
  townshipId: number | null; // office township (required)
  partner: string; // "yes" | "no"
  partnerType: number | null; // required when partner === "yes"
}

const EMPTY_SIGNUP: SignUpData = {
  name: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  agree: false,
  businessTypeId: null,
  customBusinessType: "",
  companyName: "",
  address: "",
  townshipId: null,
  partner: "",
  partnerType: null,
};

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return body?.error || body?.message || fallback;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Floating-label primitives (Apple-style). Styling is fully driven by auth.css
// via :placeholder-shown + :has() — we only emit the markup + class names.
// ---------------------------------------------------------------------------

function FloatingField({
  label,
  type = "text",
  value,
  onChange,
  autoFocus,
  autoComplete,
  inputMode,
  name,
  optional,
  optionalLabel,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  autoComplete?: string;
  inputMode?: "numeric" | "text" | "tel" | "email";
  name?: string;
  optional?: boolean;
  optionalLabel?: string;
}) {
  return (
    <label className="auth-field auth-float">
      <input
        type={type}
        placeholder=" "
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        inputMode={inputMode}
        name={name}
      />
      <span className="auth-label">{label}</span>
      {optional && (
        <span className="auth-optional">{optionalLabel || "Optional"}</span>
      )}
    </label>
  );
}

function FloatingPassword({
  label,
  value,
  onChange,
  t,
  autoComplete = "current-password",
}: {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  t: Tr;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="auth-field auth-float has-eye">
      <input
        type={show ? "text" : "password"}
        placeholder=" "
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
      />
      <span className="auth-label">{label}</span>
      <button
        type="button"
        className="auth-eye"
        onClick={() => setShow((s) => !s)}
        aria-label={t(
          "Toggle password visibility",
          "စကားဝှက် ပြသမှု ပြောင်းပါ",
        )}
        aria-pressed={show}
      >
        {show ? (
          <EyeOff className="icon-sm" strokeWidth={1.75} />
        ) : (
          <Eye className="icon-sm" strokeWidth={1.75} />
        )}
      </button>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

function SignInForm({
  t,
  onForgot,
  onSuccess,
}: {
  t: Tr;
  onForgot: () => void;
  onSuccess: () => void | Promise<void>;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      if (!res.ok) {
        toast.error(
          await readError(
            res,
            t("Sign in failed. Check your details.", "ဝင်ရောက်မှု မအောင်မြင်ပါ။"),
          ),
        );
        return;
      }
      await onSuccess();
    } catch {
      toast.error(
        t("Something went wrong. Try again.", "တစ်ခုခုမှားယွင်းနေပါသည်။"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      <FloatingField
        label={t("Phone or username", "ဖုန်းနံပါတ် သို့မဟုတ် အသုံးပြုသူအမည်")}
        autoFocus
        autoComplete="username"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />

      <FloatingPassword
        label={t("Password", "စကားဝှက်")}
        t={t}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />

      <div className="auth-forgot-row">
        <button type="button" className="auth-link" onClick={onForgot}>
          {t("Forgot password?", "စကားဝှက် မေ့ပြီလား?")}
        </button>
      </div>

      <label className="auth-check">
        <input type="checkbox" defaultChecked />
        <span className="auth-check-box" aria-hidden="true"></span>
        <span>{t("Remember me", "မှတ်ထားရန်")}</span>
      </label>

      <button type="submit" className="auth-submit" disabled={busy}>
        {t("Sign in", "ဝင်ရန်")}
        <ArrowRight className="icon-sm" strokeWidth={1.75} />
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Register — step 1: basics
// ---------------------------------------------------------------------------

function SignUpStep1({
  t,
  data,
  setData,
  onNext,
}: {
  t: Tr;
  data: SignUpData;
  setData: React.Dispatch<React.SetStateAction<SignUpData>>;
  onNext: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const update = <K extends keyof SignUpData>(k: K, v: SignUpData[K]) =>
    setData((d) => ({ ...d, [k]: v }));
  const ok = Boolean(
    data.name && data.username && data.phone && data.password && data.agree,
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: data.name,
          username: data.username,
          email: data.email || undefined,
          phone: data.phone,
          password: data.password,
        }),
      });
      if (!res.ok) {
        toast.error(
          await readError(
            res,
            t("Could not start registration.", "စာရင်းသွင်းမှု မအောင်မြင်ပါ။"),
          ),
        );
        return;
      }
      await onNext();
    } catch {
      toast.error(
        t("Something went wrong. Try again.", "တစ်ခုခုမှားယွင်းနေပါသည်။"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      <FloatingField
        label={t("Full name", "အမည်အပြည့်အစုံ")}
        autoComplete="name"
        value={data.name}
        onChange={(e) => update("name", e.target.value)}
      />

      <div className="auth-row-2">
        <FloatingField
          label={t("Username", "အသုံးပြုသူအမည်")}
          autoComplete="username"
          value={data.username}
          onChange={(e) => update("username", e.target.value)}
        />
        <FloatingField
          label={t("Email", "အီးမေးလ်")}
          type="email"
          autoComplete="email"
          value={data.email}
          onChange={(e) => update("email", e.target.value)}
          optional
          optionalLabel={t("Optional", "ရွေးနိုင်")}
        />
      </div>

      <div className="auth-field">
        <FloatingField
          label={t("Phone number", "ဖုန်းနံပါတ်")}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={data.phone}
          onChange={(e) => update("phone", e.target.value)}
        />
        <span className="auth-help">
          {t(
            "We'll send a 6-digit code to verify.",
            "၆ လုံးပါ ကုဒ်ဖြင့် အတည်ပြုပါမည်။",
          )}
        </span>
      </div>

      <FloatingPassword
        label={t("Password", "စကားဝှက်")}
        t={t}
        autoComplete="new-password"
        value={data.password}
        onChange={(e) => update("password", e.target.value)}
      />

      <label className="auth-check">
        <input
          type="checkbox"
          checked={data.agree}
          onChange={(e) => update("agree", e.target.checked)}
        />
        <span className="auth-check-box" aria-hidden="true"></span>
        <span>
          {t(
            "I agree to the",
            "အောက်ပါ စည်းကမ်းချက်များကို သဘောတူပါသည် —",
          )}{" "}
          <a
            href="/legal#terms"
            target="_blank"
            rel="noopener noreferrer"
            className="auth-inline-link"
          >
            {t("Terms", "စည်းမျဉ်း")}
          </a>{" "}
          {t("and", "နှင့်")}{" "}
          <a
            href="/legal#privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="auth-inline-link"
          >
            {t("Privacy Policy", "ကိုယ်ရေးကိုယ်တာ မူဝါဒ")}
          </a>
          .
        </span>
      </label>

      <button type="submit" className="auth-submit" disabled={!ok || busy}>
        {t("Continue", "ဆက်လုပ်ရန်")}
        <ArrowRight className="icon-sm" strokeWidth={1.75} />
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Register — step 2: OTP (centered; promo hidden via .is-otp on .auth-split)
// ---------------------------------------------------------------------------

function SignUpStep2({
  t,
  data,
  onNext,
  onBack,
}: {
  t: Tr;
  data: SignUpData;
  onNext: () => void | Promise<void>;
  onBack: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [secs, setSecs] = useState(45);
  const [busy, setBusy] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (secs <= 0) return;
    const id = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secs]);

  const setDigit = (i: number, v: string) => {
    const c = v.replace(/\D/g, "").slice(0, 1);
    const next = [...digits];
    next[i] = c;
    setDigits(next);
    if (c && i < 5) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const onPaste = (e: ReactClipboardEvent<HTMLDivElement>) => {
    const text = (e.clipboardData.getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    for (let k = 0; k < text.length; k++) next[k] = text[k];
    setDigits(next);
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  const code = digits.join("");
  const filled = code.length === 6;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!filled || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: data.phone, code }),
      });
      if (!res.ok) {
        toast.error(
          await readError(
            res,
            t("Invalid code. Try again.", "ကုဒ်မမှန်ပါ။ ထပ်စမ်းကြည့်ပါ။"),
          ),
        );
        return;
      }
      await onNext();
    } catch {
      toast.error(
        t("Something went wrong. Try again.", "တစ်ခုခုမှားယွင်းနေပါသည်။"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form auth-otp-form" onSubmit={submit}>
      <div className="auth-otp-icon" aria-hidden="true">
        <Phone strokeWidth={1.75} />
      </div>

      <h2 className="auth-otp-title">
        {t("Verify your phone", "ဖုန်းနံပါတ်ကို အတည်ပြုပါ")}
      </h2>
      <p className="auth-otp-sub">
        {t(
          "Enter the 6-digit code we sent to ",
          "၆ လုံးပါ ကုဒ်ကို ဤနံပါတ်သို့ ပို့ပြီးပါပြီ ",
        )}
        <strong>+95 {data.phone || "9 7777 0000"}</strong>
      </p>

      <div className="auth-otp" onPaste={onPaste}>
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
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            autoFocus={i === 0}
            aria-label={`Digit ${i + 1}`}
            className={d ? "is-filled" : ""}
          />
        ))}
      </div>

      <div className="auth-otp-resend">
        {secs > 0 ? (
          <span className="auth-otp-resend-wait">
            {t("Didn't receive it? Resend in ", "ကုဒ်မရသေးဘူးလား? ")}
            <strong>{secs}s</strong>
          </span>
        ) : (
          <button
            type="button"
            className="auth-link auth-otp-resend-btn"
            onClick={() => setSecs(45)}
          >
            {t("Resend code", "ပြန်ပို့ပါ")}
          </button>
        )}
      </div>

      <button
        type="submit"
        className="auth-submit auth-otp-submit"
        disabled={!filled || busy}
      >
        {t("Verify", "အတည်ပြုပါ")}
        <ArrowRight className="icon-sm" strokeWidth={1.75} />
      </button>

      <button type="button" className="auth-otp-back" onClick={onBack}>
        {t("Wrong number? ", "နံပါတ်မှားနေပါသလား? ")}
        <span>{t("Change it", "ပြောင်းပါ")}</span>
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Register — step 3: profile
// ---------------------------------------------------------------------------

/**
 * Step 3 — business details. Mirrors the mobile onboarding screen: business type
 * (+ "Other" → custom), company name, office street + township, and a partner
 * question (+ partner type when "Yes"). Runs AFTER OTP, so the session cookie is
 * set — it submits via the authenticated `PUT /api/account` (→ worker PUT /me),
 * the same payload the mobile app sends.
 */
function SignUpStep3({
  t,
  data,
  setData,
  onSubmit,
  onBack,
}: {
  t: Tr;
  data: SignUpData;
  setData: React.Dispatch<React.SetStateAction<SignUpData>>;
  /** Called after the profile is saved successfully (parent shows the success step). */
  onSubmit: () => void;
  onBack: () => void;
}) {
  const update = <K extends keyof SignUpData>(k: K, v: SignUpData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  // Reference data for the pickers — the auth modal is a client component, so it
  // pulls business/partner types + the location tree from /api/lookups on mount.
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [partnerTypes, setPartnerTypes] = useState<PartnerType[]>([]);
  const [locations, setLocations] = useState<StateRegion[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/lookups", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => {
        if (!d || typeof d !== "object") return;
        const o = d as Record<string, unknown>;
        if (Array.isArray(o.businessTypes))
          setBusinessTypes(o.businessTypes as BusinessType[]);
        if (Array.isArray(o.partnerTypes))
          setPartnerTypes(o.partnerTypes as PartnerType[]);
        if (Array.isArray(o.locations))
          setLocations(o.locations as StateRegion[]);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const isOther = data.businessTypeId === OTHER_BUSINESS;
  const ok = Boolean(
    data.businessTypeId !== null &&
      (!isOther || data.customBusinessType.trim()) &&
      data.townshipId !== null &&
      (data.partner === "yes" || data.partner === "no") &&
      (data.partner !== "yes" || data.partnerType !== null),
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: data.companyName.trim() || undefined,
          address: data.address.trim() || null,
          business_type_id: isOther
            ? undefined
            : (data.businessTypeId ?? undefined),
          custom_business_type: isOther
            ? data.customBusinessType.trim()
            : undefined,
          partner_type_id:
            data.partner === "yes" && data.partnerType
              ? data.partnerType
              : undefined,
          township_id: data.townshipId ?? null,
        }),
      });
      if (!res.ok) {
        toast.error(
          await readError(
            res,
            t("Could not save your details.", "အချက်အလက်များ မသိမ်းဆည်းနိုင်ပါ။"),
          ),
        );
        return;
      }
      onSubmit();
    } catch {
      toast.error(
        t("Something went wrong. Try again.", "တစ်ခုခုမှားယွင်းနေပါသည်။"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-step-head">
        <h3 className="auth-step-h">
          {t("Tell us about your business", "သင့်လုပ်ငန်းအကြောင်း ပြောပြပါ")}
        </h3>
        <p className="auth-step-sub">
          {t(
            "We use this to recommend the right listings and pricing.",
            "သင်နှင့်ကိုက်ညီသော အကြောင်းအရာများကို ပြသရန် အသုံးပြုပါမည်။",
          )}
        </p>
      </div>

      {/* Business type */}
      <label className="auth-field auth-float auth-float--select">
        <select
          className="pf-select"
          value={data.businessTypeId === null ? "" : String(data.businessTypeId)}
          onChange={(e) =>
            update(
              "businessTypeId",
              e.target.value === "" ? null : Number(e.target.value),
            )
          }
        >
          <option value="">{t("Select a type", "အမျိုးအစား ရွေးပါ")}</option>
          {businessTypes.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
          <option value={OTHER_BUSINESS}>{t("Other", "အခြား")}</option>
        </select>
        <ChevronDown className="pf-select-chev" strokeWidth={1.75} />
        <span className="auth-label">
          {t("Business type", "လုပ်ငန်းအမျိုးအစား")}
        </span>
      </label>

      {isOther && (
        <FloatingField
          label={t("Specify business type", "လုပ်ငန်းအမျိုးအစား သတ်မှတ်ပါ")}
          value={data.customBusinessType}
          onChange={(e) => update("customBusinessType", e.target.value)}
        />
      )}

      <FloatingField
        label={t("Company name", "ကုမ္ပဏီအမည်")}
        value={data.companyName}
        onChange={(e) => update("companyName", e.target.value)}
        autoComplete="organization"
        optional
        optionalLabel={t("Optional", "ရွေးနိုင်")}
      />

      <FloatingField
        label={t("Office building / street", "ရုံး အဆောက်အအုံ / လမ်း")}
        value={data.address}
        onChange={(e) => update("address", e.target.value)}
        optional
        optionalLabel={t("Optional", "ရွေးနိုင်")}
      />

      <TownshipCombobox
        label={t("Office township", "ရုံး မြို့နယ်")}
        locations={locations}
        value={data.townshipId}
        onChange={(id) => update("townshipId", id)}
      />

      {/* Partner */}
      <div className="auth-partner">
        <div className="auth-partner-text">
          <div className="auth-partner-h">
            <BadgeCheck className="icon-sm" strokeWidth={1.75} />
            {t(
              "Interested in becoming a partner?",
              "မိတ်ဖက်အဖြစ် ပူးပေါင်းရန် စိတ်ဝင်စားပါသလား?",
            )}
          </div>
          <div className="auth-partner-sub">
            {t(
              "Get a verified badge, priority support, and featured listings.",
              "အသိအမှတ်ပြုထောက်ခံချက်၊ ဦးစားပေးပံ့ပိုးမှု နှင့် ထူးခြားသော ကြော်ငြာများ ရရှိမည်။",
            )}
          </div>
        </div>
        <div className="auth-partner-toggle">
          {(["yes", "no"] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={"auth-toggle-btn" + (data.partner === v ? " is-on" : "")}
              onClick={() => update("partner", v)}
            >
              {v === "yes" ? t("Yes", "ဟုတ်ကဲ့") : t("No", "မဟုတ်ပါ")}
            </button>
          ))}
        </div>
      </div>

      {data.partner === "yes" && (
        <label className="auth-field auth-float auth-float--select">
          <select
            className="pf-select"
            value={data.partnerType === null ? "" : String(data.partnerType)}
            onChange={(e) =>
              update(
                "partnerType",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          >
            <option value="">
              {t("Select a partner type", "မိတ်ဖက်အမျိုးအစား ရွေးပါ")}
            </option>
            {partnerTypes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pf-select-chev" strokeWidth={1.75} />
          <span className="auth-label">
            {t("Partner type", "မိတ်ဖက်အမျိုးအစား")}
          </span>
        </label>
      )}

      <div className="auth-step-actions">
        <button type="button" className="auth-back" onClick={onBack}>
          <ArrowRight
            className="icon-sm"
            strokeWidth={1.75}
            style={{ transform: "rotate(180deg)" }}
          />
          {t("Back", "နောက်သို့")}
        </button>
        <button type="submit" className="auth-submit" disabled={!ok || busy}>
          {t("Create account", "အကောင့်ဖွင့်ပါ")}
          <Check className="icon-sm" strokeWidth={1.75} />
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Top-level modal — driven by useAuthUI() open state.
// ---------------------------------------------------------------------------

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function AuthModal() {
  const { mode, close } = useAuthUI();
  const { refresh } = useAuth();
  const { locale, setLocale } = useI18n();
  const t: Tr = useCallback(
    (en, my) => (locale === "my" ? my : en),
    [locale],
  );

  const open = mode !== "closed";
  const titleId = useId();

  const [tab, setTab] = useState<Tab>("signin");
  const [step, setStep] = useState(1);
  const [data, setData] = useState<SignUpData>(EMPTY_SIGNUP);
  const [done, setDone] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  // Reset to the requested mode whenever the modal (re)opens.
  useEffect(() => {
    if (!open) return;
    setTab(mode === "register" ? "signup" : "signin");
    setStep(1);
    setDone(false);
    setData(EMPTY_SIGNUP);
  }, [open, mode]);

  // Lock body scroll + ESC to close + restore focus on unmount.
  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      lastFocused.current?.focus?.();
    };
  }, [open, close]);

  // Focus trap — keep Tab within the dialog.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const items = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  const goTab = (to: Tab) => {
    setTab(to);
    setStep(1);
    setDone(false);
  };

  const finish = useCallback(async () => {
    refresh();
    window.dispatchEvent(new Event("auth-changed"));
    close();
  }, [refresh, close]);

  if (!open) return null;

  const isOtp = tab === "signup" && step === 2 && !done;

  return (
    <div
      ref={overlayRef}
      className="auth-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-label="Sign in or sign up"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="auth-modal" data-screen-label="Auth modal" ref={dialogRef}>
        <button
          type="button"
          className="auth-modal-close"
          onClick={close}
          aria-label="Close"
        >
          <X strokeWidth={1.75} />
        </button>

        <div className={"auth-split" + (isOtp ? " is-otp" : "")}>
          {/* Left — form */}
          <section
            className="auth-form-col"
            data-screen-label={tab === "signin" ? "Sign in" : "Sign up"}
          >
            <div className="auth-form-topbar">
              <span className="auth-logo" aria-label="ShweLoader">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/logo_dark.svg"
                  className="sl-logo-light"
                  alt="ShweLoader"
                  width={975}
                  height={192}
                  style={{ height: 28, width: "auto" }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/logo_white_with_slogan.svg"
                  className="sl-logo-dark"
                  alt="ShweLoader"
                  width={975}
                  height={192}
                  style={{ height: 28, width: "auto", display: "none" }}
                />
              </span>

              <div className="auth-lang">
                <button
                  type="button"
                  className={"auth-lang-btn" + (locale === "en" ? " is-on" : "")}
                  onClick={() => setLocale("en")}
                  aria-pressed={locale === "en"}
                  aria-label="English"
                >
                  <Flag code="en" />
                  <span>Eng</span>
                </button>
                <button
                  type="button"
                  className={"auth-lang-btn" + (locale === "my" ? " is-on" : "")}
                  onClick={() => setLocale("my")}
                  aria-pressed={locale === "my"}
                  aria-label="Myanmar"
                >
                  <Flag code="my" />
                  <span>မြန်မာ</span>
                </button>
              </div>
            </div>

            <div className="auth-form-inner">
              {!isOtp && (
                <div className="auth-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "signin"}
                    className={"auth-tab" + (tab === "signin" ? " is-on" : "")}
                    onClick={() => goTab("signin")}
                  >
                    {t("Sign in", "ဝင်ရန်")}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "signup"}
                    className={"auth-tab" + (tab === "signup" ? " is-on" : "")}
                    onClick={() => goTab("signup")}
                  >
                    {t("Register", "အကောင့်ဖွင့်ရန်")}
                  </button>
                  <span
                    className={"auth-tab-glide " + tab}
                    aria-hidden="true"
                  ></span>
                </div>
              )}

              {tab === "signin" && (
                <>
                  <h1 className="auth-h1" id={titleId}>
                    {t("Welcome back", "ပြန်လည်ဆုံတွေ့ရတာ ဝမ်းသာပါတယ်")}
                  </h1>
                  <SignInForm
                    t={t}
                    onForgot={() =>
                      toast(
                        t(
                          "Password reset is coming soon.",
                          "စကားဝှက်ပြန်လည်သတ်မှတ်ခြင်း မကြာမီ ရရှိပါမည်။",
                        ),
                      )
                    }
                    onSuccess={finish}
                  />
                </>
              )}

              {tab === "signup" &&
                !done &&
                (step === 2 ? (
                  <SignUpStep2
                    t={t}
                    data={data}
                    onNext={() => setStep(3)}
                    onBack={() => setStep(1)}
                  />
                ) : (
                  <>
                    <h1 className="auth-h1" id={titleId}>
                      {step === 1 &&
                        t("Create your account", "အကောင့်အသစ်ဖွင့်ပါ")}
                      {step === 3 && t("Almost done", "နီးပါးပြီးပြီ")}
                    </h1>

                    {step === 1 && (
                      <SignUpStep1
                        t={t}
                        data={data}
                        setData={setData}
                        onNext={() => setStep(2)}
                      />
                    )}
                    {step === 3 && (
                      <SignUpStep3
                        t={t}
                        data={data}
                        setData={setData}
                        onSubmit={() => setDone(true)}
                        onBack={() => setStep(2)}
                      />
                    )}
                  </>
                ))}

              {tab === "signup" && done && (
                <div className="auth-done">
                  <span className="auth-done-tick">
                    <Check strokeWidth={2.5} />
                  </span>
                  <h1 className="auth-h1" id={titleId}>
                    {t("Welcome to ShweLoader", "ShweLoader သို့ ကြိုဆိုပါသည်")}
                  </h1>
                  <p className="auth-step-sub">
                    {t(
                      "Your account is ready. Start browsing equipment or list your first machine.",
                      "အကောင့်အသင့်ဖြစ်ပါပြီ။ စက်ယန္တရားများကို ကြည့်ရှုပါ သို့မဟုတ် ပထမဆုံး ကြော်ငြာတင်ပါ။",
                    )}
                  </p>
                  <div className="auth-done-cta">
                    <button
                      type="button"
                      className="auth-submit"
                      onClick={finish}
                    >
                      {t("Continue", "ဆက်လက်လုပ်ဆောင်ရန်")}
                      <ArrowRight className="icon-sm" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              )}

              {!isOtp && (
                <div className="auth-foot">
                  {tab === "signin" ? (
                    <>
                      {t("New here?", "အသစ်လား?")}{" "}
                      <button
                        type="button"
                        className="auth-link"
                        onClick={() => goTab("signup")}
                      >
                        {t("Create an account", "အကောင့်ဖွင့်ပါ")}
                      </button>
                    </>
                  ) : (
                    <>
                      {t("Have an account?", "အကောင့်ရှိပြီးသားလား?")}{" "}
                      <button
                        type="button"
                        className="auth-link"
                        onClick={() => goTab("signin")}
                      >
                        {t("Sign in", "ဝင်ရန်")}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Right — brand panel */}
          <aside className="auth-promo-col" aria-hidden="false">
            <div className="auth-promo-bg" aria-hidden="true"></div>
            <div className="auth-promo-inner">
              <div className="eyebrow auth-promo-eyebrow">
                {t(
                  "Myanmar's heavy-equipment marketplace",
                  "မြန်မာ့ စက်ယန္တရား ဈေးကွက်",
                )}
              </div>
              <h2 className="auth-promo-h">
                {t(
                  "Buy, sell, and rent machines with people you can trust.",
                  "ယုံကြည်စိတ်ချရသော သူများနှင့် ဝယ်ပါ၊ ရောင်းပါ၊ ငှားပါ။",
                )}
              </h2>

              <ul className="auth-promo-list">
                <li>
                  <span className="auth-promo-i">
                    <BadgeCheck className="icon-sm" strokeWidth={1.75} />
                  </span>
                  <div className="auth-promo-li-h">
                    {t(
                      "Verified sellers and inspection-ready listings",
                      "အသိအမှတ်ပြုထားသော ရောင်းချသူများ၊ စစ်ဆေးပြီးကြော်ငြာများ",
                    )}
                  </div>
                </li>
                <li>
                  <span className="auth-promo-i">
                    <Truck className="icon-sm" strokeWidth={1.75} />
                  </span>
                  <div className="auth-promo-li-h">
                    {t(
                      "Hundreds of machines from across Myanmar",
                      "တိုင်းပြည်တစ်ဝှမ်းမှ စက်ယန္တရားများ ရာချီနှင့်",
                    )}
                  </div>
                </li>
                <li>
                  <span className="auth-promo-i">
                    <Shield className="icon-sm" strokeWidth={1.75} />
                  </span>
                  <div className="auth-promo-li-h">
                    {t(
                      "On-site viewings before any payment",
                      "ငွေပေးချေခြင်းမပြုမီ ကိုယ်တိုင်ကြည့်ရှုနိုင်",
                    )}
                  </div>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
