import { cacheLife, cacheTag } from "next/cache";
import { apiFetch } from "./client";
import { normalizeCategory } from "./normalize";
import { CACHE_TAGS } from "./cache-tags";
import type {
  ApiBrand,
  ApiCategory,
  Brand,
  Category,
  ConditionType,
} from "./types";

export async function getEquipmentCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("days");
  cacheTag(CACHE_TAGS.categories);
  const data = await apiFetch<ApiCategory[]>("/categories/equipment");
  return data.map(normalizeCategory);
}

/** Listing condition catalog (New / Used / Certified Used …), admin-managed. */
export async function getConditionTypes(): Promise<ConditionType[]> {
  "use cache";
  cacheLife("days");
  cacheTag(CACHE_TAGS.categories);
  const data = await apiFetch<ConditionType[]>("/condition-types");
  return data.map((c) => ({ id: c.id, name: c.name }));
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

/**
 * Burmese names for a listing's category / sub-category. A listing payload
 * carries only the English name, so resolve it against the cached equipment
 * taxonomy — `equipment_main_category` / `equipment_sub_category` are the only
 * category tables with a `name_my` column. No match (attachments, or a row the
 * admin hasn't translated yet) → null, and callers fall back to English.
 */
export async function categoryNamesMy(
  category: string | null,
  subCategory: string | null,
): Promise<{ categoryMy: string | null; subCategoryMy: string | null }> {
  if (!category && !subCategory) return { categoryMy: null, subCategoryMy: null };
  const cats = await getEquipmentCategories();
  const main = category ? cats.find((c) => c.name === category) : undefined;
  const subs = main ? main.subCategories : cats.flatMap((c) => c.subCategories);
  const sub = subCategory ? subs.find((s) => s.name === subCategory) : undefined;
  return { categoryMy: main?.nameMy ?? null, subCategoryMy: sub?.nameMy ?? null };
}
