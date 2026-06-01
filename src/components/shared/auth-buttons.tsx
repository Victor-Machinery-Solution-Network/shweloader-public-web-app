"use client";

import { useAuthUI } from "@/components/providers/auth-ui";
import { useI18n } from "@/components/providers/language-provider";

/**
 * Signed-out auth cluster — the design's default "two_buttons" layout: a ghost
 * "Sign in" and a filled gold "Sign up". Both open the global auth modal via
 * useAuthUI().open('signin'|'register').
 */
export function AuthButtons() {
  const { t } = useI18n();
  const { open } = useAuthUI();
  return (
    <>
      <button
        type="button"
        className="mh-signin mh-signin-ghost"
        onClick={() => open("signin")}
      >
        {t("actions.signIn")}
      </button>
      <button
        type="button"
        className="mh-signin"
        onClick={() => open("register")}
      >
        {t("actions.signUp")}
      </button>
    </>
  );
}
