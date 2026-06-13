import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { authedFetch, BlacklistError } from "@/lib/auth/authed-fetch";
import { enforceOrigin } from "@/lib/auth/csrf";

/**
 * POST/DELETE /api/saved-items/:id — save / unsave a product for the signed-in
 * user. Server-side proxy to the worker (token stays httpOnly). Cookie-authed
 * mutations, so fail-closed same-origin CSRF guard. The worker's POST is
 * INSERT OR IGNORE (idempotent); DELETE always succeeds.
 */
async function proxy(req: Request, idParam: string, method: "POST" | "DELETE") {
  const csrf = enforceOrigin(req);
  if (csrf) return csrf;

  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await authedFetch(`/saved-items/${id}`, { method });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BlacklistError) {
      return NextResponse.json(
        { error: "ACCOUNT_BLACKLISTED", reason: err.reason },
        { status: 403 },
      );
    }
    const status = err instanceof ApiError && err.status === 401 ? 401 : 502;
    return NextResponse.json({ error: "Could not update saved items" }, { status });
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return proxy(req, id, "POST");
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return proxy(req, id, "DELETE");
}
