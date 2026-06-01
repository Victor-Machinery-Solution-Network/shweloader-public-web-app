"use client";

import { useState, type ReactNode } from "react";

import type { Brand, Category, StateRegion } from "@/lib/api/types";
import { BrowseSidebar } from "./browse-sidebar";
import { BrowseToolbar } from "./browse-toolbar";
import type { BrowseFilters } from "./filters";

/**
 * Client layout shell that coordinates the mobile filter bottom-sheet state
 * between the toolbar's "Filters" button and the sidebar. The results grid is
 * server-rendered and passed in as `children`, so listings stay RSC-cached.
 */
export function BrowseShell({
  filters,
  categories,
  attachmentCategories,
  brands,
  locations,
  total,
  children,
}: {
  filters: BrowseFilters;
  categories: Category[];
  attachmentCategories: Category[];
  brands: Brand[];
  locations: StateRegion[];
  total: number;
  children: ReactNode;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="container brz-layout">
      <BrowseSidebar
        filters={filters}
        categories={categories}
        attachmentCategories={attachmentCategories}
        brands={brands}
        locations={locations}
        total={total}
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
      />
      <section className="brz-results">
        <BrowseToolbar filters={filters} onOpenFilters={() => setFiltersOpen(true)} />
        {children}
      </section>
    </div>
  );
}
