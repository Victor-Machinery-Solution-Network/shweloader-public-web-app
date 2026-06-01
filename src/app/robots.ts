import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_CRAWLERS, allow: "/", disallow: DISALLOW },
      { userAgent: "*", allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
