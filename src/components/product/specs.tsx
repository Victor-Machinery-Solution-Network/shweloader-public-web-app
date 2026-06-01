import { ChevronDown } from "lucide-react";

import type { CustomField } from "@/lib/api/types";

export interface SpecsProps {
  fields: CustomField[];
}

/** How many spec rows show before the rest collapse behind "view full sheet". */
const PREVIEW_COUNT = 8;

/**
 * Specifications section built from the listing's customFields. The admin API
 * provides a flat list (no group metadata), so we render a single two-column
 * grid; the remainder collapses into the design's <details> sheet.
 */
export function Specs({ fields }: SpecsProps) {
  const rows = fields
    .map((f) => ({
      key: (f.label || f.key || "").trim(),
      value: (f.value ?? "").trim(),
    }))
    .filter((r) => r.key && r.value);

  if (rows.length === 0) return null;

  const preview = rows.slice(0, PREVIEW_COUNT);
  const rest = rows.slice(PREVIEW_COUNT);

  return (
    <section className="pdp-section" data-screen-label="Specifications">
      <h2 className="pdp-h2">Specifications</h2>

      <div className="pdp-spec-grid">
        {preview.map((r, i) => (
          <div key={i} className="spec-row">
            <span className="k">{r.key}</span>
            <span className="v">{r.value}</span>
          </div>
        ))}
      </div>

      {rest.length > 0 && (
        <details className="pdp-spec-all">
          <summary>
            View full specification sheet
            <ChevronDown className="icon-sm" aria-hidden="true" />
          </summary>
          <div className="pdp-spec-all-body">
            <div className="all-group">
              <div className="all-rows">
                {rest.map((r, i) => (
                  <div key={i} className="spec-row">
                    <span className="k">{r.key}</span>
                    <span className="v">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>
      )}
    </section>
  );
}
