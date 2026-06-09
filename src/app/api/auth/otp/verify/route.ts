import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/env";
import { setSession } from "@/lib/auth/session";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, string>;

  const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: b.phone,
      code: b.code,
      request_id: b.requestId ?? b.request_id,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok || !data.access_token) {
    return NextResponse.json(
      { error: data.error ?? "Invalid or expired code" },
      { status: res.ok ? 401 : res.status },
    );
  }

  await setSession(
    data.access_token as string,
    data.refresh_token as string | undefined,
    b.remember !== "false", // string body; only signin-with-OTP sends "false"
  );
  return NextResponse.json({ ok: true });
}
