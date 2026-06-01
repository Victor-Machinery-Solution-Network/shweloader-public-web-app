import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/env";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, string>;

  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: b.username,
      full_name: b.full_name ?? b.fullName,
      email: b.email || undefined,
      password: b.password,
      phone: b.phone,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error ?? "Registration failed", reason: data.reason },
      { status: res.status },
    );
  }

  // Account created — trigger the OTP that verify-otp will consume.
  await fetch(`${API_BASE_URL}/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: b.phone }),
  }).catch(() => {});

  return NextResponse.json({ ok: true, requiresOtp: true, phone: b.phone });
}
