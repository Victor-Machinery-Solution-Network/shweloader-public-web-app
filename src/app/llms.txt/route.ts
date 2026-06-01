import { SITE_URL } from "@/lib/env";

/**
 * /llms.txt — a concise, AI-crawler-friendly map of the site.
 * https://llmstxt.org
 */
export function GET() {
  const body = `# ShweLoader

> Myanmar's marketplace for heavy equipment and machinery. Buy, rent, or sell
> excavators, wheel loaders, cranes, bulldozers, dump trucks, and attachments.
> Operated by Victor Machinery Solution Network Co., Ltd. (VMSN, founded 2018).
> ShweLoader connects buyers and sellers and arranges on-site viewings; it does
> not process payments. Pricing is shown in MMK and USD. Languages: English and
> Burmese.

## Key pages

- [Browse equipment](${SITE_URL}/browse): Every listing for sale and rent, filterable by category, brand, condition, price, and region (state/district/township).
- [Blog](${SITE_URL}/blogs): Equipment guides, maintenance tips, and industry news.
- [About](${SITE_URL}/about): Company background, mission, and the VMSN story.
- [Terms & Privacy](${SITE_URL}/legal)

## Content model

- Listings live at ${SITE_URL}/product/{slug}, where slug ends in the listing id.
- Blog posts live at ${SITE_URL}/blogs/{slug}.
- Equipment categories are nested (category → sub-category); attachments are flat.
- A full URL index is available at ${SITE_URL}/sitemap.xml

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
