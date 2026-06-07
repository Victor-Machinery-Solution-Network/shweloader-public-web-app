import "server-only";
import { cookies } from "next/headers";
import { API_BASE_URL } from "@/lib/env";

// Carries the D1 read-replication bookmark for read-your-writes on authed
// (dynamic) requests. Only touched when a Bearer token is present — public reads
// run inside `"use cache"`, where cookies() is disallowed, so we never call it there.
const BOOKMARK_COOKIE = "d1_bookmark";

/**
 * App REST API fetch client. Server-only — public reads run on the server so
 * the browser never calls the worker directly (no CORS dependency). Caching is
 * handled by the service layer via the `"use cache"` directive + cacheTag, not
 * here, to match the project's cacheComponents model.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type QueryValue = string | number | boolean | undefined | null;

export interface ApiFetchOptions {
  query?: Record<string, QueryValue>;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Bearer token for authed endpoints (dynamic — never cached). */
  token?: string | null;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function apiFetch<T>(
  path: string,
  opts: ApiFetchOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  // Read-your-writes: echo our last D1 bookmark on authed (dynamic) requests so
  // the worker serves a replica at least as fresh as our last write.
  if (opts.token) {
    try {
      const bm = (await cookies()).get(BOOKMARK_COOKIE)?.value;
      if (bm) headers["x-d1-bookmark"] = bm;
    } catch {
      /* not in a request scope — skip */
    }
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : "Network error",
      0,
    );
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status);
  }

  // Advance the bookmark cookie from authed WRITE responses. Server actions /
  // route handlers can set cookies; RSC render cannot — hence the guard. Reads
  // only send the cookie above; they don't need to advance it.
  if (opts.token && opts.method && opts.method !== "GET") {
    const newBm = res.headers.get("x-d1-bookmark");
    if (newBm) {
      try {
        (await cookies()).set(BOOKMARK_COOKIE, newBm, {
          httpOnly: true,
          sameSite: "lax",
          secure: true,
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        });
      } catch {
        /* RSC render context can't set cookies — only actions/handlers can */
      }
    }
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Returns null on 404 instead of throwing — for detail lookups. */
export async function apiFetchOrNull<T>(
  path: string,
  opts?: ApiFetchOptions,
): Promise<T | null> {
  try {
    return await apiFetch<T>(path, opts);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
