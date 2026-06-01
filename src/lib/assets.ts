import { ASSET_BASE_URL } from "./env";

/**
 * Resolve an R2 image key (e.g. "products/photos/foo.webp") to a full public
 * URL. Pass-through for values that are already absolute URLs. Returns null for
 * empty input so callers can fall back to a placeholder.
 */
export function assetUrl(key?: string | null): string | null {
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) return key;
  return `${ASSET_BASE_URL}/${key.replace(/^\/+/, "")}`;
}

/** CSS object-position string from focal point fields (default centre). */
export function focalPosition(
  x?: number | null,
  y?: number | null,
): string {
  const fx = typeof x === "number" ? x : 0.5;
  const fy = typeof y === "number" ? y : 0.5;
  return `${(fx * 100).toFixed(1)}% ${(fy * 100).toFixed(1)}%`;
}
