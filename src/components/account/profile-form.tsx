"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { BusinessType, StateRegion } from "@/lib/api/types";
import { TownshipCombobox } from "@/components/account/township-combobox";
import { PhoneChange } from "@/components/account/phone-change";

/** Sentinel businessTypeId meaning "Other" → submit as custom_business_type. */
const OTHER = -1;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Local form state. Business type and township are the worker's numeric ids
 * (the worker rejects slug strings); `customBusinessType` carries a free-text
 * "Other" value (businessTypeId === OTHER).
 */
export interface ProfileDraft {
  fullName: string;
  username: string;
  email: string;
  company: string;
  street: string;
  businessTypeId: number | null;
  customBusinessType: string;
  townshipId: number | null;
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <div className="pf-group-label">{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  full,
  inputMode,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  full?: boolean;
  inputMode?: "numeric" | "text" | "email" | "tel";
  error?: string;
}) {
  return (
    <label
      className={
        "auth-field auth-float" +
        (full ? " full" : "") +
        (error ? " has-error" : "")
      }
    >
      <input
        type={type}
        value={value}
        placeholder=" "
        inputMode={inputMode}
        aria-invalid={!!error}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="auth-label">{label}</span>
      {error && <span className="pf-field-error">{error}</span>}
    </label>
  );
}

/**
 * Editable account + business details. Tracks a local draft seeded from the
 * server-rendered values, PUTs only the changed fields to /api/account (worker
 * PUT /me), maps the worker's 409/400 errors to fields, then toasts + refreshes
 * the route so the server re-reads /me. Phone is OTP-gated and handled by
 * <PhoneChange/>; it is not part of this payload.
 */
