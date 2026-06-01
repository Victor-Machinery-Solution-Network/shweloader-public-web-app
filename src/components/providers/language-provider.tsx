"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  defaultLocale,
  getDictionary,
  htmlLang,
  isLocale,
  LOCALE_COOKIE,
  translate,
  type Dictionary,
  type Locale,
} from "@/lib/i18n";

interface I18nContextValue {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
  t: (path: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readCookieLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const match = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/);
  const value = match?.[1];
  return isLocale(value) ? value : defaultLocale;
}

/**
 * Client-side locale preference. SSR renders the default locale (EN) — the
 * canonical, crawlable version — then this provider reads the `lang` cookie on
 * mount and swaps to Burmese if set, keeping pages static + fast.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  // Adopt the saved preference after hydration (avoids SSR/client mismatch).
  useEffect(() => {
    const saved = readCookieLocale();
    if (saved !== locale) {
      setLocaleState(saved);
      document.documentElement.lang = htmlLang[saved];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = htmlLang[next];
    // 1 year, site-wide
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const dict = getDictionary(locale);
    return {
      locale,
      dict,
      setLocale,
      t: (path: string) => translate(dict, path),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Safe fallback so components can render outside the provider (tests, etc.)
    const dict = getDictionary(defaultLocale);
    return {
      locale: defaultLocale,
      dict,
      setLocale: () => {},
      t: (path: string) => translate(dict, path),
    };
  }
  return ctx;
}
