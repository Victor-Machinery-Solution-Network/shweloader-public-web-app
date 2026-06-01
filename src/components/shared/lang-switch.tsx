"use client";

import { useI18n } from "@/components/providers/language-provider";
import { Flag } from "@/components/shared/flag";

/**
 * EN / MY language switch — the design's "dual" segmented pill with a sliding
 * glide indicator. Drives the i18n locale via useI18n().setLocale.
 */
export function LangSwitch() {
  const { locale, setLocale } = useI18n();
  const isMy = locale === "my";
  return (
    <div className="mh-lang-switch" role="group" aria-label="Language">
      <span
        className={"mh-lang-glide " + (isMy ? "my" : "en")}
        aria-hidden="true"
      />
      <button
        type="button"
        className={"mh-lang-opt" + (!isMy ? " is-on" : "")}
        onClick={() => setLocale("en")}
        aria-pressed={!isMy}
        aria-label="English"
      >
        <Flag code="en" />
        <span className="mh-lang-code">Eng</span>
      </button>
      <button
        type="button"
        className={"mh-lang-opt" + (isMy ? " is-on" : "")}
        onClick={() => setLocale("my")}
        aria-pressed={isMy}
        aria-label="Myanmar"
      >
        <Flag code="my" />
        <span className="mh-lang-code">မြန်မာ</span>
      </button>
    </div>
  );
}
