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
const isProd = process.env.NODE_ENV === "production";

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

/** Persist tokens + best-effort user profile after login/OTP verify. */
export async function setSession(
  accessToken: string,
  refreshToken?: string,
): Promise<void> {
  const store = await cookies();
  store.set(TOKEN, accessToken, { ...httpOnlyBase, maxAge: 60 * 60 * 24 * 7 });
  if (refreshToken) {
    store.set(REFRESH, refreshToken, {
      ...httpOnlyBase,
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  // Best-effort: hydrate a display-only user cookie from /me.
  try {
    const res = await fetch(`${API_BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.ok) {
      const u = (await res.json()) as Record<string, unknown>;
      const display = {
        id: u.app_user_id ?? u.id,
        fullName: u.full_name ?? u.fullName,
        username: u.username,
        email: u.email,
        phone: u.phone,
        company: u.company_name ?? u.company,
        partner: !!(u.is_approved_partner ?? u.partner),
        memberSince: u.created_at,
      };
      store.set(USER, JSON.stringify(display), {
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
  } catch {
    /* profile hydration is non-critical */
  }
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  for (const key of [TOKEN, REFRESH, USER]) store.delete(key);
}
