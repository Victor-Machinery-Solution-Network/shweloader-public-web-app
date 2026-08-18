"use client";

import { useI18n } from "@/components/providers/language-provider";

/**
 * Inline translated string usable inside Server Components. Renders the default
 * locale (EN) in the static HTML — the canonical, crawlable text — and swaps to
 * the active locale on the client when the language toggle changes.
 */
export function T({ path }: { path: string }) {
  const { t } = useI18n();
  return <>{t(path)}</>;
}

/**
 * Same idea for DB-authored names that carry a Burmese column (`name_my`):
 * English in the static HTML, Burmese once the client picks the MM locale.
 * Falls back to English when a row has no translation yet.
 */
export function TName({ name, nameMy }: { name: string; nameMy?: string | null }) {
  const { locale } = useI18n();
  return <>{locale === "my" && nameMy ? nameMy : name}</>;
}
