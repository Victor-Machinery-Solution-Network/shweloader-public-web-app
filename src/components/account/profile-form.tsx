"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";

// Township source — mirrors the homepage Browse location table (same data).
const PF_LOCATIONS: { id: string; label: string; townships: string[] }[] = [
  {
    id: "yangon",
    label: "Yangon Region",
    townships: [
      "thingangyun:Thingangyun",
      "south-okkalapa:South Okkalapa",
      "tamwe:Tamwe",
      "mingaladon:Mingaladon",
      "dawbon:Dawbon",
      "pabedan:Pabedan",
      "lanmadaw:Lanmadaw",
      "latha:Latha",
      "kyauktada:Kyauktada",
      "insein:Insein",
      "mayangone:Mayangone",
      "hlaing:Hlaing",
      "kamayut:Kamayut",
      "thanlyin:Thanlyin",
      "kyauktan:Kyauktan",
      "thongwa:Thongwa",
    ],
  },
  {
    id: "mandalay",
    label: "Mandalay Region",
    townships: [
      "aungmyethazan:Aung Myay Thar Zan",
      "chanayethazan:Chan Aye Thar Zan",
      "maharaungmye:Maha Aung Myay",
      "chanmyathazi:Chanmyathazi",
      "pyinoolwin:Pyin Oo Lwin",
      "mogok:Mogok",
    ],
  },
  {
    id: "naypyidaw",
    label: "Naypyidaw Union Territory",
    townships: [
      "pyinmana:Pyinmana",
      "lewe:Lewe",
      "tatkon:Tatkon",
      "zabuthiri:Zabuthiri",
      "zeyathiri:Zeyathiri",
      "pobbathiri:Pobbathiri",
    ],
  },
  {
    id: "bago",
    label: "Bago Region",
    townships: [
      "bago-tw:Bago",
      "thanatpin:Thanatpin",
      "kawa:Kawa",
      "taungoo-tw:Taungoo",
      "oktwin:Oktwin",
    ],
  },
  {
    id: "magway",
    label: "Magway Region",
    townships: ["magway-tw:Magway", "yenangyaung:Yenangyaung"],
  },
  {
    id: "mon",
    label: "Mon State",
    townships: ["mawlamyine:Mawlamyine", "mudon:Mudon", "kyaikmaraw:Kyaikmaraw"],
  },
  {
    id: "kayin",
    label: "Kayin State",
    townships: ["hpa-an:Hpa-An", "thandaung:Thandaung"],
  },
  {
    id: "shan",
    label: "Shan State",
    townships: ["taunggyi:Taunggyi", "kalaw:Kalaw", "nyaungshwe:Nyaungshwe"],
  },
  {
    id: "ayeyarwady",
    label: "Ayeyarwady Region",
    townships: ["pathein:Pathein", "ngwesaung:Ngwesaung", "chaungtha:Chaungthar"],
  },
  {
    id: "sagaing",
    label: "Sagaing Region",
    townships: ["sagaing-tw:Sagaing", "monywa:Monywa"],
  },
];

const BUSINESS_OPTIONS: [string, string][] = [
  ["individual", "Individual buyer"],
  ["contractor", "Contractor"],
  ["dealer", "Dealer / reseller"],
  ["agent", "Agent"],
  ["fleet", "Fleet owner"],
  ["rental", "Rental company"],
  ["other", "Other"],
];

export interface ProfileDraft {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  businessType: string;
  company: string;
  street: string;
  township: string;
}

// Maps a camelCase draft key to the worker's expected (snake_case) field.
// TODO: verify against live worker.
const FIELD_TO_API: Record<keyof ProfileDraft, string> = {
  fullName: "full_name",
  username: "username",
  email: "email",
  phone: "phone",
  businessType: "business_type",
  company: "company_name",
  street: "street",
  township: "township",
};

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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  full?: boolean;
  inputMode?: "numeric" | "text" | "email" | "tel";
}) {
  return (
    <label className={"auth-field auth-float" + (full ? " full" : "")}>
      <input
        type={type}
        value={value}
        placeholder=" "
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="auth-label">{label}</span>
    </label>
  );
}

/**
 * Editable account + business details. Tracks a local draft seeded from the
 * server-rendered values, PATCHes only the changed fields to /api/account, then
 * toasts + refreshes the route so the server re-reads /me.
 */
export function ProfileForm({ initial }: { initial: ProfileDraft }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProfileDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Resync if the server values change (after a successful save + refresh).
  const initialKey = JSON.stringify(initial);
  useEffect(() => {
    setDraft(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  const set = <K extends keyof ProfileDraft>(k: K, v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const changed = useMemo(() => {
    const diff: Record<string, string> = {};
    (Object.keys(draft) as (keyof ProfileDraft)[]).forEach((k) => {
      if (draft[k] !== initial[k]) diff[FIELD_TO_API[k]] = draft[k];
    });
    return diff;
  }, [draft, initial]);

  const dirty = Object.keys(changed).length > 0;

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changed),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error || "Could not save your changes");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      toast.success("Profile updated");
      router.refresh();
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setSaving(false);
    }
  }

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
        />
        <Field
          label="Username"
          value={draft.username}
          onChange={(v) => set("username", v)}
        />
        <Field
          label="Email"
          type="email"
          inputMode="email"
          value={draft.email}
          onChange={(v) => set("email", v)}
        />
        <Field
          label="Phone number"
          type="tel"
          inputMode="numeric"
          value={draft.phone}
          onChange={(v) => set("phone", v)}
        />
      </div>

      <GroupLabel>Business</GroupLabel>
      <div className="pf-fields">
        <label className="auth-field auth-float auth-float--select">
          <select
            className="pf-select"
            value={draft.businessType}
            onChange={(e) => set("businessType", e.target.value)}
          >
            <option value="">Select a type</option>
            {BUSINESS_OPTIONS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="pf-select-chev" strokeWidth={1.75} />
          <span className="auth-label">Business type</span>
        </label>

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

        <label className="auth-field auth-float auth-float--select full">
          <select
            className="pf-select"
            value={draft.township}
            onChange={(e) => set("township", e.target.value)}
          >
            <option value="">Select a township</option>
            {PF_LOCATIONS.map((r) => (
              <optgroup key={r.id} label={r.label}>
                {r.townships.map((t) => {
                  const [id, label] = t.split(":");
                  return (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>
          <ChevronDown className="pf-select-chev" strokeWidth={1.75} />
          <span className="auth-label">Office township</span>
        </label>
      </div>

      <div className="pf-actions">
        <button
          type="submit"
          className="pf-save"
          disabled={!dirty || saving}
        >
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
