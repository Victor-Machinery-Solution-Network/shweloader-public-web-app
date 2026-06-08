"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

import { useI18n } from "@/components/providers/language-provider";
import type {
  Brand,
  Category,
  ConditionType,
  StateRegion,
} from "@/lib/api/types";
import { BrowseSidebar } from "./browse-sidebar";
import { BrowseToolbar, BuyRentToggle } from "./browse-toolbar";
import { useBrowseFilters } from "./use-browse-filters";

/**
 * Browse chrome — page head, filter sidebar, toolbar. Renders fully in the
 * STATIC prerender: it derives filter selected-state via `useBrowseFilters`
 * (NOT `useSearchParams`), which returns the default on the server + first client
 * render and syncs to the URL after hydration. That keeps the chrome (and the
 * baked default listings passed as `children`) in the prerendered shell, so a
 * direct /browse load paints instantly with no skeleton flash.
 */
export function BrowseShell({
  categories,
  attachmentCategories,
  brands,
  locations,
  conditionTypes,
  children,
  headingKey = "browse.heading",
  crumbKey = "nav.browse",
  screenLabel = "Browse",
}: {
  categories: Category[];
  attachmentCategories: Category[];
  brands: Brand[];
  locations: StateRegion[];
  conditionTypes: ConditionType[];
  children: ReactNode;
  /** i18n keys for the <h1> + breadcrumb leaf, plus the data-screen-label. Default
   *  to Browse; the Saved page overrides them so the same chrome serves both. */
  headingKey?: string;
  crumbKey?: string;
  screenLabel?: string;
}) {
  const { t } = useI18n();
  const filters = useBrowseFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="brz" data-screen-label={screenLabel}>
      <div className="container brz-pagehead">
        <div className="brz-pagehead-l">
          <nav className="brz-crumbs" aria-label={t("a11y.breadcrumb")}>
            <Link href="/">{t("nav.home")}</Link>
            <span className="brz-crumbs-sep">/</span>
            <span>{t(crumbKey)}</span>
          </nav>
          <h1 className="brz-h1">{t(headingKey)}</h1>
        </div>
        <div className="brz-pagehead-r">
          <BuyRentToggle filters={filters} />
        </div>
      </div>

      <div className="container brz-layout">
        <BrowseSidebar
          filters={filters}
          categories={categories}
          attachmentCategories={attachmentCategories}
          brands={brands}
          locations={locations}
          conditionTypes={conditionTypes}
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
        />
        <section className="brz-results">
          <BrowseToolbar
            filters={filters}
            brands={brands}
            onOpenFilters={() => setFiltersOpen(true)}
          />
          {children}
        </section>
      </div>
    </div>
  );
}
