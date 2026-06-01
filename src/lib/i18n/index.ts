import { dictionaries, type Dictionary } from "./dictionaries";

export const locales = ["en", "my"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "lang";

/** <html lang> value per locale (Burmese BCP-47 is `my`, not the app's `mm`). */
export const htmlLang: Record<Locale, string> = { en: "en", my: "my" };
export const ogLocale: Record<Locale, string> = { en: "en_MM", my: "my_MM" };

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

/** Resolve a dot-path ("home.featured") against a dictionary. */
export function translate(dict: Dictionary, path: string): string {
  const value = path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      dict,
    );
  return typeof value === "string" ? value : path;
}

export { dictionaries };
export type { Dictionary };
