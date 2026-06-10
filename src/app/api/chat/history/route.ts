import { NextResponse } from "next/server";
import { authedFetch, BlacklistError } from "@/lib/auth/authed-fetch";

/** GET /api/chat/history?sessionId=N → worker GET /chat/sessions/:id/messages.
 *  GET (no body) → no CSRF guard needed; auth via httpOnly cookie. */
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ messages: [] });
  try {
    const messages = await authedFetch<unknown[]>(`/chat/sessions/${sessionId}/messages`, {
      method: "GET",
    });
    return NextResponse.json({ messages });
  } catch (err) {
    if (err instanceof BlacklistError) {
      return NextResponse.json({ error: "ACCOUNT_BLACKLISTED", reason: err.reason }, { status: 403 });
    }
    return NextResponse.json({ messages: [] }, { status: 200 });
  }
}
