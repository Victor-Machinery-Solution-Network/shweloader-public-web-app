"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Wrench } from "lucide-react";

// Filled excavator glyph (stakeholder-picked, Material style) — inline SVG so it
// inherits `currentColor` and needs no extra icon dependency.
function ExcavatorIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props} style={{ width: 21, height: 21, ...props.style }}>
      <path d="M18.5 18.5C19.04 18.5 19.5 18.96 19.5 19.5S19.04 20.5 18.5 20.5H6.5C5.96 20.5 5.5 20.04 5.5 19.5S5.96 18.5 6.5 18.5H18.5M18.5 17H6.5C5.13 17 4 18.13 4 19.5S5.13 22 6.5 22H18.5C19.88 22 21 20.88 21 19.5S19.88 17 18.5 17M21 11H18V7H13L10 11V16H22L21 11M11.54 11L13.5 8.5H16V11H11.54M9.76 3.41L4.76 2L2 11.83C1.66 13.11 2.41 14.44 3.7 14.8L4.86 15.12L8.15 12.29L4.27 11.21L6.15 4.46L8.94 5.24C9.5 5.53 10.71 6.34 11.47 7.37L12.5 6H12.94C11.68 4.41 9.85 3.46 9.76 3.41Z" />
    </svg>
  );
}

import { assetUrl } from "@/lib/assets";
import { categorySlug } from "@/lib/category-landing";
import { useI18n } from "@/components/providers/language-provider";
import type { Category } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { groupAttachmentsBySubcategory } from "@/lib/api/group-attachments";

type TabId = "equipment" | "attachments";

interface CatGroup {
  id: string;
  name: string;
  /** Burmese group heading — null when unavailable (see toGroups() below). */
  nameMy?: string | null;
  /** When set, the group heading is a link (attachment tab → /browse?attsub=). */
  headingHref?: string;
  items: {
    id: string;
    name: string;
    nameMy?: string | null;
    image: string | null;
    href: string;
  }[];
}

/**
 * Flatten the real taxonomy into "group → subcategory item" form. Equipment
 * categories expose their nested sub-categories; flat attachment categories
 * (no sub-categories) render the category itself as a single item.
 *
 * Each item carries the CORRECT Browse href:
 *  - a sub-category links with `sub=<name>` + its parent `category=<parent>`
 *    (matching how the Browse sidebar applies a sub), so /browse resolves it to a
 *    `sub_category_id`;
 *  - a top-level category links with `category=<name>`.
 * Linking a sub-category as `category=<subName>` would NOT resolve on Browse
 * (sub names aren't top-level categories) → the page would show every listing
 * unfiltered. That was the "clicking a subcategory shows wrong results" bug.
 */
function toGroups(categories: Category[]): CatGroup[] {
  return categories.map((c) => ({
    id: `c-${c.id}`,
    name: c.name,
    nameMy: c.nameMy,
    items:
      c.subCategories.length > 0
        ? c.subCategories.map((s) => ({
            id: `s-${s.id}`,
            name: s.name,
            nameMy: s.nameMy,
            image: s.image,
            // Clean SEO landing page (/bulldozers/for-sale) — the browse
            // experience pre-filtered, with correctly filtered SSR listings.
            href: `/${categorySlug(s.name)}/for-sale`,
          }))
        : [
            {
              id: `c-${c.id}-self`,
              name: c.name,
              nameMy: c.nameMy,
              image: c.image,
              href: `/${categorySlug(c.name)}/for-sale`,
            },
          ],
  }));
}

/**
 * Categories V2 — one large card divided by main-category section headers, each
 * followed by a responsive grid of subcategory tiles (image + name). A pill
 * switch toggles between Equipment and Attachments inventory.
 *
 * Ports the design's `CategoriesV2` (`.cat-v2-*` / `.inv-switch-*` in app.css).
 * No listing counts are shown.
 */
