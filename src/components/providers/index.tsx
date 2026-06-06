"use client";

import { Toaster } from "sonner";
import { ThemeProvider } from "./theme-provider";
import { LanguageProvider } from "./language-provider";
import { AuthUIProvider } from "./auth-ui";
import { AuthIntent } from "./auth-intent";
import { AuthProvider } from "@/lib/auth/use-auth";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AuthUIProvider>
            <AuthIntent />
            {children}
          </AuthUIProvider>
        </AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--m-bg-2)",
              color: "var(--m-ink)",
              border: "1px solid var(--m-line)",
            },
          }}
        />
      </LanguageProvider>
    </ThemeProvider>
  );
}
