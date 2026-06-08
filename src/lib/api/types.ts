/* ============================================================================
   App REST API — raw response types (from the live staging worker) + the
   normalized view-models the UI consumes. Endpoints vary in shape (e.g.
   /listings/featured returns `model_name`, /listings/sale returns
   `equipment_model_name`), so every raw field is optional and the normalizers
   (./normalize.ts) collapse them into a single stable shape.
   ============================================================================ */

// ── Raw ──────────────────────────────────────────────────────────────────────

export interface ApiImage {
  url: string;
  thumb_url?: string | null;
  blurhash?: string | null;
  focal_x?: number | null;
  focal_y?: number | null;
}

export interface ApiListing {
  id: number;
  description?: string | null;
  thumbnail_url?: string | null;
  thumbnail_sm_url?: string | null;
  thumbnail_blurhash?: string | null;
  thumbnail_focal_x?: number | null;
  thumbnail_focal_y?: number | null;

  // normalized names (featured)
  model_name?: string | null;
  category_name?: string | null;
  sub_category_name?: string | null;

  // equipment / attachment variants (sale, rent, detail)
  equipment_model_id?: number | string | null;
  equipment_model_name?: string | null;
  equipment_category_name?: string | null;
  equipment_sub_category_name?: string | null;
  equipment_pdf_url?: string | null;
  attachment_model_id?: number | string | null;
  attachment_model_name?: string | null;
  attachment_category_name?: string | null;
  attachment_pdf_url?: string | null;

  brand_name?: string | null;
  condition_name?: string | null;
  type?: "equipment" | "attachment" | string | null;

  sale_listing_id?: number | null;
  sale_mmk_price?: number | null;
  sale_usd_price?: number | null;
  sale_hide_price?: number | null;
  sale_display_currency?: string | null;
  sale_custom_id?: string | null;

  rent_listing_id?: number | null;
  rent_mmk_price?: number | null;
  rent_usd_price?: number | null;
  rent_hide_price?: number | null;
  rent_display_currency?: string | null;
  rent_rental_unit?: string | null;
  rent_custom_id?: string | null;

  is_sold_out?: number | null;
  is_rented?: number | null;

  township_name?: string | null;
  district_name?: string | null;
  state_region_name?: string | null;
  address?: string | null;

  hide_partner?: number | null;
  seller_name?: string | null;
  seller_company?: string | null;
  seller_phone?: string | null;

  custom_fields?: string | null;
  created_at?: string | null;
  display_order?: string | null;
  images?: ApiImage[] | null;
}

export interface ApiBlog {
  id: number;
  title: string;
  content: string;
  author?: string | null;
  image?: string | null;
  image_thumb?: string | null;
  image_blurhash?: string | null;
  focal_x?: number | null;
  focal_y?: number | null;
  date?: string | null;
  read_time?: number | null;
  created_at?: string | null;
  category?: string | null;
}

export interface ApiBlogCategory {
  id: number;
  name: string;
}

export interface ApiSubCategory {
  id: number;
  parent_id: number;
  name: string;
  image_url?: string | null;
  display_order?: string | null;
}

export interface ApiCategory {
  id: number;
  name: string;
  image_url?: string | null;
  display_order?: string | null;
  sub_categories?: ApiSubCategory[];
}

export interface ApiBrand {
  id: number;
  name: string;
  /** Models under this brand (equipment + attachment), for the Browse filter. */
  models?: { id: number; name: string }[];
}

export interface ApiCarousel {
  carousel_id: number;
  image_id: number;
  display_order?: string | null;
  link_url?: string | null;
  // Desktop (21:9)
  image_url: string;
  thumb_url?: string | null;
  blurhash?: string | null;
  focal_x?: number | null;
  focal_y?: number | null;
  // Mobile (16:9)
  mobile_image_url: string;
  mobile_thumb_url?: string | null;
  mobile_blurhash?: string | null;
  mobile_focal_x?: number | null;
  mobile_focal_y?: number | null;
}

export interface ApiAnnouncement {
  id: number;
  text: string;
  display_order?: string | null;
}

export interface ApiTownship {
  id: number;
  name: string;
  name_my?: string | null;
}
export interface ApiDistrict {
  id: number;
  name: string;
  name_my?: string | null;
  townships?: ApiTownship[];
}
export interface ApiState {
  id: number;
  name: string;
  name_my?: string | null;
  districts?: ApiDistrict[];
}

// ── Normalized view-models ──────────────────────────────────────────────────

