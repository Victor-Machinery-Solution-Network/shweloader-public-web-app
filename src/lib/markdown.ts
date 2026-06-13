import { markdownToHtml } from "@/components/blogs/markdown";

/**
 * Markdown → safe HTML for admin-authored content (blog bodies AND product
 * descriptions). Server-only by design: the dependency-free `markdownToHtml`
 * renderer runs here, so no markdown code ships in the client bundle (the HTML
 * string is passed to client components).
 *
 * No DOM-based sanitizer: `markdownToHtml` escapes all raw HTML and allowlists
 * link/image URL schemes (see its `safeUrl`), so the output is safe by
 * construction. That removes the old `isomorphic-dompurify`/jsdom dependency —
 * which also crashed Vercel's on-demand render functions (jsdom can't be bundled
 * into them), 500-ing any product/blog page that rendered live.
 */
export async function renderMarkdown(
  content: string | null | undefined,
): Promise<string> {
  if (!content?.trim()) return "";
  return markdownToHtml(content);
}
