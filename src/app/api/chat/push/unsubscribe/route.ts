import { NextResponse } from "next/server";
import { authedFetch, BlacklistError } from "@/lib/auth/authed-fetch";
import { enforceOrigin, enforceJsonContent } from "@/lib/auth/csrf";

/**
 * POST /api/chat/push/unsubscribe
 *
 * Receives a PushSubscription JSON object from the client and forwards it to
 * the worker's POST /chat/push/unsubscribe endpoint so it can remove the
 * subscription and stop sending push notifications to this device.
 *
 * CSRF-guarded: same-origin + JSON content-type.
 * Best-effort: on worker error we return { ok: false } with HTTP 200 so the
 * client's disable() flow doesn't throw and the UI remains functional.
 */
export async function POST(req: Request) {
  const csrf = enforceOrigin(req) ?? enforceJsonContent(req);
  if (csrf) return csrf;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    await authedFetch("/chat/push/unsubscribe", {
      method: "POST",
      body: body as Record<string, unknown>,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BlacklistError) {
      return NextResponse.json(
        { error: "ACCOUNT_BLACKLISTED", reason: err.reason },
        { status: 403 },
      );
    }
    // Worker error (5xx, network, etc.) — best-effort, don't hard-fail the client.
    return NextResponse.json({ ok: false });
  }
}
