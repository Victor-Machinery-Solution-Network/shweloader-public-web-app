import { NextResponse } from "next/server";
import { authedFetch, BlacklistError } from "@/lib/auth/authed-fetch";
import { enforceOrigin, enforceJsonContent } from "@/lib/auth/csrf";

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
