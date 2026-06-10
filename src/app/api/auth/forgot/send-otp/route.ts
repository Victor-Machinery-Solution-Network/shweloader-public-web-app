import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/env";

/**
 * Forgot-password step 1: send a reset OTP to a registered phone.
 * POST /api/auth/forgot/send-otp → POST {API}/auth/forgot-password/send-otp.
 * Pre-auth proxy (no session cookie involved), like login/register.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { phone?: string };
  if (!b.phone?.trim()) {
    return NextResponse.json({ error: "Enter your phone number" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/forgot-password/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  return NextResponse.json({ ok: true, requestId: data.request_id ?? null });
}
