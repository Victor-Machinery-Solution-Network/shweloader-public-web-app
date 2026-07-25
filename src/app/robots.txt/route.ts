import { SITE_URL } from "@/lib/env";

// Route handler instead of the metadata `robots.ts` convention because we emit
// Content-Signal directives (contentsignals.org), which MetadataRoute.Robots
// cannot express. Output is otherwise identical to the old robots.ts.

// Public, non-authed areas only. Authed/app + API routes stay disallowed.
const DISALLOW = ["/account", "/saved", "/chat", "/notifications", "/api/"];

// AI assistant + AI-search crawlers we explicitly welcome so ShweLoader can be
// indexed, summarised, and *cited* across AI platforms (the same public content
// search engines already see). Listed explicitly so none is accidentally
// treated as blocked, and so answer/training crawlers (Google-Extended,
// Applebot-Extended) are clearly opted in.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "Meta-ExternalAgent",
  "cohere-ai",
  "CCBot",
];

// Matches the crawler opt-in above: public content may be searched, used as
// AI input (answers/citations), and trained on.
const CONTENT_SIGNAL = "Content-Signal: search=yes, ai-input=yes, ai-train=yes";

function group(userAgents: string[]): string {
  return [
    ...userAgents.map((ua) => `User-Agent: ${ua}`),
    CONTENT_SIGNAL,
    "Allow: /",
    ...DISALLOW.map((path) => `Disallow: ${path}`),
  ].join("\n");
}

export function GET(): Response {
  const body = [
    group(AI_CRAWLERS),
    group(["*"]),
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    `Host: ${SITE_URL}`,
  ].join("\n\n");

  return new Response(body + "\n", {
    headers: { "Content-Type": "text/plain" },
  });
}
