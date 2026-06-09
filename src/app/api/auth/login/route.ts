import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/env";
import { setSession } from "@/lib/auth/session";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    identifier?: string;
    password?: string;
    remember?: boolean;
  };

  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: body.identifier,
      password: body.password,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error ?? "Login failed" },
      { status: res.status },
    );
  }

  if (data.access_token && data.requires_otp === false) {
    await setSession(
      data.access_token as string,
      data.refresh_token as string | undefined,
      body.remember !== false, // default: persistent
    );
    return NextResponse.json({ ok: true });
  }

  // Verified-but-stale or unverified account → OTP step. Echo the remember
  // choice so the OTP-verify step can persist the session the same way.
  return NextResponse.json({
    ok: true,
    requiresOtp: true,
    phone: data.phone,
    phoneMasked: data.phone_masked,
    requestId: data.request_id,
    remember: body.remember !== false,
  });
}
