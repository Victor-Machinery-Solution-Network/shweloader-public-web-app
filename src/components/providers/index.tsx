"use client";

import { Toaster } from "sonner";
import { ThemeProvider } from "./theme-provider";
import { LanguageProvider } from "./language-provider";
import { AuthUIProvider } from "./auth-ui";
import { AuthIntent } from "./auth-intent";
import { AuthProvider } from "@/lib/auth/use-auth";
import { SuspensionOverlay } from "@/components/shared/suspension-overlay";
import { CompleteProfileGate } from "@/components/shared/complete-profile-gate";
import { SavedSync } from "@/lib/saved/saved-sync";

export function Providers({
  children,
  supportEmail,
}: {
  children: React.ReactNode;
  supportEmail: string;
}) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AuthUIProvider>
            <AuthIntent />
            <SavedSync />
            {children}
            <SuspensionOverlay supportEmail={supportEmail} />
            <CompleteProfileGate />
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
