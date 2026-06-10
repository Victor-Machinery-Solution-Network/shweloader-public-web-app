import { ImageResponse } from "next/og";
import { getBlog } from "@/lib/api/blogs";
import { parseIdFromSlug } from "@/lib/slug";
import { assetUrl } from "@/lib/assets";
import {
  OG_SIZE,
  PhotoHeroCard,
  coverPngDataUri,
  ogBannerResponse,
  ogFonts,
} from "@/lib/seo/og";

// sharp + fs + remote image fetch → needs the Node runtime, not Edge.
export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "ShweLoader blog article";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  try {
    const { slug } = await params;
    const id = parseIdFromSlug(slug);
    const post = id ? await getBlog(id) : null;
    if (!post) return ogBannerResponse();

    const line = ["Article", post.category].filter(Boolean).join("   ·   ");
    const imageDataUri = await coverPngDataUri(assetUrl(post.cover.url));

    return new ImageResponse(
      PhotoHeroCard({
        imageDataUri,
        title: post.title,
        line,
        badge: "BLOG",
      }),
      { ...OG_SIZE, fonts: await ogFonts() },
    );
  } catch {
    return ogBannerResponse();
  }
}
