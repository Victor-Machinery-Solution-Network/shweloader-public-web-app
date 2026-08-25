// Client-side chat types. The worker is the source of truth for field names;
// see the design spec §2 for the verified REST + Pusher payload shapes.

export type SenderType = "user" | "admin" | "system";
export type SendStatus = "sending" | "sent" | "failed";
export type SessionStatus = "pending" | "active" | "resolved";

export interface ChatAttachment {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

/** Product card embedded in a message (admin shares a listing). Phase 2 renders
 *  it richly; Phase 1 stores it so dedup/state are forward-compatible. */
export interface ProductRef {
  productListId?: number;
  productName?: string;
  productThumbnail?: string | null;
  brandName?: string | null;
  customId?: string | null;
  mmkPrice?: number | null;
  usdPrice?: number | null;
  displayCurrency?: string | null;
  listingType?: "sale" | "rent";
  saleListingId?: number | null;
  rentListingId?: number | null;
}

export interface ChatMessage {
  /** Server id once persisted; a `temp-<n>` id while optimistic. */
  id: string;
  /** Numeric server id when known (used for dedup + read-receipt compare). */
  serverId: number | null;
  senderType: SenderType;
  senderName: string | null;
  text: string | null;
  attachments: ChatAttachment[];
  product: ProductRef | null;
  createdAt: string; // ISO
  /** An admin corrected the text after sending — renders the "Edited" marker. */
  edited?: boolean;
  /** An admin deleted the message. The worker has already swapped `text` for
   *  the tombstone and stripped attachments/product; this flag is what lets a
   *  client that knows about it draw the styled version instead. */
  deletedAt?: string | null;
  /** Only set on optimistic outgoing messages. */
  status?: SendStatus;
}

export interface ChatSession {
  id: number;
  status: SessionStatus;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadUserCount: number;
  adminLastReadAt: string | null;
}

/** Worker REST row from GET /chat/sessions/:id/messages */
export interface ServerMessage {
  id: number;
  sender_type: SenderType;
  sender_name: string | null;
  message: string | null;
  created_at: string;
  attachments?: Array<{ file_url: string; file_name: string; file_size: number; file_type: string }>;
  product?: Record<string, unknown> | null;
  edited?: boolean;
  deleted_at?: string | null;
}

/** Worker Pusher `new-message` event on private-chat-{sessionId} */
export interface PusherMessage {
  messageId: number;
  senderType: SenderType;
  senderName: string;
  message: string | null;
  attachments?: ChatAttachment[];
  createdAt: string;
  productListId?: number;
  productName?: string;
  productThumbnail?: string | null;
  brandName?: string | null;
  customId?: string | null;
  mmkPrice?: number | null;
  usdPrice?: number | null;
  displayCurrency?: string | null;
  listingType?: "sale" | "rent";
  saleListingId?: number | null;
  rentListingId?: number | null;
}
