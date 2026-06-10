import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/env";

/**
 * Forgot-password step 2: verify the OTP and set a new password.
 * POST /api/auth/forgot/reset → POST {API}/auth/reset-password.
 * Does not log the user in — they return to sign-in with the new password.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as {
    phone?: string;
    code?: string;
    password?: string;
    requestId?: string;
  };
  if (!b.phone?.trim() || !b.code?.trim() || !b.password) {
    return NextResponse.json(
      { error: "Phone, code, and new password are required" },
      { status: 400 },
    );
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: b.phone.trim(),
        code: b.code.trim(),
        new_password: b.password,
        request_id: b.requestId,
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
      { error: (data.error as string) ?? "Could not reset your password" },
      { status: res.status },
    );
  }

  return NextResponse.json({ ok: true });
}
