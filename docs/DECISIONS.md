# ShweLoader Web — Decisions Log

Autonomous build started 2026-06-01. This records every non-obvious decision made
while you were away, and what still needs you. Nothing irreversible (production
deploy, DNS) was done — see "Needs you" at the bottom.

## Architecture

- **Separate Next.js 16 app** on Vercel (the planned desktop website), reusing the
  existing `cloudflare-worker-app-rest-api-dev` Hono API. Lives at
  `ShweLoader/shweloader-web` (its own git repo).
- **All API calls are server-side** (RSC + route handlers). The browser never calls
  the worker directly. **This removes the CORS dependency entirely** — the worker's
  `ALLOWED_ORIGINS` change is NOT a launch blocker (it's only needed if we later add
  client-side worker calls). Public reads need no auth; authed calls use the JWT from
  an httpOnly cookie, proxied server-side.
- Stack matches the admin portal: Next 16 App Router, React 19, TS strict, pnpm,
  Tailwind 4, PPR (`cacheComponents`) + React Compiler, next-themes, lucide-react,
  Vercel Analytics + Speed Insights.

## Design fidelity

- The Claude Design handoff's **proven CSS is ported as-is** (`src/styles/*`) and
  components emit the same class names. This guarantees pixel fidelity (and keeps the
  design's 60fps/dark-mode/responsive/a11y work) instead of re-deriving 8k lines of CSS.
- **Font = Poppins** (resolved from the latest design chats; README/SKILL "Inter" is
  stale). Self-hosted via `next/font` (no render-blocking Google Fonts). Burmese =
  Noto Sans Myanmar; JetBrains Mono for tabular numerals.
- Dark mode via `next-themes` with `attribute="data-theme"` (matches the design's
  `[data-theme="dark"]` selectors).

## Product rules honored (from the design chats)

- No public listing counts (facet counts inside Browse filters are OK).
- Seller PII (`seller_name/company/phone`) shown only when `!hide_partner`.
- Hidden price → "Price on request". MMK shown as full numbers.
- Hero = admin image + link, no text overlay. Search is contextual, never in the header.
- UPPERCASE status pills; sold-out stamp over a dimmed photo.

## SEO / AI-readiness

- Per-page metadata + canonical; OG/Twitter; `og:locale en_MM` + `my_MM` alternate.
- JSON-LD: Organization, WebSite+SearchAction (home), Product+Offer + BreadcrumbList
  (product), BlogPosting + BreadcrumbList (post), ItemList + BreadcrumbList (browse),
  AboutPage (about).
- `sitemap.xml` enumerates static routes + every listing + every blog post (with
  `lastmod`). `robots.ts` allows all, disallows the app area + `/api/`.
- Branded `opengraph-image` (next/og). PWA `manifest`. **`/llms.txt`** for AI crawlers.
- On-demand ISR: `POST /api/revalidate` (secret + tags) so admin edits refresh content.

## URLs & i18n

- SEO slugs: `/product/{title-id}`, `/blogs/{title-id}`. A bare `/product/{id}` resolves
  and 301s to the slug form (app deep-link parity). `parseIdFromSlug` reads the trailing id.
- i18n: clean URLs (no `/[lang]`). EN is the canonical, statically rendered, crawled
  version. Language is a **client-side preference** (cookie + `<html lang>` swap) so pages
  stay static/fast. Chrome strings are translated (`<T>` / `useI18n`); catalog/blog
  **content stays single-language** as authored in admin. Burmese chrome covers the visible
  UI and should get a native-speaker review (design open-question #5).

## Auth (authed app area)

- Server-side proxy: `POST /api/auth/{login,register,otp/verify,otp/resend,logout}` call
  the worker and set an **httpOnly** `sl_token` cookie (+ readable `sl_user` for UI). No
  token in JS, no CORS. Matches the worker shapes (login may return tokens directly or
  require OTP; staging OTP = `123456`).
- **Needs live testing** — OTP delivery, token refresh-on-expiry (access token is 1h;
  auto-refresh via `/auth/refresh` is not yet wired), and the full chat realtime path.

## Deferred / needs you

1. **Confirm production API + asset URLs** — only staging is known. Set `APP_API_BASE_URL`
   and `NEXT_PUBLIC_ASSET_BASE_URL` in Vercel; update `NEXT_PUBLIC_SITE_URL` to the real domain.
2. **Production deploy + Cloudflare DNS** — NOT done. The app is deploy-ready (`pnpm build`).
   Point the custom domain on Cloudflare to Vercel when you're ready to verify.
3. **Live-test the authed area** (sign-in/OTP/chat) against the worker.
4. **Native Burmese review** of `src/lib/i18n/dictionaries.ts`.
5. **Live support chat realtime** uses Pusher — set `NEXT_PUBLIC_PUSHER_KEY` to enable;
   falls back to a UI-only state otherwise.
6. Optional: tighten the CSP in `next.config.ts` with nonces.

## Security notes

- JSON-LD uses `dangerouslySetInnerHTML` with `<`→`<` escaping on server-built,
  typed data (safe, canonical pattern).
- Blog HTML content is sanitized with `isomorphic-dompurify` before render.
- Standard security headers + HSTS set in `next.config.ts`.
