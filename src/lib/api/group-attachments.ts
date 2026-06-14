import type { Category } from "./types";

export interface AttachmentSubGroup {
  sub: { id: number; name: string };
  /** Attachment categories tagged to this sub-category. */
  attachments: Category[];
}

/**
 * Invert attachment categories (each carrying, in `subCategories`, the equipment
 * sub-categories it is tagged to) into sub-category → attachments groups. A
 * multi-tagged attachment appears under EACH of its sub-categories. Groups are
 * ordered by sub-category display order (numeric when possible, else name);
 * attachments keep input order (the API returns them by display_order).
 */
export function groupAttachmentsBySubcategory(
  attachments: Category[],
): AttachmentSubGroup[] {
  const order = new Map<number, string>(); // subId → display_order
  const names = new Map<number, string>(); // subId → name
  const bucket = new Map<number, Category[]>(); // subId → attachments

  for (const att of attachments) {
    for (const sub of att.subCategories) {
      if (!bucket.has(sub.id)) {
        bucket.set(sub.id, []);
        names.set(sub.id, sub.name);
        order.set(sub.id, sub.displayOrder ?? "");
      }
      bucket.get(sub.id)!.push(att);
    }
  }

  return Array.from(bucket.keys())
    .sort((a, b) => {
      const na = Number(order.get(a) ?? "");
      const nb = Number(order.get(b) ?? "");
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
      return (names.get(a) ?? "").localeCompare(names.get(b) ?? "");
    })
    .map((subId) => ({
      sub: { id: subId, name: names.get(subId) ?? "" },
      attachments: bucket.get(subId)!,
    }));
}
