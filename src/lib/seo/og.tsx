import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { formatListingPrice, type ListingPriceFields } from "@/lib/format";
import type { Listing } from "@/lib/api/types";

/** Open Graph canvas — 1.91:1, the size every scraper (FB/Viber/Telegram) expects. */
export const OG_SIZE = { width: 1200, height: 630 } as const;

const FONT_DIR = path.join(process.cwd(), "src/lib/seo/og-fonts");
const PUBLIC_DIR = path.join(process.cwd(), "public");

const INK = "#0a0906";
const GOLD = "#fbb811";

// ── Fonts (read from disk once, reused across renders) ───────────────────────
type OgFont = {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal";
};
let _fonts: Promise<OgFont[]> | null = null;

/** Poppins (Latin) + Noto Sans Myanmar (Burmese fallback). Vendored under
 *  og-fonts/ so generation never depends on a runtime network fetch. */
export function ogFonts(): Promise<OgFont[]> {
  if (!_fonts) {
    _fonts = (async () => {
      const [reg, bold, myReg, myBold] = await Promise.all([
        readFile(path.join(FONT_DIR, "Poppins-Regular.ttf")),
        readFile(path.join(FONT_DIR, "Poppins-Bold.ttf")),
        readFile(path.join(FONT_DIR, "Padauk-Regular.ttf")),
        readFile(path.join(FONT_DIR, "Padauk-Bold.ttf")),
      ]);
      return [
        { name: "Poppins", data: reg, weight: 400, style: "normal" },
        { name: "Poppins", data: bold, weight: 700, style: "normal" },
        // Burmese fallback for glyphs Poppins lacks. MUST be a static font —
        // Satori (next/og) hard-crashes the process on variable fonts, so we use
        // Padauk (SIL, static) rather than the 2-axis Noto Sans Myanmar variable.
        { name: "Padauk", data: myReg, weight: 400, style: "normal" },
        { name: "Padauk", data: myBold, weight: 700, style: "normal" },
      ];
    })();
  }
  return _fonts;
}

// ── WebP-safe hero photo ─────────────────────────────────────────────────────
/**
 * Satori (next/og) can't decode WebP and every listing/blog photo is WebP — so
 * fetch the source and transcode to a cover-cropped PNG data URI with sharp.
 * Returns null on any failure so the card still renders (photo-less).
 */
export async function coverPngDataUri(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const png = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(OG_SIZE.width, OG_SIZE.height, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Guaranteed-valid OG image when data load or render fails. */
export async function ogBannerResponse(): Promise<Response> {
  const buf = await readFile(path.join(PUBLIC_DIR, "brand/og-banner.png"));
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=3600",
    },
  });
}

/**
 * Display price line for the card. Mirrors listingMode/priceFields in
 * components/product/overview-card.tsx — replicated inline so this Node OG route
 * doesn't pull that client-heavy component (EnquiryForm, lucide) into its bundle.
 */
export function listingPriceLine(listing: Listing): string {
  const mode: "sale" | "rent" =
    listing.isRent && !listing.isSale ? "rent" : "sale";
  const fields: ListingPriceFields = {
    sale_mmk_price: listing.sale?.mmk ?? null,
    sale_usd_price: listing.sale?.usd ?? null,
    sale_hide_price: listing.sale?.hide ? 1 : 0,
    sale_display_currency: listing.sale?.currency ?? null,
    rent_mmk_price: listing.rent?.mmk ?? null,
    rent_usd_price: listing.rent?.usd ?? null,
    rent_hide_price: listing.rent?.hide ? 1 : 0,
    rent_display_currency: listing.rent?.currency ?? null,
    rent_rental_unit: listing.rent?.unit ?? null,
  };
  return formatListingPrice(fields, mode);
}

function clampTitle(title: string): string {
  const t = title.trim();
  return t.length > 80 ? `${t.slice(0, 79)}…` : t;
}

// ── Layout A: photo hero + bottom info bar ───────────────────────────────────
export function PhotoHeroCard(opts: {
  imageDataUri: string | null;
  title: string;
  line: string;
  badge?: string | null;
}) {
  const { imageDataUri, title, line, badge } = opts;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: INK,
        fontFamily: "Poppins",
      }}
    >
      {imageDataUri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageDataUri}
          width={OG_SIZE.width}
          height={OG_SIZE.height}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}

      {/* Bottom-up scrim so text stays legible over any photo. */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "72%",
          display: "flex",
          backgroundImage:
            "linear-gradient(to top, rgba(10,9,6,0.97) 4%, rgba(10,9,6,0.72) 38%, rgba(10,9,6,0) 100%)",
        }}
      />

      {badge ? (
        <div
          style={{
            position: "absolute",
            top: 44,
            left: 56,
            display: "flex",
            backgroundColor: GOLD,
            color: INK,
            fontSize: 28,
            fontWeight: 700,
            padding: "8px 22px",
            borderRadius: 10,
            letterSpacing: 1,
          }}
        >
          {badge}
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "0 56px 52px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 60,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.08,
            maxHeight: 204,
            overflow: "hidden",
          }}
        >
          {clampTitle(title)}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 24,
          }}
        >
          <div style={{ display: "flex", fontSize: 40, color: "#f3e7c4" }}>
            {line}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 36,
              fontWeight: 700,
              color: GOLD,
              letterSpacing: 0.5,
            }}
          >
            ShweLoader
          </div>
        </div>
      </div>
    </div>
  );
}
