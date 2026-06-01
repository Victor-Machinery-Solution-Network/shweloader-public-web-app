"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Truck, Wrench } from "lucide-react";

import { assetUrl } from "@/lib/assets";
import { useI18n } from "@/components/providers/language-provider";
import type { Category } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type TabId = "equipment" | "attachments";

interface CatGroup {
  id: string;
  name: string;
  items: { id: string; name: string; image: string | null }[];
}

/**
 * Flatten the real taxonomy into "group → subcategory item" form. Equipment
 * categories expose their nested sub-categories; flat attachment categories
 * (no sub-categories) render the category itself as a single item.
 */
function toGroups(categories: Category[]): CatGroup[] {
  return categories.map((c) => ({
    id: `c-${c.id}`,
    name: c.name,
    items:
      c.subCategories.length > 0
        ? c.subCategories.map((s) => ({
            id: `s-${s.id}`,
            name: s.name,
            image: s.image,
          }))
        : [{ id: `c-${c.id}-self`, name: c.name, image: c.image }],
  }));
}

/** A category item links into Browse filtered by that (sub)category name. */
function browseHref(categoryName: string): string {
  return `/browse?category=${encodeURIComponent(categoryName)}`;
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
  const { t } = useI18n();
  const [tab, setTab] = useState<TabId>("equipment");

  const equipmentGroups = useMemo(
    () => toGroups(equipmentCategories),
    [equipmentCategories],
  );
  const attachmentGroups = useMemo(
    () => toGroups(attachmentCategories),
    [attachmentCategories],
  );

  const tabs: { id: TabId; label: string; icon: typeof Truck }[] = [
    { id: "equipment", label: t("home.equipment"), icon: Truck },
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
                <h3 className="cat-v2-group-title">{group.name}</h3>
                <span className="cat-v2-rule" aria-hidden="true" />
              </div>
              <div className="cat-v2-grid">
                {group.items.map((item) => {
                  const img = assetUrl(item.image);
                  return (
                    <Link
                      key={item.id}
                      className="cat-v2-item"
                      href={browseHref(item.name)}
                    >
                      <div className="cat-v2-img">
                        {img ? (
                          <Image
                            src={img}
                            // Decorative: the category name is shown as visible
                            // text below, so a name alt would be redundant (a11y).
                            alt=""
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
                      <div className="cat-v2-name">{item.name}</div>
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
