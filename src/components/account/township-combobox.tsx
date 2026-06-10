"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import type { StateRegion } from "@/lib/api/types";

/** Fixed-position coords for the portaled popup so it escapes the auth modal's
 *  `overflow:hidden` clip. `bottom` set instead of `top` when flipped upward. */
interface PopCoords {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  listMaxH: number;
}

interface TownshipOption {
  id: number;
  /** "Township, District, State" — what the search input matches (current locale). */
  label: string;
  /** Latin label, always searchable so EN queries work even in MM mode. */
  labelEn: string;
  primary: string;
  secondary: string;
}

/**
 * Searchable township picker over the state→district→township tree from
 * getLocations(). Value is the numeric township_id the worker expects. Falls
 * back to `seedLabel` for the selected row's text if `locations` hasn't loaded.
 */
export function TownshipCombobox({
  label,
  locations,
  value,
  onChange,
  seedLabel,
}: {
  label: string;
  locations: StateRegion[];
  value: number | null;
  onChange: (id: number | null) => void;
  seedLabel?: string;
}) {
  const { locale } = useI18n();
  const my = locale === "my";

  const options = useMemo<TownshipOption[]>(
    () =>
      locations.flatMap((s) =>
        s.districts.flatMap((d) =>
          d.townships.map((t) => {
            const tn = my ? (t.nameMy ?? t.name) : t.name;
            const dn = my ? (d.nameMy ?? d.name) : d.name;
            const sn = my ? (s.nameMy ?? s.name) : s.name;
            return {
              id: t.id,
              label: `${tn}, ${dn}, ${sn}`,
              labelEn: `${t.name}, ${d.name}, ${s.name}`,
              primary: tn,
              secondary: `${dn} · ${sn}`,
            };
          }),
        ),
      ),
    [locations, my],
  );

  const selected = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value],
  );
  const selectedLabel = selected?.label ?? (value != null ? (seedLabel ?? "") : "");

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [coords, setCoords] = useState<PopCoords | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Position the (portaled, fixed) popup against the trigger; flip above when
  // there isn't room below, and cap the list height to the available space so
  // it never spills past the viewport — or the modal's clipped bottom edge.
  const place = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 6;
    const searchH = 58; // search row + popup padding
    const margin = 12; // breathing room from the viewport edge
    const below = window.innerHeight - r.bottom - gap - margin;
    const above = r.top - gap - margin;
    const flipUp = below < 220 && above > below;
    const avail = flipUp ? above : below;
    const listMaxH = Math.max(120, Math.min(280, avail - searchH));
    setCoords({
      left: r.left,
      width: r.width,
      top: flipUp ? undefined : r.bottom + gap,
      bottom: flipUp ? window.innerHeight - r.top + gap : undefined,
      listMaxH,
    });
  }, []);

  // While open, keep the popup glued to the trigger on scroll/resize.
  useEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    // capture:true catches scrolls in any ancestor (the modal's form column).
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.labelEn.toLowerCase().includes(q),
    );
  }, [options, query]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      // The popup is portaled to <body>, outside rootRef — so check both, or a
      // click inside the popup would be treated as "outside" and close it.
      if (
        rootRef.current &&
        !rootRef.current.contains(target) &&
        !popRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Focus the search box whenever the popup opens. Query/active are reset by
  // the open handler (not here) to avoid a setState-in-effect cascade.
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
    } else {
      setQuery("");
      setActive(0);
      setOpen(true);
    }
  };

  // Keep the active row scrolled into view.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (opt: TownshipOption) => {
    onChange(opt.id);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) choose(opt);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div
      className="pf-combo auth-field auth-float auth-float--select full"
      ref={rootRef}
    >
      <button
        type="button"
        className="pf-select pf-combo-trigger"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selectedLabel}
      </button>
      <ChevronDown className="pf-select-chev" strokeWidth={1.75} />
      <span className="auth-label">{label}</span>

      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popRef}
            className="pf-combo-pop pf-combo-pop--fixed"
            style={{
              position: "fixed",
              left: coords.left,
              width: coords.width,
              top: coords.top,
              bottom: coords.bottom,
            }}
          >
            <div className="pf-combo-search">
              <Search className="icon-sm" strokeWidth={1.75} />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={my ? "မြို့နယ် ရှာပါ…" : "Search township…"}
                aria-label={label}
              />
            </div>
            <ul
              className="pf-combo-list"
              role="listbox"
              ref={listRef}
              style={{ maxHeight: coords.listMaxH }}
            >
              {filtered.map((opt, i) => (
                <li
                  key={opt.id}
                  role="option"
                  aria-selected={opt.id === value}
                  className={
                    "pf-combo-opt" +
                    (i === active ? " is-active" : "") +
                    (opt.id === value ? " is-selected" : "")
                  }
                  onMouseEnter={() => setActive(i)}
                  // onMouseDown (not onClick) so the choice registers before the
                  // search input's blur closes the popup.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(opt);
                  }}
                >
                  <span className="pf-combo-opt-main">{opt.primary}</span>
                  <span className="pf-combo-opt-sub">{opt.secondary}</span>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="pf-combo-empty">
                  {my ? "ရှာမတွေ့ပါ" : "No matches"}
                </li>
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}
