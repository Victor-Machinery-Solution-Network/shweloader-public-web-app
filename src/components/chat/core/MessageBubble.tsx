"use client";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/language-provider";
import { assetUrl } from "@/lib/assets";
import { formatMoney } from "@/lib/format";
import { listingSlug } from "@/lib/slug";
import { Lightbox } from "./Lightbox";
import { SeenTick } from "./SeenTick";
import type { ChatMessage, ChatAttachment, ProductRef } from "./types";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Renders the image grid (1/2/3-4/4+ with +N overlay). */
function ImageGrid({
  images,
  onOpen,
}: {
  images: ChatAttachment[];
  onOpen: (index: number) => void;
}) {
  const displayed = images.slice(0, 4);
  const extra = images.length > 4 ? images.length - 4 : 0;
  const count = displayed.length;

  return (
    <div
      className={cn(
        "chat-att-grid",
        count === 1 && "chat-att-grid-1",
        count === 2 && "chat-att-grid-2",
        count === 3 && "chat-att-grid-3",
        count >= 4 && "chat-att-grid-4",
      )}
    >
      {displayed.map((att, i) => {
        const src = assetUrl(att.fileUrl);
        const isLast = i === 3 && extra > 0;
        return (
          <button
            key={att.fileUrl}
            type="button"
            className={cn("chat-att-tile", isLast && "chat-att-tile-overflow")}
            aria-label={isLast ? `View all ${images.length} images` : `View image ${i + 1}`}
            onClick={() => onOpen(i)}
          >
            {src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={att.fileName} className="chat-att-img" />
            )}
            {isLast && (
              <span className="chat-att-more" aria-hidden="true">
                +{extra}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Compact product-reference card rendered above the text bubble. Links to the
 *  listing when an id is present — the product page resolves /product/<…id> via
 *  parseIdFromSlug and 301s to the canonical slug (mobile parity). */
function ProductCard({ product }: { product: ProductRef }) {
  const thumbSrc = assetUrl(product.productThumbnail ?? null);
  const price = formatMoney(product.mmkPrice, product.usdPrice, product.displayCurrency);

  const subParts: string[] = [];
  if (product.brandName) subParts.push(product.brandName);
  if (product.customId) subParts.push(product.customId);
  const sub = subParts.join(" · ");

  // Link by the canonical slug (`{brand-model}-{id}`) — the exact URL the product
  // page prerenders — NOT a bare `/product/<id>`, which only resolves via an
  // on-demand redirect. productName/brandName come from the same worker source the
  // page uses to build its slug, so this reproduces the canonical URL (→ a
  // prerendered 200, no redirect). No link if the product_list id is absent.
  const href =
    product.productListId != null
      ? `/product/${listingSlug({
          id: product.productListId,
          title: product.productName,
          brand: product.brandName,
        })}`
      : null;

  const inner = (
    <>
      {thumbSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbSrc}
          alt={product.productName ?? "Product"}
          className="chat-product-thumb"
        />
      ) : (
        <span className="chat-product-thumb-placeholder" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </span>
      )}
      <div className="chat-product-body">
        {product.productName && (
          <span className="chat-product-name">{product.productName}</span>
        )}
        {sub && <span className="chat-product-sub">{sub}</span>}
        {price && <span className="chat-product-price">{price}</span>}
      </div>
    </>
  );

  return href != null ? (
    <Link href={href} className="chat-product-card" aria-label={`View ${product.productName ?? "product"}`}>
      {inner}
    </Link>
  ) : (
    <div className="chat-product-card">{inner}</div>
  );
}

/** Renders a single PDF/non-image file chip. */
function FileChip({ att }: { att: ChatAttachment }) {
  const href = assetUrl(att.fileUrl);
  return (
    <a
      href={href ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="chat-att-file"
      aria-label={`Download ${att.fileName}`}
    >
      <span className="chat-att-file-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      </span>
      <span className="chat-att-file-meta">
        <span className="chat-att-file-name">{att.fileName}</span>
        <span className="chat-att-file-size">{humanSize(att.fileSize)}</span>
      </span>
    </a>
  );
}

export function MessageBubble({
  message,
  isLastOutgoing,
  adminReadAt,
  groupedWithPrev = false,
  groupedWithNext = false,
}: {
  message: ChatMessage;
  isLastOutgoing: boolean;
  adminReadAt: string | null;
  groupedWithPrev?: boolean;
  groupedWithNext?: boolean;
}) {
  const mine = message.senderType === "user";
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { t } = useI18n();

  // Deleted by an admin. The bubble keeps its place in the thread and shows
  // nothing it used to carry — the worker already stripped the payload, so
  // this branch is only the styled treatment. A build that predates it falls
  // back to the worker's plain-text tombstone in the normal bubble, which
  // reads correctly, just without the icon.
  const isDeleted = !!message.deletedAt;

  const attachments = message.attachments ?? [];
  const imageAtts = attachments.filter((a) => a.fileType.startsWith("image/"));
  const fileAtts = attachments.filter((a) => !a.fileType.startsWith("image/"));

  // Full list of resolved image URLs for the lightbox.
  const imageUrls = imageAtts
    .map((a) => assetUrl(a.fileUrl))
    .filter((u): u is string => u != null);

  return (
    <div
      className={cn(
        "chat-msg",
        mine ? "is-me" : "is-agent",
        groupedWithPrev && "grp-prev",
        groupedWithNext && "grp-next",
      )}
    >
      {isDeleted ? (
        <div className="chat-bubble is-deleted">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
          <span>{t("chat.deleted")}</span>
        </div>
      ) : (
        <>
      {/* Product reference card — rendered above the text bubble */}
      {message.product && <ProductCard product={message.product} />}

      {message.text && <div className="chat-bubble">{message.text}</div>}

      {/* Image grid */}
      {imageAtts.length > 0 && (
        <ImageGrid
          images={imageAtts}
          onOpen={(i) => setLightboxIndex(i)}
        />
      )}

      {/* File chips */}
      {fileAtts.length > 0 && (
        <div className="chat-att-files">
          {fileAtts.map((att) => (
            <FileChip key={att.fileUrl} att={att} />
          ))}
        </div>
      )}
        </>
      )}

      {/* Show the time/Seen meta only on the last message of a group (or a
          standalone message) — grouped messages share one timestamp below. */}
      {!groupedWithNext && (
        <div className="chat-msg-meta">
          {message.edited && !isDeleted && (
            <span className="chat-msg-edited">{t("chat.edited")}</span>
          )}
          <span className="chat-msg-time">{fmtTime(message.createdAt)}</span>
          {mine && isLastOutgoing && <SeenTick message={message} adminReadAt={adminReadAt} />}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex != null && imageUrls.length > 0 && (
        <Lightbox
          images={imageUrls}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(next) => setLightboxIndex(next)}
        />
      )}
    </div>
  );
}
