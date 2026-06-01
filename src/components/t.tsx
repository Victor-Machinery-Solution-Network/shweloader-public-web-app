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
