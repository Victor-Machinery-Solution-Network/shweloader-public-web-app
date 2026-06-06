"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import type { StateRegion } from "@/lib/api/types";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

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
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
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

      {open && (
        <div className="pf-combo-pop">
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
          <ul className="pf-combo-list" role="listbox" ref={listRef}>
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
        </div>
      )}
    </div>
  );
}
