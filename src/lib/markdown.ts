import DOMPurify from "isomorphic-dompurify";

import { markdownToHtml } from "@/components/blogs/markdown";

/**
 * Markdown → sanitized HTML for admin-authored content (blog bodies AND product
 * descriptions). Server-only by design: the dependency-free `markdownToHtml`
 * renderer + isomorphic-dompurify run here, so no markdown/sanitizer code ships
 * in the client bundle (the rendered HTML string is passed to client components).
 *
 * `"use cache"`: DOMPurify/jsdom call `new Date()` internally, which trips the
 * Cache Components static-prerender guard unless the work is cached.
 */
export async function renderMarkdown(
  content: string | null | undefined,
): Promise<string> {
  "use cache";
  if (!content?.trim()) return "";
  return DOMPurify.sanitize(markdownToHtml(content), {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "loading"],
  });
}
