"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Dark mode via next-themes, using the `data-theme` attribute so it matches the
 * design CSS selectors ([data-theme="dark"]). Light is the default; the toggle
 * lives in the header. The pre-hydration script prevents a flash.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={false}
      themes={["light", "dark"]}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
