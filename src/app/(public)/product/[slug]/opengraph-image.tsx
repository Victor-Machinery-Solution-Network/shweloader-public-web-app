import { ImageResponse } from "next/og";
import { getListing } from "@/lib/api/listings";
import { parseIdFromSlug } from "@/lib/slug";
import { assetUrl } from "@/lib/assets";
import {
  OG_SIZE,
  PhotoHeroCard,
  coverPngDataUri,
  listingPriceLine,
  ogBannerResponse,
  ogFonts,
} from "@/lib/seo/og";

// sharp + fs + remote image fetch → needs the Node runtime, not Edge.
export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "ShweLoader heavy-equipment listing";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  try {
    const { slug } = await params;
    const id = parseIdFromSlug(slug);
    const listing = id ? await getListing(id) : null;
    if (!listing) return ogBannerResponse();

    const condition = listing.condition
      ? listing.condition.toLowerCase() === "new"
        ? "New"
        : "Used"
      : null;
    const line = [listingPriceLine(listing), condition]
      .filter(Boolean)
      .join("   ·   ");
    const badge = listing.isSoldOut
      ? "SOLD"
      : listing.isRent && !listing.isSale
        ? "FOR RENT"
        : "FOR SALE";

    const key = listing.thumbnail?.url ?? listing.images?.[0]?.url ?? null;
    const imageDataUri = await coverPngDataUri(assetUrl(key));

    return new ImageResponse(
      PhotoHeroCard({ imageDataUri, title: listing.title, line, badge }),
      { ...OG_SIZE, fonts: await ogFonts() },
    );
  } catch {
    return ogBannerResponse();
  }
}
