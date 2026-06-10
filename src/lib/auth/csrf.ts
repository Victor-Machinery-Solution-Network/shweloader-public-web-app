import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/env";
// SITE_URL is already trimmed + has a prod fallback, so a missing env var can't
// collapse it to "" and 403-lock every mutation (a divergence the direct
// process.env read had).

/**
 * Fail-closed same-origin check for cookie-authed mutations (the httpOnly auth
 * cookies are attached automatically, so these endpoints are CSRF targets).
 *
 * - Origin present  → must equal NEXT_PUBLIC_SITE_URL exactly.
 * - Origin absent   → require the Fetch-Metadata signal Sec-Fetch-Site:same-origin
 *                     (sent by all current browsers). Absent Origin is NEVER a pass.
 */
export function checkOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (origin) return !!SITE_URL && origin.replace(/\/$/, "") === SITE_URL;
  return req.headers.get("sec-fetch-site") === "same-origin";
}

/** 403 if the request isn't proven same-origin; else null. */
export function enforceOrigin(req: Request): NextResponse | null {
  return checkOrigin(req)
    ? null
    : NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/** 415 unless the body is JSON — the only content type a cross-site form can't
 *  forge with credentials, so requiring it hardens cookie-authed mutations. */
export function enforceJsonContent(req: Request): NextResponse | null {
  return (req.headers.get("content-type") ?? "").startsWith("application/json")
    ? null
    : NextResponse.json({ error: "Unsupported Media Type" }, { status: 415 });
}
