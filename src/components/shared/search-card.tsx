"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
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
interface CatSub {
  /** English name — the identity threaded into /browse (never translated). */
  name: string;
  nameMy: string | null;
}
interface CatNode {
  id: string;
  /** English name — used as the value/identity everywhere; display is `labelMy`. */
  label: string;
  labelMy: string | null;
  subs: CatSub[];
}

function buildCategoryTree(
  categories: Category[],
  attachmentCategories: Category[],
): CatNode[] {
  const fromCategory = (prefix: string) => (c: Category): CatNode => ({
    id: `${prefix}-${c.id}`,
    label: c.name,
    labelMy: c.nameMy,
    subs: c.subCategories.map((s) => ({ name: s.name, nameMy: s.nameMy })),
  });
  return [
    { id: "all", label: ALL_CATEGORIES, labelMy: null, subs: [] },
    ...categories.map(fromCategory("c")),
    ...attachmentCategories.map(fromCategory("a")),
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
  /** Parent category name when `commit` is a sub-category; undefined for a top-level category. */
  parent?: string;
}

function CategoryPicker({
  tree,
  value,
  onChange,
  label,
}: {
  tree: CatNode[];
  value: string;
  onChange: (v: string, parent?: string) => void;
  label: string;
}) {
  const { t, locale } = useI18n();
  const my = locale === "my";
  // English name stays the value/identity; Burmese is display-only.
  const disp = (name: string, nameMy?: string | null) =>
    my && nameMy ? nameMy : name;
  const [open, setOpen] = useState(false);
  const [hoverId, setHoverId] = useState(tree[0]?.id ?? "all");
  const [isModal, setIsModal] = useState(false);
  const [q, setQ] = useState("");
  // Measured width of the Category cell, so the dropdown's left rail can match
  // it exactly (and stay put when the right rail appears). Updated on resize.
  const [cellW, setCellW] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Track the Category cell's width and expose it to the menu as --cat-cell-w.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setCellW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // When the inline (desktop) dropdown opens, scroll it fully into view if it
  // would be clipped below the fold — without pushing the search bar off-screen.
  useEffect(() => {
    if (!open || isModal) return;
    const raf = requestAnimationFrame(() => {
      const el = menuRef.current;
      if (!el) return;
      const margin = 16;
      const rect = el.getBoundingClientRect();
      const overflowBottom = rect.bottom - (window.innerHeight - margin);
      if (overflowBottom <= 0) return; // already fully visible
      // Don't scroll so far that the dropdown's top leaves the viewport.
      const top = Math.min(overflowBottom, Math.max(0, rect.top - margin));
      if (top <= 0) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollBy({ top, behavior: reduce ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, isModal]);

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
    const owner = tree.find(
      (c) => c.label === value || c.subs.some((s) => s.name === value),
    );
    if (owner) setHoverId(owner.id);
  }, [open, value, tree]);

  // Resolve the current (English) value to its display label for the trigger.
  const valueDisplay = useMemo(() => {
    if (value === ALL_CATEGORIES) return t("search.allCategories");
    for (const c of tree) {
      if (c.label === value) return disp(c.label, c.labelMy);
      const sub = c.subs.find((s) => s.name === value);
      if (sub) return disp(sub.name, sub.nameMy);
    }
    return value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, tree, my, t]);

  const pick = useCallback(
    (label: string, parent?: string) => {
      onChange(label, parent);
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
    const hit = (name: string, nameMy?: string | null) =>
      name.toLowerCase().includes(needle) ||
      (nameMy ? nameMy.toLowerCase().includes(needle) : false);
    for (const c of tree) {
      if (hit(c.label, c.labelMy)) {
        out.push({ label: disp(c.label, c.labelMy), hint: t("search.category"), commit: c.label });
      }
      for (const s of c.subs) {
        if (hit(s.name, s.nameMy)) {
          out.push({
            label: disp(s.name, s.nameMy),
            hint: disp(c.label, c.labelMy),
            commit: s.name,
            parent: c.label,
          });
        }
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tree, my, t]);

  const menu = (
    <div
      ref={menuRef}
      className={cn(
        "cat-menu",
        hovered.subs.length === 0 && "is-single",
        isModal && "is-modal-body",
      )}
      style={
        cellW != null
          ? ({ "--cat-cell-w": `${cellW}px` } as CSSProperties)
          : undefined
      }
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
                if (c.subs.length === 0) {
                  pick(c.label);
                } else {
                  // Select the whole category right away (so "Search" filters by
                  // it) while keeping the menu open to optionally refine to a sub.
                  setHoverId(c.id);
                  onChange(c.label);
                }
              }}
            >
              <span>{c.id === "all" ? t("search.allCategories") : disp(c.label, c.labelMy)}</span>
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
              <span>
                {my
                  ? `${disp(hovered.label, hovered.labelMy)} အားလုံး`
                  : `All ${hovered.label.toLowerCase()}`}
              </span>
              {hovered.label === value && (
                <Check className="icon-sm cat-opt-check" aria-hidden="true" />
              )}
            </button>
          </li>
          {hovered.subs.map((s) => (
            <li key={s.name}>
              <button
                type="button"
                className={cn("cat-opt", s.name === value && "is-active")}
                onClick={() => pick(s.name, hovered.label)}
              >
                <span>{disp(s.name, s.nameMy)}</span>
                {s.name === value && (
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
        <span className="cat-trigger-val">{valueDisplay}</span>
        <ChevronDown className="icon-sm cat-trigger-chev" aria-hidden="true" />
      </button>

      {open && !isModal && menu}
      {open && isModal && (
        <div
          className="cat-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t("search.chooseCategory")}
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
                <div className="cat-modal-eyebrow">{t("search.chooseCategory")}</div>
                <h3 className="cat-modal-title">{t("search.lookingFor")}</h3>
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
                placeholder={t("search.searchCategories")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label={t("search.searchCategories")}
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
                  <div className="cat-modal-empty">{t("search.noCategoryMatch")} &ldquo;{q}&rdquo;</div>
                ) : (
                  searchResults.map((r, i) => (
                    <button
                      key={`${r.commit}-${i}`}
                      type="button"
                      className="cat-modal-result"
                      onClick={() => pick(r.commit, r.parent)}
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
 * 3-layer location picker (state → district → township) in a modal.
 * Names render in the active locale only; search still matches EN + Burmese.
 * ------------------------------------------------------------------ */
interface LocSearchResult {
  id: string;
  label: string;
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
  const { t, locale } = useI18n();
  // Show location names in the active language only — never EN + Burmese together.
  const my = locale === "my";
  const locName = (n: { name: string; nameMy: string | null }) =>
    my ? (n.nameMy ?? n.name) : n.name;
  // Value/commit is the English name; resolve it to a display label for the
  // collapsed trigger (same pattern as the category picker).
  const valueDisplay = useMemo(() => {
    if (value === ALL_MYANMAR) return t("search.allMyanmar");
    for (const s of locations) {
      if (s.name === value) return locName(s);
      for (const d of s.districts) {
        if (d.name === value) return locName(d);
        for (const tw of d.townships) if (tw.name === value) return locName(tw);
      }
    }
    return value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, locations, my, t]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hoverStateId, setHoverStateId] = useState<number | null>(
    locations[0]?.id ?? null,
  );
  const [hoverDistrictId, setHoverDistrictId] = useState<number | null>(
    locations[0]?.districts[0]?.id ?? null,
  );
  const [level, setLevel] = useState<LocLevel>("states");
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Autofocus the search on desktop only — on mobile/tablet this pops the soft
  // keyboard the moment the modal opens, hiding the results behind it.
  useEffect(() => {
    if (!open) return;
    if (window.matchMedia("(max-width: 1024px)").matches) return;
    searchInputRef.current?.focus();
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
          label: locName(s),
          hint: t("search.stateRegionHint"),
          commit: s.name,
        });
      }
      for (const d of s.districts) {
        if (matches(d.name, d.nameMy)) {
          out.push({
            id: `d:${d.id}`,
            label: locName(d),
            hint: locName(s),
            commit: d.name,
          });
        }
        for (const t of d.townships) {
          if (matches(t.name, t.nameMy)) {
            out.push({
              id: `t:${t.id}`,
              label: locName(t),
              hint: `${locName(d)} · ${locName(s)}`,
              commit: t.name,
            });
          }
        }
      }
    }
    return out.slice(0, 40);
  }, [q, locations, t]);

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
          <span className="cat-trigger-val">{valueDisplay}</span>
          <ChevronDown className="icon-sm cat-trigger-chev" aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div
          className="loc-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t("search.chooseLocation")}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className={cn("loc-modal", `lvl-${level}`)}>
            <header className="loc-modal-head">
              <div>
                <div className="loc-modal-eyebrow">{t("search.chooseLocation")}</div>
                <h3 className="loc-modal-title">{t("search.whereLooking")}</h3>
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
                ref={searchInputRef}
                type="text"
                placeholder={t("search.searchLocation")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label={t("search.searchLocation")}
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
                    {t("search.noLocations")} &ldquo;{q}&rdquo;
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
                      <span className="loc-modal-result-l">{r.label}</span>
                      <span className="loc-modal-result-h">{r.hint}</span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <>
                <div className="loc-modal-popular">
                  <div className="loc-modal-popular-h">{t("search.popular")}</div>
                  <div className="loc-modal-popular-row">
                    <button
                      type="button"
                      className={cn(
                        "loc-modal-chip",
                        value === ALL_MYANMAR && "is-on",
                      )}
                      onClick={() => pick(ALL_MYANMAR)}
                    >
                      {t("search.allMyanmar")}
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
                        {locName(s)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="loc-modal-cascade">
                  <div className="loc-modal-col loc-col-states">
                    <div className="loc-modal-col-h">{t("search.statesRegions")}</div>
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
                            <span>{locName(s)}</span>
                            <ChevronRight className="icon-sm" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="loc-modal-col loc-col-districts">
                    <div className="loc-modal-col-h">{t("search.districts")}</div>
                    <ul>
                      {stateObj && (
                        <li>
                          <button
                            type="button"
                            className={cn(
                              "loc-modal-row is-shortcut",
                              value === stateObj.name && "is-active",
                            )}
                            onClick={() => pick(stateObj.name)}
                          >
                            <span>
                              {my
                                ? `${locName(stateObj)} တစ်ခုလုံး`
                                : `All ${stateObj.name.toLowerCase()}`}
                            </span>
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
                            <span>{locName(d)}</span>
                            <ChevronRight className="icon-sm" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="loc-modal-col loc-col-townships">
                    <div className="loc-modal-col-h">{t("search.townships")}</div>
                    <ul>
                      {districtObj?.townships.map((t) => {
                        // Emit the plain township name — Browse's findLocation
                        // matches one level by name and can't parse "Twp, State".
                        const commit = t.name;
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
                              <span>{locName(t)}</span>
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
                    {level === "townships"
                      ? t("search.backToDistricts")
                      : t("search.backToStates")}
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
  // Parent category name when `cat` is a sub-category; null for a top-level category.
  const [catParent, setCatParent] = useState<string | null>(null);
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
      if (cat && cat !== ALL_CATEGORIES) {
        // A sub-category must carry its parent so /browse can resolve it to a
        // sub_category_id (category=<parent>&sub=<name>); a top-level category
        // goes straight into category=<name>.
        if (catParent) {
          params.set("category", catParent);
          params.set("sub", cat);
        } else {
          params.set("category", cat);
        }
      }
      if (city && city !== ALL_MYANMAR) params.set("location", city);
      router.push(`/browse?${params.toString()}`);
    },
    [router, mode, q, cat, catParent, city],
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
        label={t("search.lookingFor")}
      />
      <CategoryPicker
        tree={tree}
        value={cat}
        onChange={(v, parent) => {
          setCat(v);
          setCatParent(parent ?? null);
        }}
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
