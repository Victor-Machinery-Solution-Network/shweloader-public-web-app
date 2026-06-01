"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  MapPin,
  Search,
  X,
} from "lucide-react";
import type { Category, StateRegion } from "@/lib/api/types";
import { useI18n } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

const ALL_CATEGORIES = "All categories";
const ALL_MYANMAR = "All Myanmar";

/* ------------------------------------------------------------------ *
 * Category tree — built from the real taxonomy. Equipment categories
 * expose their sub-categories (2-level drill-in); attachment categories
 * are appended as additional top-level groups so the buyer can pick an
 * attachment type the same way.
 * ------------------------------------------------------------------ */
interface CatNode {
  id: string;
  label: string;
  subs: string[];
}

function buildCategoryTree(
  categories: Category[],
  attachmentCategories: Category[],
): CatNode[] {
  const fromCategory = (c: Category): CatNode => ({
    id: `c-${c.id}`,
    label: c.name,
    subs: c.subCategories.map((s) => s.name),
  });
  return [
    { id: "all", label: ALL_CATEGORIES, subs: [] },
    ...categories.map(fromCategory),
    ...attachmentCategories.map((c) => ({
      id: `a-${c.id}`,
      label: c.name,
      subs: c.subCategories.map((s) => s.name),
    })),
  ];
}

/* ------------------------------------------------------------------ *
 * Animated rotating placeholder (typewriter feel). Fades a sample
 * search in/out while the input is empty + unfocused + in viewport.
 * ------------------------------------------------------------------ */
const TYPE_SAMPLES = [
  "Komatsu WA380, 6,000 hrs",
  "CAT 320 excavator",
  "Hitachi ZX200 for sale",
  "Dump trucks in Yangon",
  "SANY crane, Mandalay",
  "JCB backhoe under 50L",
];

