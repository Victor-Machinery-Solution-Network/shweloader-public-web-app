/**
 * Minimal, dependency-free Markdown → HTML renderer for blog post bodies.
 *
 * Blog `content` comes from the admin as Markdown. We render it to HTML that
 * reuses the design system's reading-view class names (`.bp-p`, `.bp-h2`,
 * `.bp-quote`, `.bp-list`, …) so the prototype's `blog.css` styles it exactly —
 * no new styling is authored here. Raw HTML in the source is escaped and link/
 * image URLs are scheme-allowlisted (see `safeUrl`), so the output is safe to
 * inject directly — no downstream HTML sanitizer (DOMPurify/jsdom) is required.
 *
 * Supported: ATX headings (#–######), unordered + ordered lists, blockquotes,
 * fenced + indented code, horizontal rules, paragraphs, and inline emphasis /
 * code / links / images. Anything unrecognised is treated as paragraph text.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Allowlist a link/image URL by scheme. Raw HTML is already escaped by the time
 * we get here, so URLs in `href`/`src` are the ONLY remaining injection vector
 * (e.g. `[x](javascript:alert(1))`). Permit http(s)/mailto/tel and scheme-less
 * (relative, #anchor, //host) URLs; neutralize everything else (javascript:,
 * data:, vbscript:, …) to "#". This makes the renderer's output safe by
 * construction — no DOM-based sanitizer needed downstream.
 */
function safeUrl(url: string): string {
  const u = url.trim();
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u; // allowed absolute schemes
  const colon = u.indexOf(":");
  const sep = u.search(/[/?#]/);
  // No colon, or the colon comes after a path separator → no scheme → relative.
  if (colon === -1 || (sep !== -1 && colon > sep)) return u;
  return "#"; // a disallowed scheme (everything not allowlisted above)
}

/** Inline spans — emphasis, code, links, images. Input is already block text. */
function renderInline(src: string): string {
  let out = escapeHtml(src);

  // inline code first so its contents aren't re-processed for emphasis
  out = out.replace(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`);

  // images: ![alt](url)
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g,
    (_m, alt: string, url: string) =>
      `<img src="${safeUrl(url)}" alt="${alt}" loading="lazy" />`,
  );

  // links: [text](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g,
    (_m, text: string, url: string) =>
      `<a href="${safeUrl(url)}" rel="nofollow noopener" target="_blank">${text}</a>`,
  );

  // bold then italic
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>");

  return out;
}

interface Block {
  type:
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "h6"
    | "p"
    | "quote"
    | "ul"
    | "ol"
    | "code"
    | "hr";
  text?: string;
  items?: string[];
  code?: string;
}

function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    let line = lines[i];

    // blank
    if (!line.trim()) {
      i++;
      continue;
    }

    // fenced code
    const fence = line.match(/^\s*(```+|~~~+)(.*)$/);
    if (fence) {
      const marker = fence[1][0];
      const codeLines: string[] = [];
      // Hardcoded close patterns (no dynamic RegExp) — `marker` is only ever ` or ~.
      const closeFence = marker === "`" ? /^\s*`{3,}\s*$/ : /^\s*~{3,}\s*$/;
      i++;
      while (i < lines.length && !closeFence.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ type: "code", code: codeLines.join("\n") });
      continue;
    }

    // horizontal rule
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // heading
    const heading = line.match(/^\s*(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      blocks.push({
        type: `h${level}` as Block["type"],
        text: heading[2],
      });
      i++;
      continue;
    }

    // blockquote (consume consecutive `>` lines)
    if (/^\s*>/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", text: quoteLines.join(" ").trim() });
      continue;
    }

    // unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // paragraph (consume until blank line / next block start)
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim()) {
      const l = lines[i];
      if (
        /^\s*(#{1,6})\s+/.test(l) ||
        /^\s*>/.test(l) ||
        /^\s*[-*+]\s+/.test(l) ||
        /^\s*\d+[.)]\s+/.test(l) ||
        /^\s*(```+|~~~+)/.test(l) ||
        /^\s*([-*_])(\s*\1){2,}\s*$/.test(l)
      ) {
        break;
      }
      paraLines.push(l.trim());
      i++;
    }
    line = paraLines.join(" ");
    if (line) blocks.push({ type: "p", text: line });
  }

  return blocks;
}

/** Render Markdown to an HTML string using the design's reading-view classes. */
export function markdownToHtml(md: string | null | undefined): string {
  if (!md?.trim()) return "";
  const blocks = parseBlocks(md);

  return blocks
    .map((b) => {
      switch (b.type) {
        case "h1":
        case "h2":
          return `<h2 class="bp-h2">${renderInline(b.text ?? "")}</h2>`;
        case "h3":
        case "h4":
        case "h5":
        case "h6":
          return `<h3 class="bp-h3">${renderInline(b.text ?? "")}</h3>`;
        case "quote":
          return `<blockquote class="bp-quote">${renderInline(
            b.text ?? "",
          )}</blockquote>`;
        case "ul":
          return `<ul class="bp-list">${(b.items ?? [])
            .map((it) => `<li>${renderInline(it)}</li>`)
            .join("")}</ul>`;
        case "ol":
          return `<ol class="bp-list">${(b.items ?? [])
            .map((it) => `<li>${renderInline(it)}</li>`)
            .join("")}</ol>`;
        case "code":
          return `<pre class="bp-pre"><code>${escapeHtml(
            b.code ?? "",
          )}</code></pre>`;
        case "hr":
          return `<hr class="bp-hr" />`;
        default:
          return `<p class="bp-p">${renderInline(b.text ?? "")}</p>`;
      }
    })
    .join("\n");
}
