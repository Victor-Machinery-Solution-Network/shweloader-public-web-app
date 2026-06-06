import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/env";
import { getToken } from "@/lib/auth/session";

/**
 * Start a phone-number change. Server-side proxy to the worker's OTP send step.
 * POST /api/account/phone/send-otp → POST {API}/me/send-phone-otp (authed).
 * Returns the request id + masked phone for the verify step.
 */
export async function POST(req: Request) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { error: "Sign in to change your phone number" },
      { status: 401 },
    );
  }

  const b = (await req.json().catch(() => ({}))) as { phone?: string };
  if (!b.phone?.trim()) {
    return NextResponse.json({ error: "Enter a phone number" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/me/send-phone-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ phone: b.phone.trim() }),
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
      { error: (data.error as string) ?? "Could not send the code" },
      { status: res.status },
    );
  }

  return NextResponse.json({
    ok: true,
    requestId: data.request_id ?? null,
    phoneMasked: data.phone_masked ?? null,
  });
}
