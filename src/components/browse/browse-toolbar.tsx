"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Brand } from "@/lib/api/types";
import {
  buildBrowseHref,
  CONDITIONS,
  type BrowseFilters,
  type Sort,
} from "./filters";

const SORT_OPTS: { id: Sort; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "price-asc", label: "Price: low → high" },
  { id: "price-desc", label: "Price: high → low" },
];

/* ── Buy / Rent toggle (page head) ──────────────────────────── */
export function BuyRentToggle({ filters }: { filters: BrowseFilters }) {
  const router = useRouter();
  const opts = [
    { id: "sale" as const, label: "Buy" },
    { id: "rent" as const, label: "Rent" },
  ];
  const idx = opts.findIndex((o) => o.id === filters.mode);

  const go = (mode: "sale" | "rent") => {
    if (mode === filters.mode) return;
    router.push(buildBrowseHref({ ...filters, mode, page: 1 }));
  };

  return (
    <div className="brt brt-md" role="tablist" aria-label="Listing type">
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
  const router = useRouter();
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
    router.push(buildBrowseHref({ ...filters, sort, page: 1 }));
  };

  return (
    <div className="srt" ref={ref}>
      <button type="button" className="srt-btn" onClick={() => setOpen((o) => !o)}>
        <span className="srt-label">Sort</span>
        <span className="srt-value">{cur.label}</span>
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
              {o.label}
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
  const router = useRouter();
  const set = (view: "grid" | "list") => {
    if (view === filters.view) return;
    router.push(buildBrowseHref({ ...filters, view }));
  };
  return (
    <div className="vts" role="group" aria-label="View">
      <button
        type="button"
        className={cn("vts-btn", filters.view === "grid" && "is-on")}
        onClick={() => set("grid")}
        aria-label="Grid view"
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
        aria-label="List view"
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
  const router = useRouter();
  const push = (next: Partial<BrowseFilters>) =>
    router.push(buildBrowseHref({ ...filters, ...next, page: 1 }));

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
  filters.conditions.forEach((id) => {
    const c = CONDITIONS.find((x) => x.id === id);
    chips.push({
      key: "cond:" + id,
      label: c?.label ?? id,
      remove: () => push({ conditions: filters.conditions.filter((x) => x !== id) }),
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
    const label = `${fmtPrice(filters.priceMin) || "Min"} – ${fmtPrice(filters.priceMax) || "Any"} ${unit}`;
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
        Clear all
      </button>
    </div>
  );
}

/* ── Search-within-results input ────────────────────────────── */
function ResultsSearch({ filters }: { filters: BrowseFilters }) {
  const router = useRouter();
  const [value, setValue] = useState(filters.q);

  // Keep the input in sync if the URL changes from elsewhere (chips, nav).
  useEffect(() => {
    setValue(filters.q);
  }, [filters.q]);

  const submit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      router.push(buildBrowseHref({ ...filters, q: value.trim(), page: 1 }));
    },
    [router, filters, value],
  );

  const clear = () => {
    setValue("");
    router.push(buildBrowseHref({ ...filters, q: "", page: 1 }));
  };

  return (
    <form className="brz-results-search" onSubmit={submit} role="search">
      <Search className="brz-results-search-icon" aria-hidden="true" />
      <input
        type="text"
        placeholder="Search within results — model, brand, or location"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search within results"
      />
      {value && (
        <button
          type="button"
          className="brz-results-search-clear"
          onClick={clear}
          aria-label="Clear search"
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
          aria-label="Open filters"
        >
          <SlidersHorizontal className="icon-sm" aria-hidden="true" />
          <span>Filters</span>
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
