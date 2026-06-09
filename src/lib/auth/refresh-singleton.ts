import "server-only";

/**
 * Outcome of a refresh attempt. Blacklist is a *value*, never a thrown error —
 * so the single-flight wrapper's catch can't swallow it (the v1 bug).
 */
export type RefreshResult =
  | { ok: true; token: string }
  | { ok: false; blacklisted: true; reason?: string }
  | { ok: false; blacklisted: false };

// Best-effort, per-instance dedup of concurrent refreshes of the same token
// (e.g. an RSC fan-out that 401s on several parallel fetches). Not cross-instance;
// correctness relies on the worker's refresh being idempotent (no rotation).
const inflight = new Map<string, Promise<RefreshResult>>();

async function hashToken(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Run `doWork` at most once per (hashed) token across concurrent callers. The
 *  map is keyed on a SHA-256 hash, never the raw token, and the entry is always
 *  removed in `finally`. An unexpected throw resolves to a non-blacklist failure
 *  (so a transient error never masquerades as — or hides — a blacklist). */
export async function singleFlightRefresh(
  rawRefreshToken: string,
  doWork: () => Promise<RefreshResult>,
): Promise<RefreshResult> {
  const key = await hashToken(rawRefreshToken);
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = (async (): Promise<RefreshResult> => {
    try {
      return await doWork();
    } catch {
      return { ok: false, blacklisted: false };
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}
