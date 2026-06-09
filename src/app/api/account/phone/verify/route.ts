import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/env";
import { getToken, refreshUserCookie } from "@/lib/auth/session";
import { enforceOrigin, enforceJsonContent } from "@/lib/auth/csrf";

/**
 * Complete a phone-number change. Server-side proxy to the worker's OTP verify
 * step, which updates the phone on success.
 * POST /api/account/phone/verify → POST {API}/me/verify-phone (authed).
 * Direct fetch (not authedFetch): the worker returns 401 for a wrong/expired
 * OTP, which a refresh-on-401 wrapper would mislabel as a session problem.
 */
export async function POST(req: Request) {
  const csrf = enforceOrigin(req) ?? enforceJsonContent(req);
  if (csrf) return csrf;

  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { error: "Sign in to change your phone number" },
      { status: 401 },
    );
  }

  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  if (!b.phone?.trim() || !b.code?.trim()) {
    return NextResponse.json(
      { error: "Phone and code are required" },
      { status: 400 },
    );
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/me/verify-phone`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        phone: b.phone.trim(),
        code: b.code.trim(),
        request_id: b.requestId ?? b.request_id,
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the server" },
      { status: 502 },
    );
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return NextResponse.json(
      { error: (data.error as string) ?? "Invalid or expired code" },
      { status: res.status },
    );
  }

  // Phone changed — refresh the header display cookie.
  await refreshUserCookie(token);

  return NextResponse.json({ ok: true });
}
