import type {
  ChatAttachment,
  ChatMessage,
  ProductRef,
  PusherMessage,
  ServerMessage,
} from "./types";

/** Stable identity for dedup: server id if present, else the temp id. */
export const messageKey = (m: ChatMessage): string =>
  m.serverId != null ? `s${m.serverId}` : m.id;

function attachmentsFromServer(
  a: ServerMessage["attachments"],
): ChatAttachment[] {
  return (a ?? []).map((x) => ({
    fileUrl: x.file_url,
    fileName: x.file_name,
    fileSize: x.file_size,
    fileType: x.file_type,
  }));
}

export function fromServerMessage(m: ServerMessage): ChatMessage {
  const p = m.product as Record<string, unknown> | null | undefined;
  const product: ProductRef | null = p
    ? {
        productListId: p.product_list_id as number | undefined,
        productName: p.model_name as string | undefined,
        productThumbnail: (p.thumbnail_url as string | null) ?? null,
        brandName: (p.brand_name as string | null) ?? null,
        customId: (p.custom_id as string | null) ?? null,
        mmkPrice: (p.mmk_price as number | null) ?? null,
        usdPrice: (p.usd_price as number | null) ?? null,
        displayCurrency: (p.display_currency as string | null) ?? null,
        listingType: (p.listing_type as "sale" | "rent" | undefined) ?? undefined,
        saleListingId: (p.sale_listing_id as number | null) ?? null,
        rentListingId: (p.rent_listing_id as number | null) ?? null,
      }
    : null;
  return {
    id: `s${m.id}`,
    serverId: m.id,
    senderType: m.sender_type,
    senderName: m.sender_name,
    text: m.message,
    attachments: attachmentsFromServer(m.attachments),
    product,
    createdAt: m.created_at,
  };
}

export function fromPusherMessage(e: PusherMessage): ChatMessage {
  const hasProduct = e.productListId != null || e.saleListingId != null || e.rentListingId != null;
  return {
    id: `s${e.messageId}`,
    serverId: e.messageId,
    senderType: e.senderType,
    senderName: e.senderName,
    text: e.message,
    attachments: e.attachments ?? [],
    product: hasProduct
      ? {
          productListId: e.productListId,
          productName: e.productName,
          productThumbnail: e.productThumbnail ?? null,
          brandName: e.brandName ?? null,
          customId: e.customId ?? null,
          mmkPrice: e.mmkPrice ?? null,
          usdPrice: e.usdPrice ?? null,
          displayCurrency: e.displayCurrency ?? null,
          listingType: e.listingType,
          saleListingId: e.saleListingId ?? null,
          rentListingId: e.rentListingId ?? null,
        }
      : null,
    createdAt: e.createdAt,
  };
}
