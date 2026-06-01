import { cacheLife, cacheTag } from "next/cache";
import { apiFetch } from "./client";
import { normalizeSlide } from "./normalize";
import { CACHE_TAGS } from "./cache-tags";
import type { Announcement, ApiAnnouncement, ApiCarousel, Slide } from "./types";

export async function getCarousel(): Promise<Slide[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.carousel);
  const data = await apiFetch<ApiCarousel[]>("/carousel");
  return data.map(normalizeSlide);
}

export async function getAnnouncements(): Promise<Announcement[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.announcements);
  const data = await apiFetch<ApiAnnouncement[]>("/announcements");
  return data.map((a) => ({ id: a.id, text: a.text }));
}