export function CategoriesV2({
  equipmentCategories,
  attachmentCategories,
}: {
  equipmentCategories: Category[];
  attachmentCategories: Category[];
}) {
  const { t, locale } = useI18n();
  const my = locale === "my";
  const [tab, setTab] = useState<TabId>("equipment");

  const equipmentGroups = useMemo(
    () => toGroups(equipmentCategories),
    [equipmentCategories],
  );
  // Attachment tab: group attachment categories under the equipment sub-category
  // they're tagged to. Heading links to "all attachments for that sub"; each tile
  // links to its attachment category. (Equipment tab still uses toGroups.)
  const attachmentGroups = useMemo<CatGroup[]>(
    () =>
      groupAttachmentsBySubcategory(attachmentCategories).map((g) => ({
        id: `sub-${g.sub.id}`,
        name: g.sub.name,
        // g.sub only carries {id, name} (groupAttachmentsBySubcategory doesn't
        // thread nameMy through) — this heading stays English-only for now.
        headingHref: `/browse?type=attachment&attsub=${encodeURIComponent(g.sub.name)}`,
        items: g.attachments.map((a) => ({
          id: `a-${a.id}`,
          name: a.name,
          nameMy: a.nameMy,
          image: a.image,
          href: `/browse?type=attachment&category=${encodeURIComponent(a.name)}`,
        })),
      })),
    [attachmentCategories],
  );

  const tabs: { id: TabId; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
    { id: "equipment", label: t("home.equipment"), icon: ExcavatorIcon },
    { id: "attachments", label: t("home.attachments"), icon: Wrench },
  ];

  const groups = tab === "attachments" ? attachmentGroups : equipmentGroups;
  const title = t("home.browseByCategory");
  const viewAllLabel = t("actions.viewAll");

  return (
    <section style={{ padding: "56px 0 0" }}>
      <div className="container">
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          <h2 className="section-title">{title}</h2>
          <Link className="btn-link" href="/browse">
            {viewAllLabel}
            <ArrowRight className="icon-sm" aria-hidden="true" />
          </Link>
        </div>

        <div className="inv-switch-wrap">
          <div className="inv-switch" role="tablist" aria-label="Inventory type">
            <span className={cn("inv-switch-glide", tab)} aria-hidden="true" />
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={id === tab}
                className={cn("inv-switch-btn", id === tab && "is-on")}
                onClick={() => setTab(id)}
              >
                <Icon className="inv-switch-icon" aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="cat-v2-card" key={tab}>
          {groups.map((group) => (
            <div key={group.id} className="cat-v2-group">
              <div className="cat-v2-group-head">
                <span className="cat-v2-rule" aria-hidden="true" />
                <h3 className="cat-v2-group-title">
                  {group.headingHref ? (
                    <Link
                      href={group.headingHref}
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      {my ? (group.nameMy ?? group.name) : group.name}
                    </Link>
                  ) : my ? (
                    (group.nameMy ?? group.name)
                  ) : (
                    group.name
                  )}
                </h3>
                <span className="cat-v2-rule" aria-hidden="true" />
              </div>
              <div className="cat-v2-grid">
                {group.items.map((item) => {
                  const img = assetUrl(item.image);
                  return (
                    <Link
                      key={item.id}
                      className="cat-v2-item"
                      href={item.href}
                    >
                      <div className="cat-v2-img">
                        {img ? (
                          <Image
                            src={img}
                            // Named for SEO image analysis; SRs read the same
                            // name twice (image + text below) — accepted tradeoff.
                            alt={item.name}
                            width={120}
                            height={120}
                            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 120px"
                            style={{ objectFit: "contain" }}
                          />
                        ) : (
                          <div className="cat-v2-img-empty" aria-hidden="true">
                            <Wrench />
                          </div>
                        )}
                      </div>
                      <div className="cat-v2-name">
                        {my ? (item.nameMy ?? item.name) : item.name}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
