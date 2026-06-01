# ShweLoader Web

The public website for **ShweLoader** — Myanmar's heavy-equipment marketplace (buy,
rent & sell machinery). A Next.js 16 app on Vercel that reuses the existing
`cloudflare-worker-app-rest-api-dev` Hono API. Built for speed, SEO, and AI
discoverability.

## Quick start

```bash
pnpm install
cp .env.example .env.local   # staging defaults already work for local dev
pnpm dev                     # http://localhost:3000
```

## Scripts

| Script | What |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |

## Environment

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin of this site (metadata, sitemap, canonical) |
| `APP_API_BASE_URL` | Worker API base (server-only; **prod URL TBD**, staging by default) |
| `NEXT_PUBLIC_ASSET_BASE_URL` | R2/CDN base for images |
| `NEXT_PUBLIC_PUSHER_KEY` / `_CLUSTER` | Live-chat realtime (optional) |
| `REVALIDATE_SECRET` | Auth for `POST /api/revalidate` |

## Structure

```
src/
  app/
    (public)/      # SEO-indexable pages: /, /browse, /product/[slug], /blogs, /blogs/[slug], /about, /legal
    (app)/         # noindex authed area: /account, /saved, /chat, /notifications
    api/           # auth proxy + revalidation route handlers
    sitemap.ts robots.ts manifest.ts opengraph-image.tsx llms.txt/  # SEO/AI surfaces
  components/
    shared/        # Header, Footer, ListingCard, SearchCard, AuthModal, …
    home|browse|product|blog/   # page-specific sections
    providers/     # theme, language, auth-ui
  lib/
    api/           # typed services over the worker API (server-side, `use cache`)
    i18n/ seo/ auth/  # dictionaries, JSON-LD + metadata, session
  styles/          # ported Claude Design CSS (tokens, ui-kit, app, per-page)
```

## How it works

- **Data**: server-side typed services in `src/lib/api/*` call the worker; public reads
  are cached via the `use cache` directive + `cacheTag` (refresh via `/api/revalidate`).
- **Design**: the Claude Design handoff CSS is ported verbatim; components emit matching
  class names. Tokens, fonts, dark mode are wired in `app/globals.css` + `app/fonts.ts`.
- **SEO/AI**: per-page metadata + JSON-LD, dynamic sitemap, robots, `/llms.txt`, branded OG.

See [`docs/DECISIONS.md`](docs/DECISIONS.md) for the full decision log and what still
needs sign-off, and [`docs/BUILD-CONTRACT.md`](docs/BUILD-CONTRACT.md) for conventions.

## Deploy

Deploy-ready for Vercel (`pnpm build`). Set the env vars above in the Vercel project,
then point the Cloudflare custom domain at Vercel. (Production deploy + DNS are
intentionally left for a human to verify — see DECISIONS.)
