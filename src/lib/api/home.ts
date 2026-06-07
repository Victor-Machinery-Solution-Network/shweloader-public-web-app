import { cacheLife, cacheTag } from "next/cache";
import { apiFetch } from "./client";
import { normalizeSlide } from "./normalize";
import { blurhashToDataUri } from "../blurhash";
import { CACHE_TAGS } from "./cache-tags";
import type { Announcement, ApiAnnouncement, ApiCarousel, Slide } from "./types";

export async function getCarousel(): Promise<Slide[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.carousel);
  const data = await apiFetch<ApiCarousel[]>("/carousel");
  // Decode each slide's blurhash into an inline data-URI placeholder. Runs once
  // per cache window (not per request) and the data URIs become part of the
  // cached value. Render sizes mirror the images (21:9 desktop, 16:9 mobile).
  return Promise.all(
    data.map(async (r) => {
      const slide = normalizeSlide(r);
      const [blurDataUrl, mobileBlurDataUrl] = await Promise.all([
        blurhashToDataUri(r.blurhash, 32, 14),
        blurhashToDataUri(r.mobile_blurhash, 32, 18),
      ]);
      return { ...slide, blurDataUrl, mobileBlurDataUrl };
    }),
  );
}

export async function getAnnouncements(): Promise<Announcement[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.announcements);
  const data = await apiFetch<ApiAnnouncement[]>("/announcements");
  return data.map((a) => ({ id: a.id, text: a.text }));
}
