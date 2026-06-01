import { cacheLife, cacheTag } from "next/cache";
import { apiFetch } from "./client";
import { normalizeState } from "./normalize";
import { CACHE_TAGS } from "./cache-tags";
import type { ApiState, StateRegion } from "./types";

export async function getLocations(): Promise<StateRegion[]> {
  "use cache";
  cacheLife("days");
  cacheTag(CACHE_TAGS.locations);
  const data = await apiFetch<ApiState[]>("/locations");
  return data.map(normalizeState);
}
