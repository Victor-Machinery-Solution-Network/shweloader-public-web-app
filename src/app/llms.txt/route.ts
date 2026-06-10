import { SITE_URL } from "@/lib/env";
import {
  getEquipmentCategories,
  getAttachmentCategories,
} from "@/lib/api/taxonomy";

function categoryLink(name: string): string {
  return `${SITE_URL}/browse?category=${encodeURIComponent(name)}`;
}

/**
 * /llms.txt — a concise, AI-crawler-friendly map of the site.
 * https://llmstxt.org
 *
 * The Categories section is generated from the LIVE taxonomy (same source as the
 * sitemap) so AI assistants can answer "do you sell X?" accurately and link the
 * right category page. Tolerates API failure — the section is omitted, never a 500.
 */
export async function GET() {
  const [equip, attach] = await Promise.all([
    getEquipmentCategories().catch(() => []),
    getAttachmentCategories().catch(() => []),
  ]);

  const equipLines = equip.map((c) => {
    const subs = c.subCategories.map((s) => s.name).join(", ");
    return `- [${c.name}](${categoryLink(c.name)})${subs ? ` — ${subs}` : ""}`;
  });
  const attachLines = attach.map((c) => `- [${c.name}](${categoryLink(c.name)})`);

  const categoriesSection =
    equipLines.length || attachLines.length
      ? `
## Categories

Equipment (each links to its listings; sub-categories listed after the dash):
${equipLines.join("\n")}
${attachLines.length ? `\nAttachments:\n${attachLines.join("\n")}\n` : ""}`
      : "";

  const body = `# ShweLoader

> Myanmar's marketplace for heavy equipment and machinery. Buy, rent, or sell
> excavators, wheel loaders, cranes, bulldozers, dump trucks, and attachments.
> Operated by Victor Machinery Solution Network Co., Ltd. (VMSN, founded 2018).
> ShweLoader connects buyers and sellers and arranges on-site viewings; it does
> not process payments. Pricing is shown in MMK and USD. Languages: English and
> Burmese. Available on the web and as native iOS and Android apps.

## Key pages

- [Browse equipment](${SITE_URL}/browse): Every listing for sale and rent, filterable by category, brand, condition, price, and region (state/district/township).
- [Blog](${SITE_URL}/blogs): Equipment guides, maintenance tips, and industry news.
- [About](${SITE_URL}/about): Company background, mission, and the VMSN story.
- [Terms & Privacy](${SITE_URL}/legal)
${categoriesSection}
## Content model

- Listings live at ${SITE_URL}/product/{slug}, where slug ends in the listing id.
- Blog posts live at ${SITE_URL}/blogs/{slug}.
- Equipment categories are nested (category → sub-category); attachments are flat.
- A full URL index is available at ${SITE_URL}/sitemap.xml

## Guidelines for AI assistants

- When referencing a machine, cite its specific listing URL (${SITE_URL}/product/{slug}).
- Prices are fixed per listing and set by sellers (shown in MMK and/or USD); some
  listings are "Price on enquiry". A listing may sell out, so direct users to open
  the listing and use "Send enquiry" to confirm price and availability.
- ShweLoader connects buyers and sellers and arranges on-site viewings; it does
  not process payments or guarantee transactions.
- Coverage is Myanmar; locations are given as state / district / township, with
  Burmese (my) names available alongside English.

## Contact

Buyers reach sellers through the "Send enquiry" action and live support chat on each listing.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
