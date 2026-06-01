"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";

/**
 * Header icon button that flips light/dark via next-themes (sets data-theme on
 * <html>, which the design CSS keys off). Renders a stable placeholder until
 * mounted to avoid a hydration mismatch on the resolved theme.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      className="mh-icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun strokeWidth={1.75} /> : <Moon strokeWidth={1.75} />}
    </button>
  );
}

/**
 * Segmented Light/Dark switch used inside the mobile drawer's preferences row.
 */
export function ThemeSwitch() {
  const { t } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  return (
    <div className="mh-theme-switch" role="group" aria-label="Theme">
      <span
        className={"mh-theme-glide " + (isDark ? "dark" : "light")}
        aria-hidden="true"
      />
      <button
        type="button"
        className={"mh-theme-opt" + (!isDark ? " is-on" : "")}
        onClick={() => setTheme("light")}
        aria-pressed={!isDark}
      >
        <Sun className="icon-sm" strokeWidth={1.75} />
        <span>{t("theme.light")}</span>
      </button>
      <button
        type="button"
        className={"mh-theme-opt" + (isDark ? " is-on" : "")}
        onClick={() => setTheme("dark")}
        aria-pressed={isDark}
      >
        <Moon className="icon-sm" strokeWidth={1.75} />
        <span>{t("theme.dark")}</span>
      </button>
    </div>
  );
}
