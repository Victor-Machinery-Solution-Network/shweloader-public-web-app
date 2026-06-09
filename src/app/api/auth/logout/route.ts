import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";
import { enforceOrigin, enforceJsonContent } from "@/lib/auth/csrf";

export async function POST(req: Request) {
  const csrf = enforceOrigin(req) ?? enforceJsonContent(req);
  if (csrf) return csrf;
  await clearSession();
  return NextResponse.json({ ok: true });
}
