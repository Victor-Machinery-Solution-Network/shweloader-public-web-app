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

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));

const first = (html: string, re: RegExp) => {
  const m = html.match(re);
  return m ? decodeEntities(m[1].trim()) : null;
};

// Fact-dense JSON-LD types only; nav-ish schemas (BreadcrumbList, WebSite,
// ItemList…) duplicate links already present in the converted content.
const FACT_TYPES = new Set(["Product", "BlogPosting", "Organization", "AboutPage"]);
const BULKY_KEYS = new Set(["@context", "image", "logo"]);

function structuredFacts(html: string): string | null {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const facts: unknown[] = [];
  for (const [, json] of blocks) {
    try {
      const data = JSON.parse(json) as Record<string, unknown> | Record<string, unknown>[];
      for (const item of Array.isArray(data) ? data : [data]) {
        if (!FACT_TYPES.has(String(item["@type"]))) continue;
        facts.push(
          JSON.parse(JSON.stringify(item, (k, v) => (BULKY_KEYS.has(k) ? undefined : v))),
        );
      }
    } catch {
      // malformed block — skip
    }
  }
  if (!facts.length) return null;
  return `## Structured data (schema.org)\n\n\`\`\`json\n${JSON.stringify(facts.length === 1 ? facts[0] : facts, null, 1)}\n\`\`\``;
}

export async function GET(req: NextRequest): Promise<Response> {
  const path =
    req.headers.get("x-md-path") ?? new URL(req.url).searchParams.get("path") ?? "/";
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

  // Signal over chrome: convert only <main> (nav/footer/toggles are noise that
  // burns agent context), and lead with the page's own metadata so an agent
  // knows what it is reading without guessing.
  const title = first(html, /<title[^>]*>([^<]*)<\/title>/i);
  const description = first(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
  const canonical = first(html, /<link\s+rel="canonical"\s+href="([^"]*)"/i);
  const main = first(html, /<main[\s\S]*?>([\s\S]*)<\/main>/i);

  const header = [
    title && `# ${title}`,
    description && `> ${description}`,
    canonical && `Canonical URL: ${canonical}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  // Alt-less images (gallery thumbs, carousel dupes) carry zero signal for an
  // LLM — strip them; labeled images keep their alt text as context.
  const body = NodeHtmlMarkdown.translate(main ?? html)
    .replace(/!\[\]\([^)]*\)/g, "")
    .replace(/\n{3,}/g, "\n\n");
  const facts = structuredFacts(html);
  const markdown = [header, body, facts].filter(Boolean).join("\n\n---\n\n");

  return new Response(markdown + "\n", {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Markdown-Tokens": String(estimateTokens(markdown)),
      "X-Original-Tokens": String(estimateTokens(html)),
      Vary: "Accept",
    },
  });
}
