import type { NextConfig } from "next";

/**
 * Security headers applied to every route.
 * HSTS + the standard hardening set. CSP is intentionally permissive for
 * styles (Tailwind/Next inject inline styles) and is documented for tightening
 * with nonces in DECISIONS.md.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Match the admin portal: Partial Prerendering + React Compiler.
  cacheComponents: true,
  reactCompiler: true,

  images: {
    // R2 asset domains (staging today, prod later) all live under shweloader.com.mm.
    remotePatterns: [
      { protocol: "https", hostname: "**.shweloader.com.mm" },
    ],
    formats: ["image/avif", "image/webp"],
    // Keep optimized images (incl. the hero LCP) warm in Vercel's cache for a year
    // so first-time visitors don't pay the on-demand re-optimize cold start. Safe
    // because R2 asset URLs are timestamped — content changes change the URL.
    minimumCacheTTL: 31536000,
  },

  // Trim client bundles for icon-heavy imports.
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // Inline the global stylesheet into <style> in the <head> on first load
    // (production only) instead of a render-blocking <link> — removes the
    // ~1s render-blocking CSS round-trip that delayed FCP/LCP. Prerendered
    // pages still use <link> for client-side nav to avoid RSC duplication.
    inlineCss: true,
  },

  // Use the native sharp pipeline for next/image optimization.
  serverExternalPackages: ["sharp"],

  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
