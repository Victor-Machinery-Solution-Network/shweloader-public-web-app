import { getImageProps } from "next/image";
import { preload } from "react-dom";

/**
 * `sizes` for the product-page hero image. Single source of truth shared by the
 * Gallery hero <Image> and the intent-preload below, so the preloaded optimizer
 * URL selects the same width — a guaranteed cache hit, no blank flash on land.
 */
export const HERO_IMAGE_SIZES = "(max-width: 1024px) 100vw, 60vw";

/**
 * 1×1 PNG of the warm panel colour (`--m-bg-2` = #f8f6f0), used as the hero blur
 * placeholder so a cold load (e.g. an instant click with no hover lead time)
 * shows a neutral panel instead of a blank/white frame.
 */
export const HERO_BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mP48e0DAAXIAt/J7kRrAAAAAElFTkSuQmCC";

/**
 * Warm the product hero image into the browser cache on navigation intent
 * (hover / pointer-down on a listing). Uses `getImageProps` so the preloaded URL
 * + srcSet exactly match what the Gallery hero <Image> will request, making the
 * hero paint instantly on arrival instead of flashing blank. No-op for a missing
 * src; safe to call repeatedly (the browser dedupes the preload).
 */
export function preloadHeroImage(src: string | null | undefined): void {
  if (!src) return;
  const { props } = getImageProps({
    src,
    alt: "",
    fill: true,
    sizes: HERO_IMAGE_SIZES,
  });
  preload(props.src, {
    as: "image",
    fetchPriority: "low",
    ...(props.srcSet
      ? { imageSrcSet: props.srcSet, imageSizes: props.sizes }
      : {}),
  });
}
