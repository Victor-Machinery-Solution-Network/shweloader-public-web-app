import "server-only";

import { decode } from "blurhash";
import sharp from "sharp";

/**
 * Decode a (Wolt-standard) blurhash string — the same kind the admin upload
 * pipeline stores per image — into a tiny base64 PNG `data:` URI.
 *
 * The point is a placeholder that ships *inside the HTML*: a `data:` URI paints
 * with no extra network request, so a slide can show a soft blur of its photo
 * the instant the page renders, instead of a blank/black frame while the real
 * (separate, CDN-hosted) image downloads. Used server-side only (sharp is a
 * native Node module) inside the cached `getCarousel()`, so the decode runs at
 * most once per cache window, not per request.
 *
 * Rendered tiny (the result is blurred and stretched with `background-size:
 * cover`, so a ~32px source is plenty and keeps the inlined URI to a few
 * hundred bytes). Returns `null` for a missing/invalid hash — callers fall back
 * to a neutral panel.
 */
export async function blurhashToDataUri(
  hash: string | null | undefined,
  width = 32,
  height = 18,
): Promise<string | null> {
  if (!hash) return null;
  try {
    const pixels = decode(hash, width, height); // RGBA Uint8ClampedArray
    const png = await sharp(Buffer.from(pixels), {
      raw: { width, height, channels: 4 },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    // Malformed hash → no placeholder rather than a thrown render.
    return null;
  }
}
