import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/env";

/**
 * Fail-closed same-origin check for cookie-authed mutations (the httpOnly auth
 * cookies are attached automatically, so these endpoints are CSRF targets).
 *
 * Environment-agnostic. A request is same-origin when the browser-set Origin's
 * host matches the host the request actually arrived on — which holds on prod,
 * staging, per-branch preview URLs, and localhost with NO per-environment
 * config. It stays CSRF-safe because a cross-site request carries the
 * attacker's Origin but OUR host (the browser controls neither Host nor
 * x-forwarded-host), so the two can never match. The configured SITE_URL is
 * also accepted as a fast-path (covers any proxy that rewrites the host).
 *
 * Previously this compared Origin to SITE_URL *only*; since SITE_URL falls back
 * to the prod URL, every authed mutation 403'd on staging/preview (their origin
 * never equalled the prod URL) — which broke logout, profile save, chat, etc.
 *
 * - Origin present → must match our request host (or equal SITE_URL).
 * - Origin absent  → require the Fetch-Metadata signal Sec-Fetch-Site:same-origin
 *                    (sent by all current browsers). Absent Origin is NEVER a pass.
 */
export function checkOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") === "same-origin";

  // Fast-path: the configured canonical origin (e.g. localhost in dev).
  if (SITE_URL && origin.replace(/\/$/, "") === SITE_URL) return true;

  // True same-origin: the Origin's host equals the host the request hit. On
  // Vercel the public host is in x-forwarded-host (host may be the internal
  // runtime host), so accept a match against either.
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const host = req.headers.get("host");
  const fwdHost = req.headers.get("x-forwarded-host");
  return originHost === fwdHost || originHost === host;
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