export interface ListingImage {
  url: string | null;
  thumbUrl: string | null;
  blurhash: string | null;
  focalX: number;
  focalY: number;
}

export interface CustomField {
  key: string;
  label: string;
  type: string;
  value: string;
}

export interface ListingPrice {
  mmk: number | null;
  usd: number | null;
  hide: boolean;
  currency: string | null;
  customId: string | null;
}

export interface Listing {
  id: number;
  title: string;
  brand: string | null;
  /** Model id (equipment or attachment) — needed for client-side model filtering
   *  on the Saved page (Browse filters by model server-side). */
  modelId: number | null;
  category: string | null;
  subCategory: string | null;
  condition: string | null;
  type: "equipment" | "attachment";
  description: string | null;
  thumbnail: ListingImage;
  images: ListingImage[];
  isSale: boolean;
  isRent: boolean;
  sale: ListingPrice | null;
  rent: (ListingPrice & { unit: string | null }) | null;
  isSoldOut: boolean;
  isRented: boolean;
  location: {
    township: string | null;
    district: string | null;
    state: string | null;
    address: string | null;
  };
  seller: {
    name: string | null;
    company: string | null;
    phone: string | null;
    hidden: boolean;
  } | null;
  pdfUrl: string | null;
  customFields: CustomField[];
  createdAt: string | null;
}

export interface BlogPost {
  id: number;
  title: string;
  content: string;
  author: string | null;
  cover: {
    url: string | null;
    blurhash: string | null;
    focalX: number;
    focalY: number;
  };
  date: string | null;
  readTime: number;
  category: string | null;
  createdAt: string | null;
}

export interface Category {
  id: number;
  name: string;
  image: string | null;
  subCategories: {
    id: number;
    parentId: number;
    name: string;
    image: string | null;
  }[];
}

export interface Brand {
  id: number;
  name: string;
  /** Models under this brand (equipment + attachment). Empty if none. */
  models: { id: number; name: string }[];
}

export interface Slide {
  id: number;
  href: string | null;
  /** Desktop 21:9 image (absolute URL). */
  image: string | null;
  blurhash: string | null;
  /** Desktop blurhash decoded to a base64 PNG `data:` URI — an instant,
   *  in-HTML placeholder shown under the photo while it loads (null if none). */
  blurDataUrl: string | null;
  focalX: number;
  focalY: number;
  /** Mobile 16:9 image (absolute URL). */
  mobileImage: string | null;
  /** Mobile blurhash decoded to a base64 PNG `data:` URI (null if none). */
  mobileBlurDataUrl: string | null;
  mobileFocalX: number;
  mobileFocalY: number;
}

export interface Announcement {
  id: number;
  text: string;
}

export interface Township {
  id: number;
  name: string;
  nameMy: string | null;
}
export interface District {
  id: number;
  name: string;
  nameMy: string | null;
  townships: Township[];
}
export interface StateRegion {
  id: number;
  name: string;
  nameMy: string | null;
  districts: District[];
}

/** Business-type catalog entry (GET /business-types). */
export interface BusinessType {
  id: number;
  name: string;
}

/**
 * Current-user profile — the worker's GET /me response shape.
 * Verified against the live worker + the mobile app's ApiProfile (2026-06-06).
 * Note: there is no `created_at` field.
 */
export interface Profile {
  id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string;
  company_name: string | null;
  address: string | null;
  is_verified: number;
  business_type_id: number | null;
  business_type: string | null;
  township_id: number | null;
  township_name: string | null;
  district_name: string | null;
  state_region_name: string | null;
  partner_id: number | null;
  partner_type: string | null;
  partner_status: string | null;
}

/** Listing browse/query params accepted by /listings/sale|rent. */
export interface ConditionType {
  id: number;
  name: string;
}

export interface ListingQuery {
  limit?: number;
  offset?: number;
  type?: "equipment" | "attachment";
  category_id?: number;
  sub_category_id?: number;
  /** Single id, or comma-separated ids for multi-select (worker does `IN (…)`). */
  model_id?: number | string;
  brand_id?: number | string;
  search?: string;
  /** Comma-separated condition_type ids (sale listings only). */
  condition_id?: number | string;
  /** Price range, filtered against the column matching `currency`. */
  price_min?: string;
  price_max?: string;
  currency?: "MMK" | "USD";
  /** Location — the most specific level selected. */
  township_id?: number;
  district_id?: number;
  state_region_id?: number;
  /** Server-side sort: newest | price-asc | price-desc. */
  sort?: string;
}
