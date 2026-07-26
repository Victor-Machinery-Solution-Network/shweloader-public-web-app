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
    // Vercel Image Optimization is OFF. We kept hitting the Hobby plan's 5k/month
    // transformation limit, and since R2 already stores every source as WebP the
    // optimizer was only re-compressing WebP→WebP — pure latency for no payoff.
    // Serving the R2 originals straight from Cloudflare's edge is measurably faster.
    // The optimizer-only settings (formats, minimumCacheTTL) were removed with it.
    // If the browse grid / product gallery ever gets too heavy without server-side
    // resizing, add a Cloudflare Image Transformations loader rather than
    // re-enabling Vercel's metered optimizer.
    unoptimized: true,

    // Security allowlist of hosts next/image may load (and what the optimizer would
    // be restricted to if it were ever re-enabled). NOT a `**` wildcard — that would
    // expose the authenticated api./app-api. subdomains (an SSRF surface).
    remotePatterns: [
      { protocol: "https", hostname: "asset.shweloader.com.mm" },
      { protocol: "https", hostname: "asset-staging.shweloader.com.mm" },
    ],
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

  // sharp runs server-side for OG-image transcoding (src/lib/seo/og.tsx) and
  // blurhash placeholders (src/lib/blurhash.ts) — keep it external (unbundled).
  // (No longer tied to next/image, which is now unoptimized.)
  serverExternalPackages: ["sharp"],

  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // Agent-critical plain files: `no-transform` stops edge compression.
      // Serving is spec-compliant either way, but many naive AI fetchers
      // advertise `Accept-Encoding: br` without actually decompressing —
      // they'd see "unreadable binary". These files are tiny; skip encoding.
      {
        source: "/(sitemap.xml|robots.txt|llms.txt)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate, no-transform",
          },
          // Vercel's edge ignores no-transform; an explicit identity encoding
          // makes it skip compression entirely (naive AI fetchers advertise
          // br/gzip they can't decode).
          { key: "Content-Encoding", value: "identity" },
        ],
      },
      // RFC 8288 agent-discovery: llms.txt is the machine-readable site guide.
      {
        source: "/",
        headers: [{ key: "Link", value: '</llms.txt>; rel="describedby"' }],
      },
    ];
  },
};

export default nextConfig;
