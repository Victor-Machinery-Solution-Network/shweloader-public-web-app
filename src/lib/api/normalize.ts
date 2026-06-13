import { assetUrl } from "@/lib/assets";
import type {
  ApiBlog,
  ApiCarousel,
  ApiCategory,
  ApiListing,
  ApiState,
  BlogPost,
  Category,
  CustomField,
  Listing,
  ListingImage,
  Slide,
  StateRegion,
} from "./types";

function image(
  url?: string | null,
  thumb?: string | null,
  blurhash?: string | null,
  fx?: number | null,
  fy?: number | null,
): ListingImage {
  return {
    url: assetUrl(url),
    thumbUrl: assetUrl(thumb),
    blurhash: blurhash ?? null,
    focalX: typeof fx === "number" ? fx : 0.5,
    focalY: typeof fy === "number" ? fy : 0.5,
  };
}

function parseCustomFields(raw?: string | null): CustomField[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((f) => f && typeof f === "object" && "value" in f)
      .map((f) => ({
        key: String(f.key ?? ""),
        label: String(f.label ?? f.key ?? ""),
        type: String(f.type ?? "text"),
        value: String(f.value ?? ""),
      }))
      .filter((f) => f.value.trim() !== "");
  } catch {
    return [];
  }
}

export function normalizeListing(r: ApiListing): Listing {
  const type: "equipment" | "attachment" =
    r.type === "attachment" || (!r.type && r.attachment_model_name)
      ? "attachment"
      : "equipment";

  const title =
    r.model_name ||
    r.equipment_model_name ||
    r.attachment_model_name ||
    "Listing";

  const category =
    r.category_name ||
    r.equipment_category_name ||
    r.attachment_category_name ||
    null;
  const subCategory =
    r.sub_category_name || r.equipment_sub_category_name || null;

  const hasSale =
    r.sale_listing_id != null ||
    r.sale_mmk_price != null ||
    r.sale_usd_price != null ||
    r.sale_hide_price != null;
  const hasRent =
    r.rent_listing_id != null ||
    r.rent_mmk_price != null ||
    r.rent_usd_price != null ||
    r.rent_hide_price != null ||
    r.rent_rental_unit != null;

  const seller =
    r.seller_name || r.seller_company || r.seller_phone
      ? {
          name: r.seller_name ?? null,
          company: r.seller_company ?? null,
          phone: r.seller_phone ?? null,
          hidden: !!r.hide_partner,
        }
      : null;

  // Model id (equipment or attachment) — the /listings response already includes
  // it; the normalizer just dropped it. Kept so the Saved page can filter by model
  // client-side (Browse filters by model server-side).
  const rawModelId = r.equipment_model_id ?? r.attachment_model_id;
  const modelId = rawModelId == null ? null : Number(rawModelId) || null;

  return {
    id: r.id,
    title,
    brand: r.brand_name ?? null,
    modelId,
    category,
    subCategory,
    condition: r.condition_name ?? null,
    type,
    description: r.description ?? null,
    thumbnail: image(
      r.thumbnail_url,
      r.thumbnail_sm_url,
      r.thumbnail_blurhash,
      r.thumbnail_focal_x,
      r.thumbnail_focal_y,
    ),
    images: (r.images ?? []).map((i) =>
      image(i.url, i.thumb_url, i.blurhash, i.focal_x, i.focal_y),
    ),
    isSale: hasSale,
    isRent: hasRent,
    sale: hasSale
      ? {
          // The actual sale_listing row id (NOT product_list id `r.id`) — needed
          // to attach this listing to a chat message (chat_message.sale_listing_id
          // FKs sale_listing(id)).
          listingId: (r.sale_listing_id as number | null) ?? null,
          mmk: r.sale_mmk_price ?? null,
          usd: r.sale_usd_price ?? null,
          hide: !!r.sale_hide_price,
          currency: r.sale_display_currency ?? null,
          customId: r.sale_custom_id ?? null,
        }
      : null,
    rent: hasRent
      ? {
          listingId: (r.rent_listing_id as number | null) ?? null,
          mmk: r.rent_mmk_price ?? null,
          usd: r.rent_usd_price ?? null,
          hide: !!r.rent_hide_price,
          currency: r.rent_display_currency ?? null,
          customId: r.rent_custom_id ?? null,
          unit: r.rent_rental_unit ?? null,
        }
      : null,
    isSoldOut: !!r.is_sold_out,
    isRented: !!r.is_rented,
    location: {
      township: r.township_name ?? null,
      district: r.district_name ?? null,
      state: r.state_region_name ?? null,
      address: r.address ?? null,
    },
    seller,
    pdfUrl: assetUrl(r.equipment_pdf_url || r.attachment_pdf_url),
    customFields: parseCustomFields(r.custom_fields),
    createdAt: r.created_at ?? null,
  };
}

export function normalizeBlog(r: ApiBlog): BlogPost {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    author: r.author ?? null,
    cover: {
      url: assetUrl(r.image),
      blurhash: r.image_blurhash ?? null,
      focalX: typeof r.focal_x === "number" ? r.focal_x : 0.5,
      focalY: typeof r.focal_y === "number" ? r.focal_y : 0.5,
    },
    date: r.date ?? r.created_at ?? null,
    readTime: r.read_time ?? 1,
    category: r.category ?? null,
    createdAt: r.created_at ?? null,
  };
}

export function normalizeCategory(r: ApiCategory): Category {
  return {
    id: r.id,
    name: r.name,
    image: assetUrl(r.image_url),
    subCategories: (r.sub_categories ?? []).map((s) => ({
      id: s.id,
      parentId: s.parent_id,
      name: s.name,
      image: assetUrl(s.image_url),
    })),
  };
}

export function normalizeSlide(r: ApiCarousel): Slide {
  return {
    id: r.image_id ?? r.carousel_id,
    href: r.link_url ?? null,
    image: assetUrl(r.image_url),
    blurhash: r.blurhash ?? null,
    // Decoded server-side (sharp) in getCarousel — kept null here so this stays
    // a pure, sync normalizer.
    blurDataUrl: null,
    focalX: typeof r.focal_x === "number" ? r.focal_x : 0.5,
    focalY: typeof r.focal_y === "number" ? r.focal_y : 0.5,
    mobileImage: assetUrl(r.mobile_image_url),
    mobileBlurDataUrl: null,
    mobileFocalX: typeof r.mobile_focal_x === "number" ? r.mobile_focal_x : 0.5,
    mobileFocalY: typeof r.mobile_focal_y === "number" ? r.mobile_focal_y : 0.5,
  };
}

export function normalizeState(r: ApiState): StateRegion {
  return {
    id: r.id,
    name: r.name,
    nameMy: r.name_my ?? null,
    districts: (r.districts ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      nameMy: d.name_my ?? null,
      townships: (d.townships ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        nameMy: t.name_my ?? null,
      })),
    })),
  };
}
