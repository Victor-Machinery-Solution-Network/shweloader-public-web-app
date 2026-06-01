import { Suspense } from "react";
import { getToken } from "@/lib/auth/session";
import { apiFetch } from "@/lib/api/client";
import { noindexMetadata } from "@/lib/seo/metadata";
import { ProfileView, type MeLike } from "@/components/account/profile-view";
import { SignedOutPrompt } from "@/components/account/signed-out-prompt";
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

  // /me shape is UNVERIFIED — fetch defensively and never crash on failure.
  // TODO: verify against live worker.
  const me = await apiFetch<MeLike>("/me", { token }).catch(() => null);

  return <ProfileView me={me} />;
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
