"use client";

import { useEffect, useState } from "react";
import { CATALOG, MONTH_GROUPS } from "@/src/lib/reports/template";
import { pubKey, type InventoryGrid } from "@/src/features/inventory/store";
import type { Quantity } from "@/src/lib/domain/movement";

/**
 * Cross-cycle carry-forward.
 *
 * A blank Originally on Hand inherits the publication's last counted stock
 * from the previous report (walking further back while reports are blank).
 * Explicitly typed values always win, and carried values are NEVER written
 * into storage — they stay derived, so correcting an old report
 * automatically updates the next one.
 */

const MAX_STEPS = 40;

export function parseCycleId(id: string): { year: number; half: "mar-aug" | "sep-feb" } | null {
  const m = /^(\d{4})-(mar-aug|sep-feb)$/.exec(id);
  if (!m) return null;
  return { year: Number(m[1]), half: m[2] as "mar-aug" | "sep-feb" };
}

export function previousCycleId(cycleId: string): string | null {
  const p = parseCycleId(cycleId);
  if (!p) return null;
  if (p.half === "mar-aug") {
    if (p.year <= 2024) return null; // Mar 2024 is the first report; nothing before it.
    return `${p.year - 1}-sep-feb`;
  }
  return `${p.year}-mar-aug`;
}

export function labelFromId(cycleId: string): string {
  const p = parseCycleId(cycleId);
  if (!p) return cycleId;
  return p.half === "mar-aug" ? `Mar – Aug ${p.year}` : `Sep ${p.year} – Feb ${p.year + 1}`;
}

/** Last counted physical stock per publication (scans Feb/Aug back to Sep/Mar). */
export function closingCounts(grid: InventoryGrid): Record<string, Quantity> {
  const out: Record<string, Quantity> = {};
  for (const r of CATALOG) {
    const key = pubKey(r.section, r.itemNo, r.name);
    for (let mi = MONTH_GROUPS.length - 1; mi >= 0; mi--) {
      const v = grid.months[key]?.[MONTH_GROUPS[mi]]?.onHand ?? null;
      if (v !== null) {
        out[key] = v;
        break;
      }
    }
  }
  return out;
}

export interface CarriedOriginals {
  values: Record<string, Quantity>;
  sources: Record<string, string>;
}

export function carriedOriginals(
  load: (cycleId: string) => InventoryGrid | null,
  cycleId: string,
): CarriedOriginals {
  const values: Record<string, Quantity> = {};
  const sources: Record<string, string> = {};
  const pending = new Set(CATALOG.map((r) => pubKey(r.section, r.itemNo, r.name)));
  let prev = previousCycleId(cycleId);
  for (let step = 0; step < MAX_STEPS && prev && pending.size > 0; step++) {
    const grid = load(prev);
    if (grid) {
      const closing = closingCounts(grid);
      for (const key of [...pending]) {
        if (closing[key] !== undefined && closing[key] !== null) {
          values[key] = closing[key];
          sources[key] = prev;
          pending.delete(key);
        }
      }
    }
    prev = previousCycleId(prev);
  }
  return { values, sources };
}

function loadGrid(cycleId: string, lang: string): InventoryGrid | null {
  try {
    const raw = window.localStorage.getItem(`litinv:grid:${cycleId}:${lang}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InventoryGrid;
    if (!parsed || typeof parsed !== "object" || !parsed.months || !parsed.original) return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface CarriedState extends CarriedOriginals {
  /** Nearest previous report that contributed at least one value. */
  sourceLabel: string | null;
  ready: boolean;
}

/** Derived (never stored) originals for the given cycle/language. */
export function useCarriedOriginals(cycleId: string, lang: string): CarriedState {
  const [state, setState] = useState<CarriedState>({ values: {}, sources: {}, sourceLabel: null, ready: false });

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const carried = carriedOriginals((id) => loadGrid(id, lang), cycleId);
      const firstSource = Object.values(carried.sources).sort()[0] ?? null;
      setState({
        ...carried,
        sourceLabel: firstSource ? labelFromId(firstSource) : null,
        ready: true,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [cycleId, lang]);

  return state;
}

/** Explicit value wins; otherwise the carried value; otherwise blank. */
export function effectiveOriginal(
  explicit: Quantity,
  key: string,
  carried: Record<string, Quantity>,
): Quantity {
  if (explicit !== null && explicit !== undefined) return explicit;
  return carried[key] ?? null;
}
