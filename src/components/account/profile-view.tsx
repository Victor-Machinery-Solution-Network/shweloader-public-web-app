"use client";

import { Briefcase, ChevronRight, MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/shared/user-menu";
import { ProfileForm } from "@/components/account/profile-form";
import { useI18n } from "@/components/providers/language-provider";
import type { BusinessType, Profile, StateRegion } from "@/lib/api/types";

function pick(...vals: (string | null | undefined)[]): string {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Profile page body. Client Component (for the locale) — renders the identity
 * header from a (possibly null) `/me` payload, then mounts the interactive
 * edit form seeded with the worker's numeric ids and the catalogs.
 */
export function ProfileView({
  profile,
  businessTypes,
  locations,
}: {
  profile: Profile | null;
  businessTypes: BusinessType[];
  locations: StateRegion[];
}) {
  const p = profile;
  const { locale } = useI18n();
  const t = (en: string, my: string) => (locale === "my" ? my : en);

  const fullName = pick(p?.full_name);
  const displayName = fullName || t("Your account", "သင့်အကောင့်");
  const businessType = pick(p?.business_type);
  const company = pick(p?.company_name);
  const partnerStatus = pick(p?.partner_status);
  const isPartner = partnerStatus === "Approved";
  const isPending = partnerStatus === "Pending";

  const townshipLabel = [p?.township_name, p?.district_name, p?.state_region_name]
    .filter((s): s is string => !!s && s.trim().length > 0)
    .join(", ");

  const bizLabel = businessType || t("Member", "အဖွဲ့ဝင်");
  const inits = initials(fullName);

  return (
    <main className="pf-page">
      <div className="pf-wrap pf-wrap--narrow">
        <div className="pf-breadcrumb">
          <Link href="/">{t("Home", "ပင်မ")}</Link>
          <ChevronRight className="icon-sm" strokeWidth={1.75} />
          <span className="cur">{t("Account", "အကောင့်")}</span>
        </div>

        {/* Identity header */}
        <header className="pf-id">
          {inits ? (
            <span
              className="sl-avatar"
              style={{ width: 72, height: 72, fontSize: 26, fontWeight: 700 }}
              aria-hidden="true"
            >
              {inits}
            </span>
          ) : (
            <Avatar size={72} />
          )}
          <div className="pf-id-text">
            <div className="pf-id-name">
              {displayName}
              {isPartner && (
                <span className="pf-id-badge">
                  <ShieldCheck className="icon-sm" strokeWidth={1.75} />{" "}
                  {t("Verified Partner", "အတည်ပြုပြီး မိတ်ဖက်")}
                </span>
              )}
              {isPending && (
                <span className="pf-id-badge pf-id-badge--muted">
                  <ShieldCheck className="icon-sm" strokeWidth={1.75} />{" "}
                  {t("Partner pending", "မိတ်ဖက် စိစစ်ဆဲ")}
                </span>
              )}
            </div>
            <div className="pf-id-meta">
              <span>
                <Briefcase className="icon-sm" strokeWidth={1.75} />
                {bizLabel}
              </span>
              {company && (
                <>
                  <span className="pf-id-dot" />
                  <span>{company}</span>
                </>
              )}
              {townshipLabel && (
                <>
                  <span className="pf-id-dot" />
                  <span>
                    <MapPin className="icon-sm" strokeWidth={1.75} />
                    {townshipLabel}
                  </span>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="pf-stack">
          <ProfileForm
            initial={{
              fullName,
              email: pick(p?.email),
              company,
              businessTypeId: p?.business_type_id ?? null,
              customBusinessType: "",
              townshipId: p?.township_id ?? null,
            }}
            initialBusinessTypeName={p?.business_type ?? null}
            businessTypes={businessTypes}
            locations={locations}
            phone={pick(p?.phone)}
            townshipSeedLabel={townshipLabel}
          />
        </div>
      </div>
    </main>
  );
}
