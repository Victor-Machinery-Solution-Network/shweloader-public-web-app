import { cacheLife, cacheTag } from "next/cache";
import { apiFetch } from "./client";
import { CACHE_TAGS } from "./cache-tags";
import type { BusinessType } from "./types";

/**
 * Business-type catalog (GET /business-types). Public, slow-changing reference
 * data — cached like locations and busted via the businessTypes cache tag.
 */
export async function getBusinessTypes(): Promise<BusinessType[]> {
  "use cache";
  cacheLife("days");
  cacheTag(CACHE_TAGS.businessTypes);
  return apiFetch<BusinessType[]>("/business-types");
}