function useTypewriterPlaceholder(
  isFocused: boolean,
  hasValue: boolean,
  ref: React.RefObject<HTMLDivElement | null>,
): { text: string; phase: "in" | "out" } {
  const [text, setText] = useState(TYPE_SAMPLES[0]);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [visible, setVisible] = useState(true);

  // Pause when scrolled out of view.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => setVisible(entries[0]?.isIntersecting ?? true),
      { threshold: 0.01 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);

  // Fade in → hold → fade out → swap word → repeat.
  useEffect(() => {
    if (isFocused || hasValue || !visible) return;
    let i = TYPE_SAMPLES.indexOf(text);
    if (i < 0) i = 0;
    setPhase("in");
    const holdMs = 2400;
    const fadeMs = 320;
    const t1 = setTimeout(() => setPhase("out"), holdMs);
    const t2 = setTimeout(() => {
      i = (i + 1) % TYPE_SAMPLES.length;
      setText(TYPE_SAMPLES[i]);
      setPhase("in");
    }, holdMs + fadeMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [text, isFocused, hasValue, visible]);

  return { text, phase };
}

function SearchKeywordInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { text, phase } = useTypewriterPlaceholder(focused, !!value, wrapRef);
  const showPlaceholder = !value && !focused;

  return (
    <div className="search-cell search-cell-kw">
      <span className="lbl">{label}</span>
      <div className="search-kw-wrap" ref={wrapRef}>
        <input
          className="search-kw-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label={label}
        />
        {showPlaceholder && (
          <span className={cn("search-kw-ghost", `is-${phase}`)} aria-hidden="true">
            {text}
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 2-level category picker. Inline mega-menu ≥1024px, modal below.
 * ------------------------------------------------------------------ */
interface CatSearchResult {
  label: string;
  hint: string;
  commit: string;
}

function CategoryPicker({
  tree,
  value,
  onChange,
  label,
}: {
  tree: CatNode[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [hoverId, setHoverId] = useState(tree[0]?.id ?? "all");
  const [isModal, setIsModal] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  // Under lg (1024px) switch to a popup modal like the location picker.
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1024px)");
    const onMql = (e: MediaQueryListEvent | MediaQueryList) => setIsModal(e.matches);
    onMql(mql);
    mql.addEventListener("change", onMql);
    return () => mql.removeEventListener("change", onMql);
  }, []);

  // Outside-click / Escape / scroll-lock when modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    let onDoc: ((e: MouseEvent) => void) | undefined;
    let prevOverflow = "";
    if (isModal) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else {
      onDoc = (e: MouseEvent) => {
        if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", onDoc);
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      if (onDoc) document.removeEventListener("mousedown", onDoc);
      if (isModal) document.body.style.overflow = prevOverflow;
    };
  }, [open, isModal]);

  // Default hover to the group owning the current value when opening.
  useEffect(() => {
    if (!open) return;
    if (value === ALL_CATEGORIES) {
      setHoverId("all");
      return;
    }
    const owner = tree.find((c) => c.label === value || c.subs.includes(value));
    if (owner) setHoverId(owner.id);
  }, [open, value, tree]);

  const pick = useCallback(
    (label: string) => {
      onChange(label);
      setOpen(false);
      setQ("");
    },
    [onChange],
  );

  const hovered = tree.find((c) => c.id === hoverId) ?? tree[0];

  const searchResults = useMemo<CatSearchResult[] | null>(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return null;
    const out: CatSearchResult[] = [];
    for (const c of tree) {
      if (c.label.toLowerCase().includes(needle)) {
        out.push({ label: c.label, hint: "Category", commit: c.label });
      }
      for (const s of c.subs) {
        if (s.toLowerCase().includes(needle)) {
          out.push({ label: s, hint: c.label, commit: s });
        }
      }
    }
    return out;
  }, [q, tree]);

  const menu = (
    <div
      className={cn(
        "cat-menu",
        hovered.subs.length === 0 && "is-single",
        isModal && "is-modal-body",
      )}
      role="menu"
    >
      <ul className="cat-col cat-col-l">
        {tree.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={cn(
                "cat-opt",
                c.id === hoverId && "is-hover",
                c.label === value && "is-active",
              )}
              onMouseEnter={() => setHoverId(c.id)}
              onFocus={() => setHoverId(c.id)}
              onClick={() => {
                if (c.subs.length === 0) pick(c.label);
                else setHoverId(c.id);
              }}
            >
              <span>{c.label}</span>
              {c.subs.length > 0 && (
                <ChevronRight className="icon-sm cat-opt-chev" aria-hidden="true" />
              )}
              {c.subs.length === 0 && c.label === value && (
                <Check className="icon-sm cat-opt-check" aria-hidden="true" />
              )}
            </button>
          </li>
        ))}
      </ul>
      {hovered.subs.length > 0 && (
        <ul className="cat-col cat-col-r">
          <li>
            <button
              type="button"
              className={cn("cat-opt", hovered.label === value && "is-active")}
              onClick={() => pick(hovered.label)}
            >
              <span>All {hovered.label.toLowerCase()}</span>
              {hovered.label === value && (
                <Check className="icon-sm cat-opt-check" aria-hidden="true" />
              )}
            </button>
          </li>
          {hovered.subs.map((s) => (
            <li key={s}>
              <button
                type="button"
                className={cn("cat-opt", s === value && "is-active")}
                onClick={() => pick(s)}
              >
                <span>{s}</span>
                {s === value && (
                  <Check className="icon-sm cat-opt-check" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="search-cell cat-picker" ref={wrapRef}>
      <span className="lbl">{label}</span>
      <button
        type="button"
        className={cn("cat-trigger", open && "is-open")}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup={isModal ? "dialog" : "true"}
        aria-expanded={open}
      >
        <span className="cat-trigger-val">{value}</span>
        <ChevronDown className="icon-sm cat-trigger-chev" aria-hidden="true" />
      </button>

      {open && !isModal && menu}
      {open && isModal && (
        <div
          className="cat-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Choose category"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setOpen(false);
              setQ("");
            }
          }}
        >
          <div className="cat-modal">
            <header className="cat-modal-head">
              <div>
                <div className="cat-modal-eyebrow">Choose category</div>
                <h3 className="cat-modal-title">What are you looking for?</h3>
              </div>
              <button
                type="button"
                className="cat-modal-close"
                onClick={() => {
                  setOpen(false);
                  setQ("");
                }}
                aria-label="Close"
              >
                <X aria-hidden="true" />
              </button>
            </header>
            <div className="cat-modal-search">
              <Search className="cat-modal-search-icon" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search categories and subcategories"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search categories and subcategories"
              />
              {q && (
                <button
                  type="button"
                  className="cat-modal-search-clear"
                  onClick={() => setQ("")}
                  aria-label="Clear"
                >
                  <X className="icon-sm" aria-hidden="true" />
                </button>
              )}
            </div>
            {searchResults ? (
              <div className="cat-modal-results">
                {searchResults.length === 0 ? (
                  <div className="cat-modal-empty">No categories match &ldquo;{q}&rdquo;</div>
                ) : (
                  searchResults.map((r, i) => (
                    <button
                      key={`${r.commit}-${i}`}
                      type="button"
                      className="cat-modal-result"
                      onClick={() => pick(r.commit)}
                    >
                      <Search className="icon-sm" aria-hidden="true" />
                      <span className="cat-modal-result-l">{r.label}</span>
                      <span className="cat-modal-result-h">{r.hint}</span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              menu
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 3-layer location picker (state → district → township) in a modal,
 * with EN + Burmese (nameMy) labels and live search.
 * ------------------------------------------------------------------ */
interface LocSearchResult {
  id: string;
  label: string;
  sub: string | null;
  hint: string;
  commit: string;
}

type LocLevel = "states" | "districts" | "townships";

function LocationPicker({
  locations,
  value,
  onChange,
  label,
}: {
  locations: StateRegion[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hoverStateId, setHoverStateId] = useState<number | null>(
    locations[0]?.id ?? null,
  );
  const [hoverDistrictId, setHoverDistrictId] = useState<number | null>(
    locations[0]?.districts[0]?.id ?? null,
  );
  const [level, setLevel] = useState<LocLevel>("states");

  // Scroll-lock + Escape to close.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setLevel("states");
  }, []);

  const pick = useCallback(
    (label: string) => {
      onChange(label);
      close();
    },
    [onChange, close],
  );

  const stateObj =
    locations.find((s) => s.id === hoverStateId) ?? locations[0] ?? null;
  const districtObj =
    stateObj?.districts.find((d) => d.id === hoverDistrictId) ??
    stateObj?.districts[0] ??
    null;

  // Live search — flat "Township, State" matches across the tree.
  const searchResults = useMemo<LocSearchResult[] | null>(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return null;
    const matches = (name: string, nameMy: string | null) =>
      name.toLowerCase().includes(needle) ||
      (nameMy ? nameMy.toLowerCase().includes(needle) : false);
    const out: LocSearchResult[] = [];
    for (const s of locations) {
      if (matches(s.name, s.nameMy)) {
        out.push({
          id: `state:${s.id}`,
          label: s.name,
          sub: s.nameMy,
          hint: "State / Region",
          commit: s.name,
        });
      }
      for (const d of s.districts) {
        if (matches(d.name, d.nameMy)) {
          out.push({
            id: `d:${d.id}`,
            label: d.name,
            sub: d.nameMy,
            hint: s.name,
            commit: d.name,
          });
        }
        for (const t of d.townships) {
          if (matches(t.name, t.nameMy)) {
            out.push({
              id: `t:${t.id}`,
              label: t.name,
              sub: t.nameMy,
              hint: `${d.name} · ${s.name}`,
              commit: `${t.name}, ${s.name}`,
            });
          }
        }
      }
    }
    return out.slice(0, 40);
  }, [q, locations]);

  return (
    <>
      <div className="search-cell loc-trigger-cell">
        <span className="lbl">{label}</span>
        <button
          type="button"
          className={cn("cat-trigger", open && "is-open")}
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className="cat-trigger-val">{value}</span>
          <ChevronDown className="icon-sm cat-trigger-chev" aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div
          className="loc-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Choose location"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className={cn("loc-modal", `lvl-${level}`)}>
            <header className="loc-modal-head">
              <div>
                <div className="loc-modal-eyebrow">Choose location</div>
                <h3 className="loc-modal-title">Where are you looking?</h3>
              </div>
              <button
                type="button"
                className="loc-modal-close"
                onClick={close}
                aria-label="Close"
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <div className="loc-modal-search">
              <Search className="loc-modal-search-icon" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search state, district, or township"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search state, district, or township"
                autoFocus
              />
              {q && (
                <button
                  type="button"
                  className="loc-modal-search-clear"
                  onClick={() => setQ("")}
                  aria-label="Clear"
                >
                  <X className="icon-sm" aria-hidden="true" />
                </button>
              )}
            </div>

            {searchResults ? (
              <div className="loc-modal-results">
                {searchResults.length === 0 ? (
                  <div className="loc-modal-empty">
                    No locations match &ldquo;{q}&rdquo;
                  </div>
                ) : (
                  searchResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="loc-modal-result"
                      onClick={() => pick(r.commit)}
                    >
                      <MapPin className="icon-sm" aria-hidden="true" />
                      <span className="loc-modal-result-l">
                        {r.label}
                        {r.sub && (
                          <span className="loc-name-my"> {r.sub}</span>
                        )}
                      </span>
                      <span className="loc-modal-result-h">{r.hint}</span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <>
                <div className="loc-modal-popular">
                  <div className="loc-modal-popular-h">Popular</div>
                  <div className="loc-modal-popular-row">
                    <button
                      type="button"
                      className={cn(
                        "loc-modal-chip",
                        value === ALL_MYANMAR && "is-on",
                      )}
                      onClick={() => pick(ALL_MYANMAR)}
                    >
                      {ALL_MYANMAR}
                    </button>
                    {locations.slice(0, 4).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={cn(
                          "loc-modal-chip",
                          value === s.name && "is-on",
                        )}
                        onClick={() => pick(s.name)}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="loc-modal-cascade">
                  <div className="loc-modal-col loc-col-states">
                    <div className="loc-modal-col-h">States &amp; Regions</div>
                    <ul>
                      {locations.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            className={cn(
                              "loc-modal-row",
                              hoverStateId === s.id && "is-hover",
                              value === s.name && "is-active",
                            )}
                            onMouseEnter={() => {
                              setHoverStateId(s.id);
                              setHoverDistrictId(s.districts[0]?.id ?? null);
                            }}
                            onClick={() => {
                              setHoverStateId(s.id);
                              setHoverDistrictId(s.districts[0]?.id ?? null);
                              setLevel("districts");
                            }}
                          >
                            <span>
                              {s.name}
                              {s.nameMy && (
                                <span className="loc-name-my"> {s.nameMy}</span>
                              )}
                            </span>
                            <ChevronRight className="icon-sm" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="loc-modal-col loc-col-districts">
                    <div className="loc-modal-col-h">Districts</div>
                    <ul>
                      {stateObj && (
                        <li>
                          <button
                            type="button"
                            className={cn(
                              "loc-modal-row is-shortcut",
                              value === `All ${stateObj.name}` && "is-active",
                            )}
                            onClick={() => pick(`All ${stateObj.name}`)}
                          >
                            <span>All {stateObj.name.toLowerCase()}</span>
                          </button>
                        </li>
                      )}
                      {stateObj?.districts.map((d) => (
                        <li key={d.id}>
                          <button
                            type="button"
                            className={cn(
                              "loc-modal-row",
                              hoverDistrictId === d.id && "is-hover",
                              value === d.name && "is-active",
                            )}
                            onMouseEnter={() => setHoverDistrictId(d.id)}
                            onClick={() => {
                              setHoverDistrictId(d.id);
                              setLevel("townships");
                            }}
                          >
                            <span>
                              {d.name}
                              {d.nameMy && (
                                <span className="loc-name-my"> {d.nameMy}</span>
                              )}
                            </span>
                            <ChevronRight className="icon-sm" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="loc-modal-col loc-col-townships">
                    <div className="loc-modal-col-h">Townships</div>
                    <ul>
                      {districtObj?.townships.map((t) => {
                        const commit = stateObj
                          ? `${t.name}, ${stateObj.name}`
                          : t.name;
                        return (
                          <li key={t.id}>
                            <button
                              type="button"
                              className={cn(
                                "loc-modal-row",
                                value === commit && "is-active",
                              )}
                              onClick={() => pick(commit)}
                            >
                              <span>
                                {t.name}
                                {t.nameMy && (
                                  <span className="loc-name-my"> {t.nameMy}</span>
                                )}
                              </span>
                              {value === commit && (
                                <Check className="icon-sm" aria-hidden="true" />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </>
            )}

            {!searchResults && level !== "states" && (
              <footer className="loc-modal-foot">
                <button
                  type="button"
                  className="loc-modal-foot-back"
                  onClick={() =>
                    setLevel(level === "townships" ? "districts" : "states")
                  }
                >
                  <ArrowRight
                    className="icon-sm"
                    style={{ transform: "rotate(180deg)" }}
                    aria-hidden="true"
                  />
                  <span>
                    Back to{" "}
                    {level === "townships" ? "districts" : "states & regions"}
                  </span>
                </button>
              </footer>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * SearchCard — Buy/Rent pill + keyword + category + location + Search.
 * Submits to /browse with mode/q/category/location params.
 * ------------------------------------------------------------------ */
export interface SearchCardProps {
  categories: Category[];
  attachmentCategories: Category[];
  locations: StateRegion[];
}

export function SearchCard({
  categories,
  attachmentCategories,
  locations,
}: SearchCardProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [mode, setMode] = useState<"buy" | "rent">("buy");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(ALL_CATEGORIES);
  const [city, setCity] = useState(ALL_MYANMAR);

  const tree = useMemo(
    () => buildCategoryTree(categories, attachmentCategories),
    [categories, attachmentCategories],
  );

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const params = new URLSearchParams({ mode });
      const trimmed = q.trim();
      if (trimmed) params.set("q", trimmed);
      if (cat && cat !== ALL_CATEGORIES) params.set("category", cat);
      if (city && city !== ALL_MYANMAR) params.set("location", city);
      router.push(`/browse?${params.toString()}`);
    },
    [router, mode, q, cat, city],
  );

  return (
    <form className="search-card" onSubmit={handleSubmit}>
      <div className="search-mode">
        <span className={cn("search-mode-glide", mode)} aria-hidden="true" />
        <button
          type="button"
          className={cn(mode === "buy" && "is-active")}
          onClick={() => setMode("buy")}
          aria-pressed={mode === "buy"}
        >
          {t("search.buy")}
        </button>
        <button
          type="button"
          className={cn(mode === "rent" && "is-active")}
          onClick={() => setMode("rent")}
          aria-pressed={mode === "rent"}
        >
          {t("search.rent")}
        </button>
      </div>

      <SearchKeywordInput
        value={q}
        onChange={setQ}
        label="What are you looking for?"
      />
      <CategoryPicker
        tree={tree}
        value={cat}
        onChange={setCat}
        label={t("search.category")}
      />
      <LocationPicker
        locations={locations}
        value={city}
        onChange={setCity}
        label={t("search.location")}
      />

      <button type="submit" className="search-go">
        <Search className="icon-sm" aria-hidden="true" />
        {t("actions.search")}
      </button>
    </form>
  );
}
