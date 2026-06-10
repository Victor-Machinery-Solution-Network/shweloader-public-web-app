import "server-only";
import { API_BASE_URL } from "@/lib/env";
import { apiFetch, ApiError, type ApiFetchOptions } from "@/lib/api/client";
import {
  getToken,
  getRefreshToken,
  getRememberFlag,
  setSession,
  clearSession,
} from "@/lib/auth/session";
import {
  singleFlightRefresh,
  type RefreshResult,
} from "@/lib/auth/refresh-singleton";

/** Thrown when the worker reports the account is blacklisted (403). Route
 *  handlers map this to a 403 response + the client suspension overlay. */
export class BlacklistError extends Error {
  reason?: string;
  constructor(reason?: string) {
    super("ACCOUNT_BLACKLISTED");
    this.name = "BlacklistError";
    this.reason = reason;
  }
}

const isBlacklist = (err: unknown): boolean =>
  err instanceof ApiError &&
  err.status === 403 &&
  err.message === "ACCOUNT_BLACKLISTED";

/**
 * Authed worker fetch for ROUTE HANDLERS (a cookie-writable context — never call
 * from RSC render). On a 401 it silently refreshes the access token via
 * single-flight and retries once; on 403 ACCOUNT_BLACKLISTED (before or after
 * refresh) it clears the session and throws BlacklistError. `d1_bookmark`
 * read-your-writes is preserved by the underlying apiFetch.
 */
export async function authedFetch<T>(
  path: string,
  opts: ApiFetchOptions = {},
): Promise<T> {
  const token = await getToken();
  if (!token) throw new ApiError("Unauthenticated", 401);

  try {
    return await apiFetch<T>(path, { ...opts, token });
  } catch (err) {
    if (isBlacklist(err)) {
      await clearSession();
      throw new BlacklistError((err as ApiError).reason);
    }
    if (!(err instanceof ApiError) || err.status !== 401) throw err;
    // else: fall through to refresh + retry
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new ApiError("Unauthenticated", 401);

  const result = await singleFlightRefresh(refreshToken, () =>
    doRefresh(refreshToken),
  );

  if (!result.ok) {
    await clearSession();
    if (result.blacklisted) throw new BlacklistError(result.reason);
    throw new ApiError("Session expired", 401);
  }

  // Persist the new access token, keeping the user's Remember-me persistence,
  // and re-pin sl_user so the display cookie can't outlive the session.
  await setSession(result.token, undefined, await getRememberFlag());
  try {
    return await apiFetch<T>(path, { ...opts, token: result.token });
  } catch (retryErr) {
    // Account may have been blacklisted between refresh and retry.
    if (isBlacklist(retryErr)) {
      await clearSession();
      throw new BlacklistError((retryErr as ApiError).reason);
    }
    throw retryErr;
  }
}

async function doRefresh(refreshToken: string): Promise<RefreshResult> {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (res.ok) {
    const d = (await res.json().catch(() => ({}))) as { access_token?: string };
    return d.access_token
      ? { ok: true, token: d.access_token }
      : { ok: false, blacklisted: false };
  }
  if (res.status === 403) {
    const d = (await res.json().catch(() => ({}))) as {
      error?: string;
      reason?: string;
    };
    if (d.error === "ACCOUNT_BLACKLISTED")
      return { ok: false, blacklisted: true, reason: d.reason };
  }
  return { ok: false, blacklisted: false };
}
