import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { authedFetch, BlacklistError } from "@/lib/auth/authed-fetch";
import { enforceOrigin, enforceJsonContent } from "@/lib/auth/csrf";

/** Pusher private-channel authorizer. The browser cannot read the httpOnly
 *  token, so the client posts {socket_id, channel_name} here (JSON, via a
 *  custom authorizer) and we proxy to the worker's /chat/pusher-auth which
 *  validates session ownership and returns { auth }. */
export async function POST(req: Request) {
  const csrf = enforceOrigin(req) ?? enforceJsonContent(req);
  if (csrf) return csrf;

  const { socket_id, channel_name } = (await req.json().catch(() => ({}))) as {
    socket_id?: string;
    channel_name?: string;
  };
  if (!socket_id || !channel_name) {
    return NextResponse.json({ error: "socket_id and channel_name required" }, { status: 400 });
  }
  // Defense in depth: a web user only ever subscribes to their own chat session
  // channels (`private-chat-{id}`) or their own per-user notification channel
  // (`private-user-{id}`). Refuse anything else here — the worker also enforces
  // per-user ownership on both — so a same-origin script can't probe
  // admin/other channels through this proxy.
  if (
    !channel_name.startsWith("private-chat-") &&
    !channel_name.startsWith("private-user-")
  ) {
    return NextResponse.json({ error: "Forbidden channel" }, { status: 403 });
  }

  try {
    const data = await authedFetch<{ auth: string }>("/chat/pusher-auth", {
      method: "POST",
      body: { socket_id, channel_name },
    });
    return NextResponse.json(data); // { auth: "KEY:SIGNATURE" }
  } catch (err) {
    if (err instanceof BlacklistError) {
      return NextResponse.json({ error: "ACCOUNT_BLACKLISTED", reason: err.reason }, { status: 403 });
    }
    if (err instanceof ApiError && err.status === 401) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Pusher auth failed" }, { status: 403 });
  }
}
