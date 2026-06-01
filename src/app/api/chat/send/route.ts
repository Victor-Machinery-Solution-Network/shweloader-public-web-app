import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/client";
import { getToken } from "@/lib/auth/session";

/**
 * Support-chat message send. Server-side proxy so the worker is never called
 * from the browser (the bearer token lives in an httpOnly cookie and is read
 * here, never exposed to the client).
 *
 * Best-effort: the live chat endpoint shape is UNVERIFIED. We POST the message
 * to `/chat/messages` with the session token and surface a friendly error on
 * failure so the UI can fall back to an optimistic local echo.
 *
 * TODO: verify against live worker — endpoint path, request body field names
 * (`sessionId` / `session_id`, `text` / `message`, attachments), and the shape
 * of the returned message object.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    sessionId?: string;
    text?: string;
  };

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { error: "Sign in to chat with support" },
      { status: 401 },
    );
  }

  try {
    // TODO: verify against live worker — path + body shape are best-effort.
    const data = await apiFetch<unknown>("/chat/messages", {
      method: "POST",
      token,
      body: { sessionId: body.sessionId, text },
    });
    return NextResponse.json({ ok: true, message: data ?? null });
  } catch {
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 502 },
    );
  }
}
