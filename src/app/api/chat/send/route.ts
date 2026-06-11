import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { authedFetch, BlacklistError } from "@/lib/auth/authed-fetch";
import { enforceOrigin, enforceJsonContent } from "@/lib/auth/csrf";
import type { ChatAttachment } from "@/components/chat/core/types";

/** Send a chat message (with optional attachments). Proxies to the worker's
 *  POST /chat/sessions/:id/messages (httpOnly token via authedFetch).
 *  The worker requires at least one of `message` or `attachments`. */
export async function POST(req: Request) {
  const csrf = enforceOrigin(req) ?? enforceJsonContent(req);
  if (csrf) return csrf;

  const body = (await req.json().catch(() => ({}))) as {
    sessionId?: number;
    text?: string;
    attachments?: ChatAttachment[];
    saleListingId?: number;
    rentListingId?: number;
  };
  const text = body.text?.trim();
  const attachments = body.attachments;
  const saleListingId = body.saleListingId;
  const rentListingId = body.rentListingId;
  const hasListing = saleListingId != null || rentListingId != null;

  if (!body.sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }
  // The worker allows a message with only a listing ref (no text/attachments).
  if (!text && !(attachments?.length) && !hasListing) {
    return NextResponse.json({ error: "Message or attachment is required" }, { status: 400 });
  }

  try {
    const data = await authedFetch<{ messageId: number }>(
      `/chat/sessions/${body.sessionId}/messages`,
      {
        method: "POST",
        body: {
          message: text || undefined,
          attachments: attachments?.length ? attachments : undefined,
          sale_listing_id: saleListingId ?? undefined,
          rent_listing_id: rentListingId ?? undefined,
        },
      },
    );
    return NextResponse.json({ ok: true, messageId: data.messageId });
  } catch (err) {
    if (err instanceof BlacklistError) {
      return NextResponse.json(
        { error: "ACCOUNT_BLACKLISTED", reason: err.reason },
        { status: 403 },
      );
    }
    if (err instanceof ApiError && err.status === 401) {
      return NextResponse.json({ error: "Sign in to chat with support" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to send message" }, { status: 502 });
  }
}
