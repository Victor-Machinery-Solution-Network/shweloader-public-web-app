import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/env";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { phone?: string };

  const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: b.phone }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error ?? "Failed to resend code" },
      { status: res.status },
    );
  }
  return NextResponse.json({ ok: true, requestId: data.request_id });
}
