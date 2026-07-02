import { type NextRequest } from "next/server";
import { ASSET_BASE_URL } from "@/lib/env";

/**
 * Same-origin download proxy for R2 assets (spec-sheet PDFs). The `download`
 * attribute is ignored by browsers on cross-origin links, so a direct link to
 * asset.shweloader.com.mm always opens in a tab; streaming it from our origin
 * with `Content-Disposition: attachment` forces a real download everywhere.
 *
 * Only URLs on ASSET_BASE_URL are allowed — this must never be an open proxy.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") ?? "";
  const name = req.nextUrl.searchParams.get("name") ?? "";

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }
  if (target.origin !== new URL(ASSET_BASE_URL).origin) {
    return new Response("Forbidden", { status: 403 });
  }

  const upstream = await fetch(target, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return new Response("Not found", { status: 404 });
  }

  // Safe ASCII filename: requested name or the R2 key's basename.
  const base = (name || target.pathname.split("/").pop() || "document")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  const filename = base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;

  return new Response(upstream.body, {
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Uploaded R2 assets are immutable (keyed uploads) — cache the proxy hop.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
