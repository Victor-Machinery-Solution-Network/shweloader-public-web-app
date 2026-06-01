import {
  Briefcase,
  Calendar,
  ChevronRight,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/shared/user-menu";
import { ProfileForm } from "@/components/account/profile-form";

/**
 * Loosely-typed view of the worker `/me` response. Every field is optional and
 * we accept both snake_case (worker) and camelCase (web display cookie) keys.
 * TODO: verify against live worker.
 */
export interface MeLike {
  id?: number | string;
  app_user_id?: number | string;
  full_name?: string;
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  business_type?: string;
  businessType?: string;
  company_name?: string;
  company?: string;
  street?: string;
  address?: string;
  township?: string;
  is_approved_partner?: boolean;
  is_verified?: boolean;
  partner?: boolean;
  created_at?: string;
  memberSince?: string;
}

const BUSINESS_LABELS: Record<string, string> = {
  individual: "Individual buyer",
  contractor: "Contractor",
  dealer: "Dealer / reseller",
  agent: "Agent",
  fleet: "Fleet owner",
  rental: "Rental company",
  other: "Other",
};

function pick(...vals: (string | undefined)[]): string {
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

function memberSinceLabel(raw?: string): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Profile page body. Server Component — renders the identity header from a
 * (possibly null/partial) `/me` payload, then mounts the interactive edit form.
 */
export function ProfileView({ me }: { me: MeLike | null }) {
  const data = me ?? {};

  const fullName = pick(data.full_name, data.fullName);
  const displayName = fullName || "Your account";
  const username = pick(data.username);
  const email = pick(data.email);
  const phone = pick(data.phone);
  const businessType = pick(data.business_type, data.businessType);
  const company = pick(data.company_name, data.company);
  const street = pick(data.street, data.address);
  const township = pick(data.township);
  const isPartner = !!(data.is_approved_partner ?? data.partner);

  const bizLabel = businessType
    ? (BUSINESS_LABELS[businessType] ?? businessType)
    : "Member";
  const inits = initials(fullName);

  return (
    <main className="pf-page">
      <div className="pf-wrap pf-wrap--narrow">
        <div className="pf-breadcrumb">
          <Link href="/">Home</Link>
          <ChevronRight className="icon-sm" strokeWidth={1.75} />
          <span className="cur">Account</span>
        </div>

        {/* Identity header */}
        <header className="pf-id">
          {inits ? (
            <span
              className="sl-avatar"
              style={{
                width: 72,
                height: 72,
                fontSize: 26,
                fontWeight: 700,
              }}
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
                  Verified Partner
                </span>
              )}
            </div>
            <div className="pf-id-meta">
              <span>
                <Briefcase className="icon-sm" strokeWidth={1.75} />
                {bizLabel}
              </span>
              {(company || township) && <span className="pf-id-dot" />}
              {company && (
                <span>
                  <MapPin className="icon-sm" strokeWidth={1.75} />
                  {company}
                </span>
              )}
              <span className="pf-id-dot" />
              <span>
                <Calendar className="icon-sm" strokeWidth={1.75} />
                Member since {memberSinceLabel(
                  pick(data.created_at, data.memberSince) || undefined,
                )}
              </span>
            </div>
          </div>
        </header>

        <div className="pf-stack">
          <ProfileForm
            initial={{
              fullName,
              username,
              email,
              phone,
              businessType,
              company,
              street,
              township,
            }}
          />
        </div>
      </div>
    </main>
  );
}
