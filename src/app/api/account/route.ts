import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/env";
import { getToken } from "@/lib/auth/session";

/**
 * Account profile update. Server-side proxy so the worker is never called from
 * the browser (no CORS dependency, token stays in the httpOnly cookie).
 *
 * PATCH /api/account → PATCH {API}/me with the session bearer token.
 * The /me endpoint shape is UNVERIFIED — we forward the client's changed fields
 * verbatim and pass through the worker's status/error.
 * TODO: verify against live worker.
 */
export async function PATCH(req: Request) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { error: "Sign in to update your profile" },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
    return NextResponse.json({ error: "No changes to save" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the server" },
      { status: 502 },
    );
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    return NextResponse.json(
      { error: (data.error as string) ?? "Failed to update profile" },
      { status: res.status },
    );
  }

  return NextResponse.json({ ok: true, ...data });
}
