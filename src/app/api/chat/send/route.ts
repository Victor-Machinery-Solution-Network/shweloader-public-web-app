import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { authedFetch, BlacklistError } from "@/lib/auth/authed-fetch";
import { enforceOrigin, enforceJsonContent } from "@/lib/auth/csrf";

/**
 * Support-chat message send. Server-side proxy so the worker is never called
 * from the browser (the bearer token lives in an httpOnly cookie). Uses
 * authedFetch for silent 401→refresh and 403 ACCOUNT_BLACKLISTED handling.
 *
 * TODO: verify against live worker — endpoint path + body field names
 * (`sessionId`/`session_id`, `text`/`message`, attachments) are best-effort.
 */
export async function POST(req: Request) {
  const csrf = enforceOrigin(req) ?? enforceJsonContent(req);
  if (csrf) return csrf;

  const body = (await req.json().catch(() => ({}))) as {
    sessionId?: string;
    text?: string;
  };

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  try {
    const data = await authedFetch<unknown>("/chat/messages", {
      method: "POST",
      body: { sessionId: body.sessionId, text },
    });
    return NextResponse.json({ ok: true, message: data ?? null });
  } catch (err) {
    if (err instanceof BlacklistError) {
      return NextResponse.json(
        { error: "ACCOUNT_BLACKLISTED", reason: err.reason },
        { status: 403 },
      );
    }
    if (err instanceof ApiError && err.status === 401) {
      return NextResponse.json(
        { error: "Sign in to chat with support" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 502 },
    );
  }
}
