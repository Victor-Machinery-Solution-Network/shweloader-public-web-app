"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import type {
  Brand,
  Category,
  ConditionType,
  StateRegion,
} from "@/lib/api/types";
import { BrowseSidebar } from "./browse-sidebar";
import { BrowseToolbar, BuyRentToggle } from "./browse-toolbar";
import { parseFilters } from "./filters";

/**
 * Static browse chrome — page head, filter sidebar, toolbar. This renders in the
 * prerendered shell (NOT behind the dynamic listings fetch), so the whole filter
 * UI + page head paint instantly from the CDN; only the listings grid (passed as
 * `children`) streams in behind a Suspense boundary.
 *
 * Filter selected-state is read from the URL on the client, so the shell is
 * filter-agnostic — one cached prerender serves every `/browse?…` view, and the
 * dynamic function only has to fetch + render the listings.
 */
export function BrowseShell({
  categories,
  attachmentCategories,
  brands,
  locations,
  conditionTypes,
  children,
}: {
  categories: Category[];
  attachmentCategories: Category[];
  brands: Brand[];
  locations: StateRegion[];
  conditionTypes: ConditionType[];
  children: ReactNode;
}) {
  const sp = useSearchParams();
  const filters = parseFilters(Object.fromEntries(sp.entries()));
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="brz" data-screen-label="Browse">
      <div className="container brz-pagehead">
        <div className="brz-pagehead-l">
          <nav className="brz-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="brz-crumbs-sep">/</span>
            <span>Browse</span>
          </nav>
          <h1 className="brz-h1">Browse listings</h1>
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
