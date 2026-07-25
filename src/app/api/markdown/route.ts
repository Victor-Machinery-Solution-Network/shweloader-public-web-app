import type { NextRequest } from "next/server";
import { NodeHtmlMarkdown } from "node-html-markdown";

/**
 * Markdown for Agents: middleware rewrites any page GET carrying
 * `Accept: text/markdown` here; we re-fetch the page's own HTML and return it
 * converted to markdown (Cloudflare's paid feature, self-hosted). Same-origin
 * only — `path` is a path, never a URL, so this can't be used as an open proxy.
 */

// ponytail: ~4 chars/token heuristic, matches how Cloudflare's header is used
const estimateTokens = (s: string) => Math.ceil(s.length / 4);

export async function GET(req: NextRequest): Promise<Response> {
  const path = req.nextUrl.searchParams.get("path") ?? "/";
  if (!path.startsWith("/") || path.startsWith("//")) {
    return new Response("Bad path", { status: 400 });
  }

  const upstream = await fetch(`${req.nextUrl.origin}${path}`, {
    headers: { Accept: "text/html", "User-Agent": req.headers.get("user-agent") ?? "" },
  });
  const contentType = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !contentType.includes("text/html")) {
    return new Response(`Upstream ${upstream.status}`, { status: upstream.status });
  }

  const html = await upstream.text();
  const markdown = NodeHtmlMarkdown.translate(html);

  return new Response(markdown + "\n", {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Markdown-Tokens": String(estimateTokens(markdown)),
      "X-Original-Tokens": String(estimateTokens(html)),
      Vary: "Accept",
    },
  });
}
