import { NextResponse } from "next/server";
import { authedFetch, BlacklistError } from "@/lib/auth/authed-fetch";
import { enforceOrigin, enforceJsonContent } from "@/lib/auth/csrf";

/** Fetch all sessions for the signed-in user. Proxies GET /chat/sessions.
 *  The worker returns a RAW ARRAY; normalize to `{ sessions: [...] }` so the
 *  client consumers (refreshSessions, the launcher's post-login sync) — which
 *  read `data.sessions` — actually receive it. Without this they silently
 *  no-op, so closes/reopens on the active session never reach the store via
 *  focus-refresh and the session list/history can't live-update. */
export async function GET() {
  try {
    const data = await authedFetch<unknown>("/chat/sessions", { method: "GET" });
    const sessions = Array.isArray(data)
      ? data
      : ((data as { sessions?: unknown[] } | null)?.sessions ?? []);
    return NextResponse.json({ sessions });
  } catch (err) {
    if (err instanceof BlacklistError) {
      return NextResponse.json({ error: "ACCOUNT_BLACKLISTED", reason: err.reason }, { status: 403 });
    }
    return NextResponse.json({ error: "Could not fetch sessions" }, { status: 502 });
  }
}

/** Create or reuse the user's active session. Proxies POST /chat/sessions. */
export async function POST(req: Request) {
  const csrf = enforceOrigin(req) ?? enforceJsonContent(req);
  if (csrf) return csrf;
  try {
    const data = await authedFetch<{ sessionId: number }>("/chat/sessions", { method: "POST", body: {} });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BlacklistError) {
      return NextResponse.json({ error: "ACCOUNT_BLACKLISTED", reason: err.reason }, { status: 403 });
    }
    return NextResponse.json({ error: "Could not start chat" }, { status: 502 });
  }
}
