import { Poppins, Noto_Sans_Myanmar, JetBrains_Mono } from "next/font/google";

/**
 * Self-hosted fonts (next/font downloads + serves them from our own origin —
 * no render-blocking request to fonts.googleapis.com, better LCP + privacy).
 *
 * The design system's final type decision (chat6/chat7):
 *   - Poppins (400/500/600/700) for all Latin body + headings
 *   - Noto Sans Myanmar paired 1:1 for Burmese runs
 *   - JetBrains Mono for tabular numerals only
 */
export const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

export const notoMyanmar = Noto_Sans_Myanmar({
  weight: ["400", "500", "600", "700"],
  subsets: ["myanmar"],
  variable: "--font-noto-myanmar",
  display: "swap",
  // Default UI is English; don't block on the Burmese face.
  preload: false,
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  preload: false,
});

export const fontVariables = `${poppins.variable} ${notoMyanmar.variable} ${jetbrainsMono.variable}`;
