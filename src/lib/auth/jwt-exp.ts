/**
 * Decode a JWT's `exp` (epoch seconds) WITHOUT verifying the signature.
 *
 * Used ONLY for near-expiry scheduling in the proxy/middleware — NEVER for any
 * access-control decision. A forged token can carry any `exp`, so callers MUST
 * treat the return value purely as a refresh hint: `null` (malformed/garbage)
 * means "treat as needs-refresh", never "valid". Authoritative auth stays with
 * the worker (signature verification). Uses `atob` so it runs on both the Edge
 * and Node runtimes.
 */
export function decodeJwtExp(token: string): number | null {
  try {
    const seg = token.split(".");
    if (seg.length !== 3) return null;
    let b64 = seg[1].replace(/-/g, "+").replace(/_/g, "/");
    b64 = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(b64)) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}
