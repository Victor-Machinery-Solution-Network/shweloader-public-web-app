import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { fontVariables } from "./fonts";
import { Providers } from "@/components/providers";
import { getContactEmails } from "@/lib/api/settings";
import { baseMetadata } from "@/lib/seo/metadata";
import "./globals.css";

export const metadata: Metadata = baseMetadata;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbb811" },
    { media: "(prefers-color-scheme: dark)", color: "#15130e" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { support: supportEmail } = await getContactEmails();
  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <Providers supportEmail={supportEmail}>{children}</Providers>
        <Analytics />
        <SpeedInsights />
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  );
}
