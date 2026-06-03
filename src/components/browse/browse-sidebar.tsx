"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Search, X } from "lucide-react";

import type {
  Brand,
  Category,
  ConditionType,
  StateRegion,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import {
  buildBrowseHref,
  type BrowseFilters,
  type Currency,
} from "./filters";

/* ── Reusable group shell ───────────────────────────────────── */
function SidebarGroup({
  label,
  count,
  action,
  children,
}: {
  label: string;
  count?: number | null;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bsb-group">
      <header className="bsb-group-head">
        <h4 className="bsb-group-l">{label}</h4>
        {count != null && count > 0 && (
          <span className="bsb-group-n tnum">{count}</span>
        )}
        {action}
      </header>
      <div className="bsb-group-body">{children}</div>
    </section>
  );
}

/* ── Generic checkbox row ───────────────────────────────────── */
function TreeRow({
  label,
  on,
  indeterminate,
  depth = 0,
  count,
  hasChildren,
  expanded,
  onToggle,
  onExpand,
}: {
  label: ReactNode;
  on: boolean;
  indeterminate?: boolean;
  depth?: number;
  count?: number | null;
  hasChildren?: boolean;
  expanded?: boolean;
  onToggle: () => void;
  onExpand?: () => void;
}) {
  return (
    <div
      className={cn(
        "bsb-tree-row",
        `depth-${depth}`,
        on && "is-on",
        !on && indeterminate && "is-some",
      )}
    >
      <button
        type="button"
        className="bsb-tree-check"
        onClick={onToggle}
        aria-pressed={on}
      >
        <span className="bsb-tree-check-box" aria-hidden="true">
          {on ? (
            <Check className="icon-sm" />
          ) : indeterminate ? (
            <span className="bsb-tree-dash" />
          ) : null}
        </span>
        <span className="bsb-tree-label">{label}</span>
      </button>
      {count != null && <span className="bsb-tree-count tnum">{count}</span>}
      {hasChildren && (
        <button
          type="button"
          className={cn("bsb-tree-chev", expanded && "is-open")}
          onClick={onExpand}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <ChevronDown className="icon-sm" />
        </button>
      )}
    </div>
  );
}

/* ── Type — equipment tree + flat attachments (single-select) ─ */
function CategoryGroup({
  categories,
  attachmentCategories,
  filters,
  apply,
}: {
  categories: Category[];
  attachmentCategories: Category[];
  filters: BrowseFilters;
  apply: (patch: Partial<BrowseFilters>) => void;
}) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const toggleOpen = (id: number) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const selectedCount = (filters.category ? 1 : 0) + (filters.sub ? 1 : 0);

  const pickCategory = (name: string) =>
    apply({ category: filters.category === name ? "" : name, sub: "" });
  const pickSub = (name: string, parentName: string) =>
    apply(
      filters.sub === name
        ? { sub: "" }
        : { sub: name, category: parentName },
    );

  return (
    <SidebarGroup
      label="Type"
      count={selectedCount}
      action={
        selectedCount > 0 ? (
          <button
            type="button"
            className="bsb-group-clear"
            onClick={() => apply({ category: "", sub: "" })}
          >
            Reset
          </button>
        ) : null
      }
    >
      <div className="bsb-tree-section">
        <div className="bsb-tree-section-h">Equipment</div>
        <div className="bsb-tree">
          {categories.map((c) => {
            const expanded = open.has(c.id);
            const parentSel = filters.category === c.name && !filters.sub;
            const someChildSel =
              filters.sub.length > 0 &&
              c.subCategories.some((s) => s.name === filters.sub);
            return (
              <Fragment key={c.id}>
                <TreeRow
                  label={c.name}
                  on={parentSel}
                  indeterminate={!parentSel && someChildSel}
                  depth={0}
                  hasChildren={c.subCategories.length > 0}
                  expanded={expanded}
                  onToggle={() => pickCategory(c.name)}
                  onExpand={() => toggleOpen(c.id)}
                />
                {expanded && c.subCategories.length > 0 && (
                  <div
                    className="bsb-tree-subs"
                    role="group"
                    aria-label={`${c.name} subcategories`}
                  >
                    {c.subCategories.map((s) => (
                      <TreeRow
                        key={s.id}
                        label={s.name}
                        on={filters.sub === s.name}
                        depth={1}
                        onToggle={() => pickSub(s.name, c.name)}
                      />
                    ))}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {attachmentCategories.length > 0 && (
        <div className="bsb-tree-section">
          <div className="bsb-tree-section-h">Attachments</div>
          <div className="bsb-tree">
            {attachmentCategories.map((a) => (
              <TreeRow
                key={a.id}
                label={a.name}
                on={filters.category === a.name && !filters.sub}
                depth={0}
                onToggle={() => pickCategory(a.name)}
              />
            ))}
          </div>
        </div>
      )}
    </SidebarGroup>
  );
}

/* ── Brand — searchable list; each brand expands to its models ─ */
function BrandGroup({
  brands,
  filters,
  apply,
}: {
  brands: Brand[];
  filters: BrowseFilters;
  apply: (patch: Partial<BrowseFilters>) => void;
}) {
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  // Per-brand UI state (brand id → …): which are expanded, their model search,
  // and which have their full model list revealed.
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [modelQ, setModelQ] = useState<Record<number, string>>({});
  const [modelsAll, setModelsAll] = useState<Set<number>>(new Set());

  const toggleBrand = (name: string) =>
    apply({
      brands: filters.brands.includes(name)
        ? filters.brands.filter((x) => x !== name)
        : [...filters.brands, name],
    });

  const toggleModel = (id: string) =>
    apply({
      models: filters.models.includes(id)
        ? filters.models.filter((x) => x !== id)
        : [...filters.models, id],
    });

  const toggleOpen = (brandId: number) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(brandId)) n.delete(brandId);
      else n.add(brandId);
      return n;
    });

  const selectedCount = filters.brands.length + filters.models.length;

  const sorted = useMemo(
    () => [...brands].sort((a, b) => a.name.localeCompare(b.name)),
    [brands],
  );
  const visibleAll = q
    ? sorted.filter((b) => b.name.toLowerCase().includes(q.toLowerCase()))
    : sorted;
  const visible = showAll || q ? visibleAll : visibleAll.slice(0, 7);
  const hidden = visibleAll.length - visible.length;

  return (
    <SidebarGroup
      label="Brand"
      count={selectedCount}
      action={
        selectedCount > 0 ? (
          <button
            type="button"
            className="bsb-group-clear"
            onClick={() => apply({ brands: [], models: [] })}
          >
            Reset
          </button>
        ) : null
      }
    >
      <div className="bsb-search">
        <Search className="icon-sm" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search brand…"
          aria-label="Search brand"
        />
      </div>
      <div className="bsb-tree">
        {visible.map((b) => {
          const brandOn = filters.brands.includes(b.name);
          const models = b.models;
          const mq = (modelQ[b.id] || "").trim().toLowerCase();
          const someModel = models.some((m) =>
            filters.models.includes(String(m.id)),
          );
          // A brand auto-expands when it (or one of its models) is selected.
          const isOpen = open.has(b.id) || brandOn;
          const matched = mq
            ? models.filter((m) => m.name.toLowerCase().includes(mq))
            : modelsAll.has(b.id)
              ? models
              : models.slice(0, 6);
          const moreModels = models.length - matched.length;
          return (
            <Fragment key={b.id}>
              <TreeRow
                label={b.name}
                on={brandOn}
                indeterminate={!brandOn && someModel}
                depth={0}
                hasChildren={models.length > 0}
                expanded={isOpen}
                onToggle={() => toggleBrand(b.name)}
                onExpand={() => toggleOpen(b.id)}
              />
              {isOpen && models.length > 0 && (
                <div
                  className="bsb-tree-subs bsb-brand-models"
                  role="group"
                  aria-label={`${b.name} models`}
                >
                  <div className="bsb-brand-msearch">
                    <Search className="icon-sm" aria-hidden="true" />
                    <input
                      value={modelQ[b.id] || ""}
                      onChange={(e) =>
                        setModelQ((s) => ({ ...s, [b.id]: e.target.value }))
                      }
                      placeholder={`Search ${b.name} model…`}
                      aria-label={`Search ${b.name} models`}
                    />
                    {modelQ[b.id] && (
                      <button
                        type="button"
                        className="bsb-brand-msearch-x"
                        onClick={() => setModelQ((s) => ({ ...s, [b.id]: "" }))}
                        aria-label="Clear model search"
                      >
                        <X className="icon-sm" />
                      </button>
                    )}
                  </div>
                  {matched.length === 0 && (
                    <div className="bsb-empty">No matches</div>
                  )}
                  {matched.map((m) => (
                    <TreeRow
                      key={m.id}
                      label={m.name}
                      on={filters.models.includes(String(m.id))}
                      depth={1}
                      onToggle={() => toggleModel(String(m.id))}
                    />
                  ))}
                  {!mq && !modelsAll.has(b.id) && moreModels > 0 && (
                    <button
                      type="button"
                      className="bsb-brand-models-more"
                      onClick={() =>
                        setModelsAll((s) => new Set(s).add(b.id))
                      }
                    >
                      Show {moreModels} more
                    </button>
                  )}
                </div>
              )}
            </Fragment>
          );
        })}
        {visible.length === 0 && <div className="bsb-empty">No matches</div>}
      </div>
      {!q && hidden > 0 && (
        <button type="button" className="bsb-more" onClick={() => setShowAll(true)}>
          Show {hidden} more
          <svg viewBox="0 0 10 6" width="10" height="6" aria-hidden="true">
            <path
              d="M1 1L5 5L9 1"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      {!q && showAll && (
        <button type="button" className="bsb-more" onClick={() => setShowAll(false)}>
          Show fewer
        </button>
      )}
    </SidebarGroup>
  );
}

/* ── Condition — multi-select list (admin-managed condition_type catalog) ──── */
function ConditionGroup({
  filters,
  apply,
  conditionTypes,
}: {
  filters: BrowseFilters;
  apply: (patch: Partial<BrowseFilters>) => void;
  conditionTypes: ConditionType[];
}) {
  // Stored by name (resolved to condition_type id in toListingQuery), matching
  // how category/brand facets work.
  const toggle = (name: string) =>
    apply({
      conditions: filters.conditions.includes(name)
        ? filters.conditions.filter((x) => x !== name)
        : [...filters.conditions, name],
    });

  if (conditionTypes.length === 0) return null;

  return (
    <SidebarGroup
      label="Condition"
      count={filters.conditions.length}
      action={
        filters.conditions.length > 0 ? (
          <button
            type="button"
            className="bsb-group-clear"
            onClick={() => apply({ conditions: [] })}
          >
            Reset
          </button>
        ) : null
      }
    >
      <div className="bsb-tree">
        {conditionTypes.map((c) => (
          <TreeRow
            key={c.id}
            label={c.name}
            on={filters.conditions.includes(c.name)}
            depth={0}
            onToggle={() => toggle(c.name)}
          />
        ))}
      </div>
    </SidebarGroup>
  );
}

/* ── Price — dual-handle range slider, MMK or USD ───────────── */
const PRICE_RANGES: Record<Currency, { min: number; max: number; step: number }> =
  {
    MMK: { min: 0, max: 1_000_000_000, step: 5_000_000 },
    USD: { min: 0, max: 500_000, step: 1_000 },
  };

function fmtMmk(v: number): string {
  if (v >= 100_000) {
    const lakh = v / 100_000;
    return (
      lakh.toLocaleString(undefined, {
        maximumFractionDigits: lakh < 10 ? 1 : 0,
      }) + " L"
    );
  }
  return v.toLocaleString();
}
function fmtUsd(v: number): string {
  if (v >= 1_000_000)
    return "$" + (v / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + "M";
  if (v >= 1_000) return "$" + (v / 1_000).toFixed(0) + "K";
  return "$" + v.toLocaleString();
}
const fmtAmt = (v: number, c: Currency) => (c === "USD" ? fmtUsd(v) : fmtMmk(v));

function PriceGroup({
  filters,
  apply,
}: {
  filters: BrowseFilters;
  apply: (patch: Partial<BrowseFilters>) => void;
}) {
  const currency = filters.currency;
  const RANGE = PRICE_RANGES[currency];
  const active = Boolean(filters.priceMin || filters.priceMax);

  // Local draft so dragging is smooth; commit to the URL on release.
  const initLo =
    filters.priceMin === ""
      ? RANGE.min
      : Math.max(RANGE.min, parseInt(filters.priceMin, 10) || RANGE.min);
  const initHi =
    filters.priceMax === ""
      ? RANGE.max
      : Math.min(RANGE.max, parseInt(filters.priceMax, 10) || RANGE.max);

  const [lo, setLo] = useState(initLo);
  const [hi, setHi] = useState(initHi);

  // Re-sync when the URL or currency changes underneath.
  useEffect(() => {
    setLo(initLo);
    setHi(initHi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.priceMin, filters.priceMax, currency]);

  const commit = (nextLo: number, nextHi: number) =>
    apply({
      priceMin: nextLo <= RANGE.min ? "" : String(nextLo),
      priceMax: nextHi >= RANGE.max ? "" : String(nextHi),
    });

  const onLo = (v: number) => setLo(Math.min(v, hi - RANGE.step));
  const onHi = (v: number) => setHi(Math.max(v, lo + RANGE.step));

  const pctLo = ((lo - RANGE.min) / (RANGE.max - RANGE.min)) * 100;
  const pctHi = ((hi - RANGE.min) / (RANGE.max - RANGE.min)) * 100;
  const axis = [0, 0.25, 0.5, 0.75, 1].map(
    (t) => RANGE.min + t * (RANGE.max - RANGE.min),
  );

  const setCurrency = (c: Currency) => {
    if (c === currency) return;
    apply({ currency: c, priceMin: "", priceMax: "" });
  };

  return (
    <SidebarGroup
      label="Price"
      action={
        active ? (
          <button
            type="button"
            className="bsb-group-clear"
            onClick={() => apply({ priceMin: "", priceMax: "" })}
          >
            Reset
          </button>
        ) : null
      }
    >
      <div className="bsb-cur" role="group" aria-label="Currency">
        {(["MMK", "USD"] as Currency[]).map((c) => (
          <button
            key={c}
            type="button"
            className={cn("bsb-cur-btn", currency === c && "is-on")}
            onClick={() => setCurrency(c)}
            aria-pressed={currency === c}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="bsb-pricer">
        <div className="bsb-pricer-vals">
          <span className="bsb-pricer-val">
            <span className="bsb-pricer-val-tag">From</span>
            <strong>{lo === RANGE.min ? "Any" : fmtAmt(lo, currency)}</strong>
          </span>
          <span className="bsb-pricer-val">
            <span className="bsb-pricer-val-tag">To</span>
            <strong>{hi === RANGE.max ? "Any" : fmtAmt(hi, currency)}</strong>
          </span>
        </div>
        <div className="bsb-pricer-slider">
          <div className="bsb-pricer-track" aria-hidden="true">
            <div
              className="bsb-pricer-fill"
              style={{ left: `${pctLo}%`, right: `${100 - pctHi}%` }}
            />
          </div>
          <input
            type="range"
            className="bsb-pricer-thumb bsb-pricer-thumb-lo"
            min={RANGE.min}
            max={RANGE.max}
            step={RANGE.step}
            value={lo}
            onChange={(e) => onLo(parseInt(e.target.value, 10))}
            onMouseUp={() => commit(lo, hi)}
            onTouchEnd={() => commit(lo, hi)}
            onKeyUp={() => commit(lo, hi)}
            aria-label="Minimum price"
          />
          <input
            type="range"
            className="bsb-pricer-thumb bsb-pricer-thumb-hi"
            min={RANGE.min}
            max={RANGE.max}
            step={RANGE.step}
            value={hi}
            onChange={(e) => onHi(parseInt(e.target.value, 10))}
            onMouseUp={() => commit(lo, hi)}
            onTouchEnd={() => commit(lo, hi)}
            onKeyUp={() => commit(lo, hi)}
            aria-label="Maximum price"
          />
        </div>
        <div className="bsb-pricer-axis" aria-hidden="true">
          {axis.map((t, i) => (
            <span key={i}>{t === 0 ? "0" : fmtAmt(t, currency)}</span>
          ))}
        </div>
      </div>
    </SidebarGroup>
  );
}

/* ── Location — 3-level tree with search (single-select) ────── */
function HiText({ text, q }: { text: string; q: string }) {
  const needle = q.trim();
  if (!needle) return <>{text}</>;
  const i = text.toLowerCase().indexOf(needle.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bsb-tree-mark">{text.slice(i, i + needle.length)}</mark>
      {text.slice(i + needle.length)}
    </>
  );
}

function LocationGroup({
  locations,
  filters,
  apply,
}: {
  locations: StateRegion[];
  filters: BrowseFilters;
  apply: (patch: Partial<BrowseFilters>) => void;
}) {
  const [q, setQ] = useState("");
  const [openStates, setOpenStates] = useState<Set<number>>(() => new Set());
  const [openDistricts, setOpenDistricts] = useState<Set<number>>(() => new Set());

  const selected = filters.location;
  const pick = (name: string) =>
    apply({ location: selected === name ? "" : name });

  const toggleState = (id: number) =>
    setOpenStates((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleDistrict = (id: number) =>
    setOpenDistricts((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle)
      return {
        tree: locations,
        autoStates: null as Set<number> | null,
        autoDistricts: null as Set<number> | null,
      };
    const autoStates = new Set<number>();
    const autoDistricts = new Set<number>();
    const tree: StateRegion[] = [];
    for (const s of locations) {
      const sHit = s.name.toLowerCase().includes(needle);
      const districts = [];
      for (const d of s.districts) {
        const dHit = d.name.toLowerCase().includes(needle);
        const townships = d.townships.filter((t) =>
          t.name.toLowerCase().includes(needle),
        );
        if (sHit || dHit || townships.length > 0) {
          districts.push({ ...d, townships: sHit || dHit ? d.townships : townships });
          autoStates.add(s.id);
          if (dHit || townships.length > 0) autoDistricts.add(d.id);
        }
      }
      if (sHit || districts.length > 0) {
        tree.push({ ...s, districts: sHit ? s.districts : districts });
        if (sHit) autoStates.add(s.id);
      }
    }
    return { tree, autoStates, autoDistricts };
  }, [q, locations]);

  const isStateOpen = (id: number) =>
    filtered.autoStates ? filtered.autoStates.has(id) : openStates.has(id);
  const isDistrictOpen = (id: number) =>
    filtered.autoDistricts ? filtered.autoDistricts.has(id) : openDistricts.has(id);

  return (
    <SidebarGroup
      label="Location"
      count={selected ? 1 : 0}
      action={
        selected ? (
          <button
            type="button"
            className="bsb-group-clear"
            onClick={() => apply({ location: "" })}
          >
            Reset
          </button>
        ) : null
      }
    >
      <div className="bsb-loc-search">
        <Search className="bsb-loc-search-icon" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search state, district, or township"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search location"
        />
        {q && (
          <button
            type="button"
            className="bsb-loc-search-clear"
            onClick={() => setQ("")}
            aria-label="Clear search"
          >
            <X className="icon-sm" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="bsb-tree">
        {filtered.tree.length === 0 && (
          <div className="bsb-empty">No matches for &ldquo;{q.trim()}&rdquo;</div>
        )}
        {filtered.tree.map((s) => {
          const sOpen = isStateOpen(s.id);
          const sOn = selected === s.name;
          const sSome =
            !sOn &&
            (s.districts.some((d) => selected === d.name) ||
              s.districts.some((d) => d.townships.some((t) => selected === t.name)));
          return (
            <Fragment key={s.id}>
              <div
                className={cn(
                  "bsb-tree-row depth-0",
                  sOn && "is-on",
                  sSome && "is-some",
                )}
              >
                <button
                  type="button"
                  className="bsb-tree-check"
                  onClick={() => pick(s.name)}
                  aria-pressed={sOn}
                >
                  <span className="bsb-tree-check-box" aria-hidden="true">
                    {sOn ? (
                      <Check className="icon-sm" />
                    ) : sSome ? (
                      <span className="bsb-tree-dash" />
                    ) : null}
                  </span>
                  <span className="bsb-tree-label">
                    <HiText text={s.name} q={q} />
                  </span>
                </button>
                <button
                  type="button"
                  className={cn("bsb-tree-chev", sOpen && "is-open")}
                  onClick={() => toggleState(s.id)}
                  aria-expanded={sOpen}
                  aria-label={sOpen ? "Collapse" : "Expand"}
                >
                  <ChevronDown className="icon-sm" />
                </button>
              </div>

              {sOpen && (
                <div className="bsb-tree-subs">
                  {s.districts.map((d) => {
                    const dOpen = isDistrictOpen(d.id);
                    const dOn = selected === d.name;
                    const dSome =
                      !dOn && d.townships.some((t) => selected === t.name);
                    return (
                      <Fragment key={d.id}>
                        <div
                          className={cn(
                            "bsb-tree-row depth-1",
                            dOn && "is-on",
                            dSome && "is-some",
                          )}
                        >
                          <button
                            type="button"
                            className="bsb-tree-check"
                            onClick={() => pick(d.name)}
                            aria-pressed={dOn}
                          >
                            <span className="bsb-tree-check-box" aria-hidden="true">
                              {dOn ? (
                                <Check className="icon-sm" />
                              ) : dSome ? (
                                <span className="bsb-tree-dash" />
                              ) : null}
                            </span>
                            <span className="bsb-tree-label">
                              <HiText text={d.name} q={q} />
                            </span>
                          </button>
                          <button
                            type="button"
                            className={cn("bsb-tree-chev", dOpen && "is-open")}
                            onClick={() => toggleDistrict(d.id)}
                            aria-expanded={dOpen}
                            aria-label={dOpen ? "Collapse" : "Expand"}
                          >
                            <ChevronDown className="icon-sm" />
                          </button>
                        </div>

                        {dOpen && (
                          <div className="bsb-tree-subs">
                            {d.townships.map((t) => {
                              const on = selected === t.name;
                              return (
                                <div
                                  key={t.id}
                                  className={cn("bsb-tree-row depth-2", on && "is-on")}
                                >
                                  <button
                                    type="button"
                                    className="bsb-tree-check"
                                    onClick={() => pick(t.name)}
                                    aria-pressed={on}
                                  >
                                    <span
                                      className="bsb-tree-check-box"
                                      aria-hidden="true"
                                    >
                                      {on && <Check className="icon-sm" />}
                                    </span>
                                    <span className="bsb-tree-label">
                                      <HiText text={t.name} q={q} />
                                    </span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </SidebarGroup>
  );
}

/* ── Main sidebar ───────────────────────────────────────────── */
export function BrowseSidebar({
  filters,
  categories,
  attachmentCategories,
  brands,
  locations,
  conditionTypes,
  total,
  open,
  onClose,
}: {
  filters: BrowseFilters;
  categories: Category[];
  attachmentCategories: Category[];
  brands: Brand[];
  locations: StateRegion[];
  conditionTypes: ConditionType[];
  /** Result count on the current page; omitted while listings stream. */
  total?: number;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const apply = (patch: Partial<BrowseFilters>) =>
    router.push(buildBrowseHref({ ...filters, ...patch, page: 1 }));

  const activeCount =
    (filters.category ? 1 : 0) +
    (filters.sub ? 1 : 0) +
    filters.brands.length +
    filters.conditions.length +
    (filters.location ? 1 : 0) +
    (filters.priceMin || filters.priceMax ? 1 : 0);

  const clearAll = () =>
    apply({
      category: "",
      sub: "",
      brands: [],
      conditions: [],
      location: "",
      priceMin: "",
      priceMax: "",
    });

  // Lock scroll + Escape-to-close while the bottom sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <>
      {open && (
        <button
          type="button"
          className="bsb-backdrop"
          aria-hidden="true"
          onClick={onClose}
        />
      )}
      <aside className={cn("bsb", open && "is-open")} aria-label="Filters">
        <header className="bsb-head">
          <h3 className="bsb-head-title">Filters</h3>
          {total != null && (
            <div className="bsb-head-meta">
              <span className="bsb-head-count">
                <span className="tnum">{total}</span> result{total === 1 ? "" : "s"}
              </span>
            </div>
          )}
          <button
            type="button"
            className="bsb-close"
            onClick={onClose}
            aria-label="Close filters"
          >
            <X />
          </button>
        </header>

        {activeCount > 0 && (
          <div className="bsb-active-bar">
            <span className="tnum">{activeCount}</span>
            <span> active filter{activeCount === 1 ? "" : "s"}</span>
            <button type="button" onClick={clearAll}>
              Clear all
            </button>
          </div>
        )}

        <CategoryGroup
          categories={categories}
          attachmentCategories={attachmentCategories}
          filters={filters}
          apply={apply}
        />
        <BrandGroup brands={brands} filters={filters} apply={apply} />
        <ConditionGroup
          filters={filters}
          apply={apply}
          conditionTypes={conditionTypes}
        />
        <PriceGroup filters={filters} apply={apply} />
        <LocationGroup locations={locations} filters={filters} apply={apply} />

        <footer className="bsb-foot">
          <button
            type="button"
            className="bsb-foot-clear"
            onClick={clearAll}
            disabled={activeCount === 0}
          >
            Clear all
          </button>
          <button type="button" className="bsb-foot-apply" onClick={onClose}>
            Show results
          </button>
        </footer>
      </aside>
    </>
  );
}
