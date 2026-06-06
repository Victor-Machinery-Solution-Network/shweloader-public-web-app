"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/language-provider";
import type { Brand } from "@/lib/api/types";
import { pushBrowseUrl } from "./navigate";
import {
  buildBrowseHref,
  type BrowseFilters,
  type Sort,
} from "./filters";

const SORT_OPTS: { id: Sort; labelKey: string }[] = [
  { id: "newest", labelKey: "browse.sortNewest" },
  { id: "price-asc", labelKey: "browse.sortPriceAsc" },
  { id: "price-desc", labelKey: "browse.sortPriceDesc" },
];

/* ── Buy / Rent toggle (page head) ──────────────────────────── */
export function BuyRentToggle({ filters }: { filters: BrowseFilters }) {
  const { t } = useI18n();
  const opts = [
    { id: "sale" as const, label: t("search.buy") },
    { id: "rent" as const, label: t("search.rent") },
  ];
  const idx = opts.findIndex((o) => o.id === filters.mode);

  const go = (mode: "sale" | "rent") => {
    if (mode === filters.mode) return;
    pushBrowseUrl(buildBrowseHref({ ...filters, mode, page: 1 }));
  };

  return (
    <div className="brt brt-md" role="tablist" aria-label={t("browse.listingType")}>
      <span
        className="brt-glide"
        style={{ transform: `translateX(${idx * 100}%)` }}
      />
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={filters.mode === o.id}
          className={cn("brt-btn", filters.mode === o.id && "is-on")}
          onClick={() => go(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Sort dropdown ──────────────────────────────────────────── */
function SortSelect({ filters }: { filters: BrowseFilters }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cur = SORT_OPTS.find((o) => o.id === filters.sort) ?? SORT_OPTS[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (sort: Sort) => {
    setOpen(false);
    pushBrowseUrl(buildBrowseHref({ ...filters, sort, page: 1 }));
  };

  return (
    <div className="srt" ref={ref}>
      <button type="button" className="srt-btn" onClick={() => setOpen((o) => !o)}>
        <span className="srt-label">{t("browse.sort")}</span>
        <span className="srt-value">{t(cur.labelKey)}</span>
        <ChevronDown className="icon-sm" aria-hidden="true" />
      </button>
      {open && (
        <div className="srt-menu">
          {SORT_OPTS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={cn("srt-item", o.id === filters.sort && "is-on")}
              onClick={() => pick(o.id)}
            >
              {t(o.labelKey)}
              {o.id === filters.sort && (
                <Check className="icon-sm" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Grid / List view toggle ────────────────────────────────── */
function ViewToggle({ filters }: { filters: BrowseFilters }) {
  const { t } = useI18n();
  const set = (view: "grid" | "list") => {
    if (view === filters.view) return;
    pushBrowseUrl(buildBrowseHref({ ...filters, view }));
  };
  return (
    <div className="vts" role="group" aria-label="View">
      <button
        type="button"
        className={cn("vts-btn", filters.view === "grid" && "is-on")}
        onClick={() => set("grid")}
        aria-label={t("a11y.gridView")}
        aria-pressed={filters.view === "grid"}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="9.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="1.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <button
        type="button"
        className={cn("vts-btn", filters.view === "list" && "is-on")}
        onClick={() => set("list")}
        aria-label={t("a11y.listView")}
        aria-pressed={filters.view === "list"}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1.5" y="2.5" width="13" height="3" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="1.5" y="10.5" width="13" height="3" rx="1" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </div>
  );
}

/* ── Active filter chips ────────────────────────────────────── */
function fmtPrice(v: string): string {
  if (!v) return "";
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return "";
  if (n >= 100_000) {
    const lakh = n / 100_000;
    return (
      lakh.toLocaleString(undefined, {
        maximumFractionDigits: lakh < 10 ? 1 : 0,
      }) + " L"
    );
  }
  return n.toLocaleString();
}

function ActiveFilters({
  filters,
  brands,
}: {
  filters: BrowseFilters;
  brands: Brand[];
}) {
  const { t } = useI18n();
  const push = (next: Partial<BrowseFilters>) =>
    pushBrowseUrl(buildBrowseHref({ ...filters, ...next, page: 1 }));

  const chips: { key: string; label: string; remove: () => void }[] = [];

  if (filters.category) {
    chips.push({
      key: "cat",
      label: filters.category,
      remove: () => push({ category: "", sub: "" }),
    });
  }
  if (filters.sub) {
    chips.push({ key: "sub", label: filters.sub, remove: () => push({ sub: "" }) });
  }
  filters.brands.forEach((b) =>
    chips.push({
      key: "br:" + b,
      label: b,
      remove: () => push({ brands: filters.brands.filter((x) => x !== b) }),
    }),
  );
  filters.models.forEach((id) => {
    const name = brands
      .flatMap((b) => b.models)
      .find((m) => String(m.id) === id)?.name;
    chips.push({
      key: "mdl:" + id,
      label: name ?? `Model ${id}`,
      remove: () => push({ models: filters.models.filter((x) => x !== id) }),
    });
  });
  filters.conditions.forEach((name) => {
    chips.push({
      key: "cond:" + name,
      label: name,
      remove: () =>
        push({ conditions: filters.conditions.filter((x) => x !== name) }),
    });
  });
  if (filters.location) {
    chips.push({
      key: "loc",
      label: filters.location,
      remove: () => push({ location: "" }),
    });
  }
  if (filters.priceMin || filters.priceMax) {
    const unit = filters.currency === "USD" ? "USD" : "MMK";
    const label = `${fmtPrice(filters.priceMin) || t("browse.priceFrom")} – ${fmtPrice(filters.priceMax) || t("browse.priceAny")} ${unit}`;
    chips.push({
      key: "price",
      label,
      remove: () => push({ priceMin: "", priceMax: "" }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="afc">
      {chips.map((c) => (
        <button key={c.key} type="button" className="afc-chip" onClick={c.remove}>
          <span>{c.label}</span>
          <span className="afc-x">×</span>
        </button>
      ))}
      <button
        type="button"
        className="afc-clear"
        onClick={() =>
          push({
            category: "",
            sub: "",
            brands: [],
            models: [],
            conditions: [],
            location: "",
            priceMin: "",
            priceMax: "",
          })
        }
      >
        {t("actions.clearAll")}
      </button>
    </div>
  );
}

/* ── Search-within-results input ────────────────────────────── */
function ResultsSearch({ filters }: { filters: BrowseFilters }) {
  const { t } = useI18n();
  const [value, setValue] = useState(filters.q);

  // Keep the input in sync if the URL changes from elsewhere (chips, nav).
  useEffect(() => {
    setValue(filters.q);
  }, [filters.q]);

  const submit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      pushBrowseUrl(buildBrowseHref({ ...filters, q: value.trim(), page: 1 }));
    },
    [filters, value],
  );

  const clear = () => {
    setValue("");
    pushBrowseUrl(buildBrowseHref({ ...filters, q: "", page: 1 }));
  };

  return (
    <form className="brz-results-search" onSubmit={submit} role="search">
      <Search className="brz-results-search-icon" aria-hidden="true" />
      <input
        type="text"
        placeholder={t("browse.searchInResults")}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label={t("browse.searchInResults")}
      />
      {value && (
        <button
          type="button"
          className="brz-results-search-clear"
          onClick={clear}
          aria-label={t("a11y.clearSearch")}
        >
          <X className="icon-sm" aria-hidden="true" />
        </button>
      )}
    </form>
  );
}

/* ── Toolbar — search + filters button + chips + sort + view ── */
export function BrowseToolbar({
  filters,
  brands,
  onOpenFilters,
}: {
  filters: BrowseFilters;
  brands: Brand[];
  onOpenFilters: () => void;
}) {
  const { t } = useI18n();
  const activeCount =
    (filters.category ? 1 : 0) +
    (filters.sub ? 1 : 0) +
    filters.brands.length +
    filters.models.length +
    filters.conditions.length +
    (filters.location ? 1 : 0) +
    (filters.priceMin || filters.priceMax ? 1 : 0);

  return (
    <>
      <ResultsSearch filters={filters} />
      <div className="brz-results-bar">
        <button
          type="button"
          className="brz-filters-btn"
          onClick={onOpenFilters}
          aria-label={t("browse.openFilters")}
        >
          <SlidersHorizontal className="icon-sm" aria-hidden="true" />
          <span>{t("browse.filters")}</span>
          {activeCount > 0 && (
            <span className="brz-filters-btn-n tnum">{activeCount}</span>
          )}
        </button>
        <div className="brz-results-l">
          <ActiveFilters filters={filters} brands={brands} />
        </div>
        <div className="brz-results-r">
          <SortSelect filters={filters} />
          <ViewToggle filters={filters} />
        </div>
      </div>
    </>
  );
}
