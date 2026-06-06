import { Suspense } from "react";
import { getToken } from "@/lib/auth/session";
import { apiFetch } from "@/lib/api/client";
import { getBusinessTypes } from "@/lib/api/business-types";
import { getLocations } from "@/lib/api/locations";
import { noindexMetadata } from "@/lib/seo/metadata";
import type { Profile } from "@/lib/api/types";
import { ProfileView } from "@/components/account/profile-view";
import { SignedOutPrompt } from "@/components/account/signed-out-prompt";
// The profile form reuses the auth form's field styles (.auth-form / .auth-field
// and the input rules live in auth.css), which is otherwise only loaded lazily
// with the sign-in modal — import it here so the account form is always styled.
// auth.css first so profile.css keeps its intended overrides.
import "@/styles/pages/auth.css";
import "@/styles/pages/profile.css";

export const metadata = noindexMetadata;

/**
 * Account / profile page. Token-gated and dynamic: a static shell wraps a
 * <Suspense> around an async component that reads the session token, so the
 * cacheable shell prerenders while the authed body streams.
 */
export default function AccountPage() {
  return (
    <Suspense fallback={<AccountLoading />}>
      <AccountContent />
    </Suspense>
  );
}

async function AccountContent() {
  const token = await getToken();
  if (!token) {
    return (
      <SignedOutPrompt message="Sign in to view and edit your account profile." />
    );
  }

  // Fetch the profile (dynamic, authed) alongside the cached public catalogs.
  // /me is fetched defensively so a transient API failure renders an empty
  // shell instead of crashing the route.
  const [profile, businessTypes, locations] = await Promise.all([
    apiFetch<Profile>("/me", { token }).catch(() => null),
    getBusinessTypes().catch(() => []),
    getLocations().catch(() => []),
  ]);

  return (
    <ProfileView
      profile={profile}
      businessTypes={businessTypes}
      locations={locations}
    />
  );
}

function AccountLoading() {
  return (
    <main className="pf-page">
      <div className="pf-wrap pf-wrap--narrow">
        <div className="pf-breadcrumb">
          <span className="cur">Account</span>
        </div>
        <header className="pf-id">
          <span
            className="sl-avatar"
            style={{ width: 72, height: 72 }}
            aria-hidden="true"
          />
          <div className="pf-id-text">
            <div className="pf-id-name">Loading…</div>
          </div>
        </header>
      </div>
    </main>
  );
}