export function ProfileForm({
  initial,
  initialBusinessTypeName,
  businessTypes,
  locations,
  phone,
  townshipSeedLabel,
}: {
  initial: ProfileDraft;
  initialBusinessTypeName?: string | null;
  businessTypes: BusinessType[];
  locations: StateRegion[];
  phone: string;
  townshipSeedLabel?: string;
}) {
  const router = useRouter();

  // Resolve the effective starting state: if /me's business_type_id isn't in the
  // public catalog (a custom/unlisted type), start on "Other" with the name
  // prefilled — mirroring the mobile client.
  const base = useMemo<ProfileDraft>(() => {
    const inCatalog =
      initial.businessTypeId != null &&
      businessTypes.some((b) => b.id === initial.businessTypeId);
    if (
      !inCatalog &&
      (initial.businessTypeId != null || !!initialBusinessTypeName)
    ) {
      return {
        ...initial,
        businessTypeId: OTHER,
        customBusinessType: initialBusinessTypeName ?? "",
      };
    }
    return initial;
  }, [initial, initialBusinessTypeName, businessTypes]);

  const [draft, setDraft] = useState<ProfileDraft>(base);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Resync if the server values change (after a successful save + refresh).
  // "Adjust state during render" pattern — re-seed the draft when the
  // server-provided base changes, without an effect.
  const baseKey = JSON.stringify(base);
  const [seenKey, setSeenKey] = useState(baseKey);
  if (baseKey !== seenKey) {
    setSeenKey(baseKey);
    setDraft(base);
  }

  const set = <K extends keyof ProfileDraft>(k: K, v: ProfileDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  // Only changed fields, mapped to the worker's snake_case contract.
  const changed = useMemo(() => {
    const p: Record<string, unknown> = {};
    const tr = (v: string) => v.trim();
    if (tr(draft.fullName) !== tr(base.fullName))
      p.full_name = tr(draft.fullName);
    if (tr(draft.username) !== tr(base.username))
      p.username = tr(draft.username);
    if (tr(draft.email) !== tr(base.email)) p.email = tr(draft.email) || null;
    if (tr(draft.company) !== tr(base.company))
      p.company_name = tr(draft.company) || null;
    if (tr(draft.street) !== tr(base.street))
      p.address = tr(draft.street) || null;
    if (draft.townshipId !== base.townshipId)
      p.township_id = draft.townshipId;

    if (draft.businessTypeId === OTHER) {
      const ct = tr(draft.customBusinessType);
      const baseCt =
        base.businessTypeId === OTHER ? tr(base.customBusinessType) : "";
      if (ct && ct !== baseCt) p.custom_business_type = ct;
    } else if (
      draft.businessTypeId != null &&
      draft.businessTypeId !== base.businessTypeId
    ) {
      p.business_type_id = draft.businessTypeId;
    }
    return p;
  }, [draft, base]);

  const dirty = Object.keys(changed).length > 0;

  async function save() {
    if (!dirty || saving) return;

    // Client-side guards that mirror the worker's validation.
    const errs: Record<string, string> = {};
    if (changed.full_name !== undefined && !String(changed.full_name).trim())
      errs.fullName = "Full name is required";
    if (changed.username !== undefined && !String(changed.username).trim())
      errs.username = "Username is required";
    if (
      changed.email !== undefined &&
      changed.email &&
      !EMAIL_RE.test(String(changed.email))
    )
      errs.email = "Enter a valid email address";
    if (draft.businessTypeId === OTHER && !draft.customBusinessType.trim())
      errs.businessType = "Please specify your business type";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changed),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const msg = (data.error || "").toLowerCase();
        if (res.status === 409 && msg.includes("username")) {
          setErrors({ username: "That username is already taken" });
        } else if (res.status === 409 && msg.includes("email")) {
          setErrors({ email: "That email is already taken" });
        } else if (res.status === 400 && msg.includes("email")) {
          setErrors({ email: "Enter a valid email address" });
        } else if (res.status === 400 && msg.includes("township")) {
          setErrors({ township: "Please choose a valid township" });
        } else {
          toast.error(data.error || "Could not save your changes");
        }
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      toast.success("Profile updated");
      router.refresh();
      window.dispatchEvent(new Event("auth-changed"));
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setSaving(false);
    }
  }

  const btSelectValue =
    draft.businessTypeId == null ? "" : String(draft.businessTypeId);

  return (
    <form
      className="pf-card auth-form"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <GroupLabel>Account</GroupLabel>
      <div className="pf-fields">
        <Field
          label="Full name"
          value={draft.fullName}
          onChange={(v) => set("fullName", v)}
          error={errors.fullName}
        />
        <Field
          label="Username"
          value={draft.username}
          onChange={(v) => set("username", v)}
          error={errors.username}
        />
        <Field
          label="Email"
          type="email"
          inputMode="email"
          value={draft.email}
          onChange={(v) => set("email", v)}
          error={errors.email}
        />
      </div>

      {/* Phone is OTP-gated — its own verify flow, not part of the save. */}
      <PhoneChange phone={phone} />

      <GroupLabel>Business</GroupLabel>
      <div className="pf-fields">
        <label
          className={
            "auth-field auth-float auth-float--select" +
            (errors.businessType ? " has-error" : "")
          }
        >
          <select
            className="pf-select"
            value={btSelectValue}
            aria-invalid={!!errors.businessType}
            onChange={(e) => {
              const v = e.target.value;
              set("businessTypeId", v === "" ? null : Number(v));
              setErrors((er) => ({ ...er, businessType: "" }));
            }}
          >
            <option value="">Select a type</option>
            {businessTypes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
            <option value={OTHER}>Other</option>
          </select>
          <ChevronDown className="pf-select-chev" strokeWidth={1.75} />
          <span className="auth-label">Business type</span>
          {errors.businessType && (
            <span className="pf-field-error">{errors.businessType}</span>
          )}
        </label>

        {draft.businessTypeId === OTHER && (
          <Field
            label="Specify your business type"
            value={draft.customBusinessType}
            onChange={(v) => set("customBusinessType", v)}
          />
        )}

        <Field
          label="Company name"
          value={draft.company}
          onChange={(v) => set("company", v)}
        />
        <Field
          label="Office building / street"
          full
          value={draft.street}
          onChange={(v) => set("street", v)}
        />

        <TownshipCombobox
          label="Office township"
          locations={locations}
          value={draft.townshipId}
          seedLabel={townshipSeedLabel}
          onChange={(id) => {
            set("townshipId", id);
            setErrors((er) => ({ ...er, township: "" }));
          }}
        />
        {errors.township && (
          <span className="pf-field-error pf-field-error--block">
            {errors.township}
          </span>
        )}
      </div>

      <div className="pf-actions">
        <button type="submit" className="pf-save" disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save changes"}
          <Check className="icon-sm" strokeWidth={1.75} />
        </button>
        <span className={"pf-saved-note" + (saved ? " show" : "")}>
          <Check className="icon-sm" strokeWidth={1.75} /> Saved
        </span>
      </div>
    </form>
  );
}
