"use client";

import { ArrowRight, UserCircle } from "lucide-react";
import { useAuthUI } from "@/components/providers/auth-ui";
import { useI18n } from "@/components/providers/language-provider";

/**
 * Friendly signed-out state for the account page. Opens the global auth modal
 * via useAuthUI().open('signin') rather than redirecting, so the user stays in
 * place. Never crashes when signed out.
 *
 * Styled only with globally-available classes (profile.css `pf-*` + app.css
 * `sl-avatar`), since browse.css `.empty*` styles aren't loaded on this route.
 */
export function SignedOutPrompt({ message }: { message: string }) {
  const { open } = useAuthUI();
  const { t } = useI18n();

  return (
    <main className="pf-page">
      <div
        className="pf-wrap pf-wrap--narrow"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 16,
          paddingTop: 96,
        }}
      >
        <span
          className="sl-avatar"
          style={{ width: 72, height: 72 }}
          aria-hidden="true"
        >
          <UserCircle width={34} height={34} strokeWidth={1.5} />
        </span>
        <div>
          <div className="pf-id-name" style={{ justifyContent: "center" }}>
            {t("account.title")}
          </div>
          <p
            className="pf-section-desc"
            style={{ marginInline: "auto", marginTop: 8 }}
          >
            {message}
          </p>
        </div>
        <button
          type="button"
          className="pf-save"
          onClick={() => open("signin")}
        >
          {t("actions.signIn")}
          <ArrowRight className="icon-sm" strokeWidth={1.75} />
        </button>
      </div>
    </main>
  );
}
