import { cacheLife, cacheTag } from "next/cache";
import { apiFetch } from "./client";
import { CACHE_TAGS } from "./cache-tags";
import type { PartnerType } from "./types";

/**
 * Partner-type catalog (GET /partner-types). Public, slow-changing reference
 * data — cached like business types and busted via the partnerTypes cache tag.
 * Used by the signup onboarding step's "become a partner" picker.
 */
export async function getPartnerTypes(): Promise<PartnerType[]> {
  "use cache";
  cacheLife("days");
  cacheTag(CACHE_TAGS.partnerTypes);
  return apiFetch<PartnerType[]>("/partner-types");
}
