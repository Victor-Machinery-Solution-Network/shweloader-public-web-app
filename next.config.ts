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
    // Vercel Image Optimization is DISABLED — we kept hitting the Hobby plan's
    // 5k/month transformation limit. Source images in R2 are already stored as
    // WebP, so the only thing we lose by skipping the optimizer is server-side
    // *resizing* (responsive widths): the full-resolution WebP is now served
    // regardless of display size. Watch payload on the browse grid + product
    // gallery (esp. mobile); if it's too heavy, the fix is a Cloudflare Image
    // Transformations loader (assets already live behind asset.shweloader.com.mm)
    // rather than re-enabling Vercel's metered optimizer.
    //
    // To revert: delete `unoptimized` below. remotePatterns/formats/minimumCacheTTL
    // are kept (no-ops while unoptimized) so re-enabling is a one-line change.
    unoptimized: true,

    // Explicit R2 asset hosts only (prod + staging) — NOT a `**` wildcard, which
    // would let the image optimizer proxy-fetch from the authenticated API
    // subdomains (api./app-api.) too — an SSRF surface.
    remotePatterns: [
      { protocol: "https", hostname: "asset.shweloader.com.mm" },
      { protocol: "https", hostname: "asset-staging.shweloader.com.mm" },
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
