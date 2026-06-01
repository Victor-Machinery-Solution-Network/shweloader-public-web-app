import { cacheLife, cacheTag } from "next/cache";
import { apiFetch } from "./client";
import { normalizeCategory } from "./normalize";
import { CACHE_TAGS } from "./cache-tags";
import type { ApiBrand, ApiCategory, Brand, Category } from "./types";

export async function getEquipmentCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("days");
  cacheTag(CACHE_TAGS.categories);
  const data = await apiFetch<ApiCategory[]>("/categories/equipment");
  return data.map(normalizeCategory);
}

/** Attachment categories are flat (no sub_categories). */
export async function getAttachmentCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("days");
  cacheTag(CACHE_TAGS.categories);
  const data = await apiFetch<ApiCategory[]>("/categories/attachment");
  return data.map(normalizeCategory);
}

export async function getBrands(): Promise<Brand[]> {
  "use cache";
  cacheLife("days");
  cacheTag(CACHE_TAGS.brands);
  const data = await apiFetch<ApiBrand[]>("/brands");
  return data.map((b) => ({ id: b.id, name: b.name, models: b.models ?? [] }));
}
