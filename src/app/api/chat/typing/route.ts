import { NextResponse } from "next/server";
import { authedFetch, BlacklistError } from "@/lib/auth/authed-fetch";
import { enforceOrigin, enforceJsonContent } from "@/lib/auth/csrf";

/** Broadcast "user is typing". Proxies POST /chat/sessions/:id/typing.
 *  Best-effort — failures are swallowed (no UI impact). */
export async function POST(req: Request) {
  const csrf = enforceOrigin(req) ?? enforceJsonContent(req);
  if (csrf) return csrf;
  const { sessionId } = (await req.json().catch(() => ({}))) as { sessionId?: number };
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  try {
    await authedFetch(`/chat/sessions/${sessionId}/typing`, { method: "POST", body: {} });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BlacklistError) {
      return NextResponse.json({ error: "ACCOUNT_BLACKLISTED", reason: err.reason }, { status: 403 });
    }
    return NextResponse.json({ ok: false }, { status: 200 }); // best-effort
  }
}
