import "server-only";
import { cookies } from "next/headers";
import { API_BASE_URL } from "@/lib/env";

/**
 * Server-side auth session. Tokens are proxied from the worker and stored in
 * httpOnly cookies (never exposed to JS). A readable `sl_user` cookie holds
 * non-sensitive display fields for the UI (see use-auth.tsx).
 */
const TOKEN = "sl_token";
const REFRESH = "sl_refresh";
const USER = "sl_user";
// "1" = Remember me (persistent cookies); "0" = session-only (cleared when the
// browser closes). Read server-side so re-issued cookies (and a future silent
// refresh) keep the persistence the user chose at login.
const REMEMBER = "sl_remember";
const isProd = process.env.NODE_ENV === "production";

const ACCESS_MAXAGE = 60 * 60 * 24 * 7; // 7d
const REFRESH_MAXAGE = 60 * 60 * 24 * 30; // 30d

const httpOnlyBase = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
};

export async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(TOKEN)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH)?.value ?? null;
}

/**
 * Best-effort: (re)hydrate the display-only `sl_user` cookie from /me. Called
 * after login/OTP verify and again after profile or phone edits so the header
 * chip (name/email/phone/company) stays in sync. Non-critical — silently
 * no-ops if /me is unreachable.
 */
export async function refreshUserCookie(accessToken: string): Promise<void> {
  const store = await cookies();
  // Mirror the login-time persistence choice: a session-only login keeps
  // sl_user as a session cookie too, so the UI's "signed in" view can't outlive
  // the session.
  const remember = store.get(REMEMBER)?.value !== "0";
  try {
    const res = await fetch(`${API_BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return;
    const u = (await res.json()) as Record<string, unknown>;
    const display = {
      id: u.app_user_id ?? u.id,
      fullName: u.full_name ?? u.fullName,
      username: u.username,
      email: u.email,
      phone: u.phone,
      company: u.company_name ?? u.company,
      // Worker returns partner_status ('Approved'|'Pending'|...) — not a boolean.
      partner: u.partner_status === "Approved",
      businessType: u.business_type,
    };
    // Lifetime tracks the session: persistent (7d) when "Remember me" is on,
    // otherwise a session cookie. Either way it never outlives the sl_token gate.
    store.set(USER, JSON.stringify(display), {
      secure: isProd,
      sameSite: "lax",
      path: "/",
      ...(remember ? { maxAge: ACCESS_MAXAGE } : {}),
    });
  } catch {
    /* profile hydration is non-critical */
  }
}

/** Persist tokens + best-effort user profile after login/OTP verify. */
export async function setSession(
  accessToken: string,
  refreshToken?: string,
  remember = true,
): Promise<void> {
  const store = await cookies();
  // Remember me → persistent cookies (survive browser restart). Unchecked →
  // session cookies (no maxAge), dropped when the browser closes, so a shared/
  // public device doesn't stay signed in.
  store.set(TOKEN, accessToken, remember ? { ...httpOnlyBase, maxAge: ACCESS_MAXAGE } : { ...httpOnlyBase });
  if (refreshToken) {
    store.set(REFRESH, refreshToken, remember ? { ...httpOnlyBase, maxAge: REFRESH_MAXAGE } : { ...httpOnlyBase });
  }
  // Persistence marker, read by refreshUserCookie + (later) the silent refresh.
  store.set(REMEMBER, remember ? "1" : "0", remember ? { ...httpOnlyBase, maxAge: REFRESH_MAXAGE } : { ...httpOnlyBase });

  await refreshUserCookie(accessToken);
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  for (const key of [TOKEN, REFRESH, USER, REMEMBER]) store.delete(key);
}
