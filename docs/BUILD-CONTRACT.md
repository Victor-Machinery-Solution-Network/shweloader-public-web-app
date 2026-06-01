# ShweLoader Web — Build Contract

You are building one component or page of the ShweLoader public website (Next.js 16,
App Router, React 19, TS strict). The **foundation already exists** — import from it,
do not rebuild it. Read this contract fully before writing code.

## The golden rule — port the design, don't reinvent it

The visual design is a Claude Design handoff. The **proven CSS is already loaded
globally** (`src/styles/tokens.css`, `ui-kit.css`, `app.css`, and per-page CSS in
`src/styles/pages/*`). Your job: **reproduce the design's markup + class names** in a
typed React component and **wire it to real data**. Do NOT author new styling/Tailwind
for things the design CSS already styles — emit the same `className`s the prototype uses.

For each component/page, **read its design source** under
`/tmp/shweloader-design/shweloader-design-system/project/` — the `.jsx` file is the
markup truth, the matching `.css` (in `homepage/` or `signin/`) is the styling. The
prototype is React-UMD/Babel with `window.*` fixtures; translate it to RSC/TSX wired to
the API. Match the visual output, not the prototype's internal structure.

Per-page CSS lives at `src/styles/pages/<name>.css` and must be imported once by that
page (e.g. `import "@/styles/pages/browse.css"`). `app.css` + `tokens.css` + `ui-kit.css`
are already imported by `globals.css` — never re-import those.

## Stack + conventions

- **RSC by default.** Add `"use client"` only for interactivity (state, effects, event
  handlers, browser APIs). Pages that fetch are async Server Components.
- **Images:** `next/image`. Resolve API image keys with `assetUrl(key)` (from
  `@/lib/assets`). The asset host (`**.shweloader.com.mm`) is already allow-listed in
  `next.config.ts`. Always pass `sizes`. Use `focalPosition(x,y)` for object-position.
- **Icons:** `lucide-react` (stroke ~1.75). The prototype's `<Icon name="search"/>` maps
  to Lucide `Search`, etc. Keep the `icon-sm` class where the design uses it for sizing.
- **Dark mode** is automatic via `[data-theme="dark"]` on `<html>` (next-themes) — the
  design CSS already handles it. Don't add theme logic except the toggle component.
- **Translatable UI labels:** wrap with `<T path="nav.browse" />` (from `@/components/t`)
  in Server Components, or `const { t } = useI18n()` in Client Components (from
  `@/components/providers/language-provider`). **Catalog/blog content is NOT translated**
  (single-language from admin) — render as-is.
- **Money/labels:** use `formatListingPrice(listing, mode)`, `formatMMK`, `formatUSD`,
  `formatHours`, `formatDate`, `timeAgo` from `@/lib/format`. Prices are full numbers
  (`MMK 85,000,000`). Hidden price → `PRICE_ON_REQUEST`.
- **Slugs:** `listingSlug(listing)` → `/product/{slug}`; `blogSlug(post)` →
  `/blogs/{slug}` (from `@/lib/slug`).
- **`cn(...)`** from `@/lib/utils` for conditional classes.

## Product rules (from the design chats — do not violate)

- **No public listing counts** anywhere (homepage, cards, sections). EXCEPTION: facet
  counts inside Browse filters are allowed.
- **Honor masking flags:** show `seller.*` only when `listing.seller && !listing.seller.hidden`.
- **No SKU codes on cards.** "Verified" is removed from public surfaces.
- **Status pills** UPPERCASE (`NEW`, `SOLD`, `RENT`). Sold treatment: full-saturation
  stamp PNG (`/brand/sold-out-stamp.png`) over a dimmed photo (see ListingCard design).
- **Hero** = admin image + optional link only, NO text overlay; 21:9.
- **Search is contextual** (homepage SearchCard + top of Browse) — NEVER in the header.
- **60fps:** animate transform/opacity only; the design CSS already follows this — keep it.

## Foundation API (import, don't rebuild)

Data services (all server-side, cached via `use cache`) — `@/lib/api/<file>`:
- `listings.ts`: `getFeaturedListings()`, `getSaleListings(q)`, `getRentListings(q)`,
  `browseListings({mode,query})`, `getListing(id)→Listing|null`,
  `getRelatedListings(listing,limit)`, `getAllListingsForSitemap()`.
- `blogs.ts`: `getBlogs(q)`, `getBlog(id)→BlogPost|null`, `getBlogCategories()`,
  `getRelatedBlogs(post,limit)`.
- `taxonomy.ts`: `getEquipmentCategories()→Category[]` (nested subCategories),
  `getAttachmentCategories()→Category[]` (flat), `getBrands()→Brand[]`.
- `home.ts`: `getCarousel()→Slide[]`, `getAnnouncements()→Announcement[]`.
- `locations.ts`: `getLocations()→StateRegion[]` (state→district→township, each has
  `name`/`nameMy`).
- `feedback.ts`: `submitFeedback({message}, token?)`.
- Types: `@/lib/api/types` — `Listing`, `BlogPost`, `Category`, `Brand`, `Slide`,
  `Announcement`, `StateRegion`, `ListingQuery`. **Read this file** for exact fields.
  `Listing` highlights: `id,title,brand,category,subCategory,condition,type,
  thumbnail{url,thumbUrl,blurhash,focalX,focalY}, images[], isSale,isRent,
  sale{mmk,usd,hide,currency,customId}|null, rent{...,unit}|null, isSoldOut,isRented,
  location{township,district,state,address}, seller{name,company,phone,hidden}|null,
  pdfUrl, customFields[{key,label,type,value}], description`.

SEO — `@/lib/seo/...`:
- `metadata.ts`: `buildMetadata({title,description,path,images,type,noindex})`,
  `baseMetadata`, `noindexMetadata`, `SITE_NAME`.
- `jsonld.tsx`: `<JsonLd data={...} />` + builders `organizationSchema()`,
  `websiteSchema()`, `breadcrumbSchema(items)`, `productSchema(listing)`,
  `blogPostingSchema(post)`, `itemListSchema(listings)`, `aboutPageSchema()`.

Other: `@/lib/env` (`SITE_URL`, `ASSET_BASE_URL`, `absoluteUrl`), `@/lib/utils`
(`cn`, `toPlainText`, `truncate`), `@/components/providers/auth-ui` (`useAuthUI()` to
open the auth modal), `@/lib/auth/use-auth` (`useAuth()` → `{signedIn,user,signOut}`).

## File paths you may create (write ONLY your assigned files)

Shared components → `src/components/shared/<kebab>.tsx`.
Page-specific components → `src/components/<page>/<kebab>.tsx`.
Routes → `src/app/(public)/<route>/page.tsx` or `src/app/(app)/<route>/page.tsx`.

Do NOT edit foundation files, layouts, `globals.css`, `src/lib/**`, or another agent's
files. If you need a shared helper that doesn't exist, add it inside your own folder.

## Page rendering + SEO

- Public pages export `metadata` (or `generateMetadata`) via `buildMetadata(...)` with a
  correct `path` (canonical). Detail pages set OG `images` to the real photo.
- Public pages render their JSON-LD with `<JsonLd>` (Home: Organization+WebSite;
  Product: Product+Offer+BreadcrumbList; Blog post: BlogPosting+BreadcrumbList; Browse:
  ItemList+BreadcrumbList; About: AboutPage).
- App-area pages (`(app)/*`) export `metadata = noindexMetadata` and are auth-gated.
- Product/Blog detail: param is `[slug]`; parse id with `parseIdFromSlug(slug)`. If the
  incoming slug differs from the canonical `listingSlug`/`blogSlug`, `redirect()` to the
  canonical URL (301). `notFound()` if the id doesn't resolve.

## Accessibility

Preserve aria-* and semantic elements from the design JSX. Keyboard-operable menus/modals.
The design CSS already provides `:focus-visible`, skip link, reduced-motion. Main content
wrapper is `<main id="main">` (provided by the layout) — don't duplicate it.
