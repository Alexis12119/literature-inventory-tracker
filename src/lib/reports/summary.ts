import { MONTH_GROUPS, type MonthGroup } from "@/src/lib/reports/template";
import { calculateMoved, type Quantity } from "@/src/lib/domain/movement";
import type { GridRow, InventoryGrid } from "@/src/features/inventory/store";

/**
 * Congregation Literature summary report (JW Hub style) — a separate report
 * type from the six-month tracker. Fixed three columns:
 * Item | Current Quantity on Hand | Average Monthly Movement.
 *
 * Items come from the live catalog (same rows as the workspace), grouped by
 * their current sections — never a hardcoded list — so the summary stays in
 * sync with catalog edits. Displayed as `(code) name`, or plain name when a
 * row has no code.
 */

export interface SummaryItem {
  key: string;
  code: string | null;
  name: string;
  onHand: Quantity;
  avgMoved: number | null;
}

export interface SummarySection {
  section: string;
  items: SummaryItem[];
}

const HISTORY_MONTHS = 3;

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Resolve one reporting month from live catalog rows: current count plus
 * the trailing average movement (up to 3 counted months ending at the
 * selected month). Blank history stays blank.
 */
export function buildSummary(
  grid: InventoryGrid | null,
  monthIndex: number,
  carried: Record<string, Quantity> = {},
  rows: GridRow[] = [],
): SummarySection[] {
  const sections: SummarySection[] = [];
  const bySection = new Map<string, SummaryItem[]>();
  for (const r of rows) {
    const key = r.key;
    let onHand: Quantity = null;
    let avgMoved: number | null = null;
    if (grid) {
      const group = MONTH_GROUPS[monthIndex];
      onHand = grid.months[key]?.[group]?.onHand ?? null;
      const moves: number[] = [];
      for (let mi = monthIndex; mi >= 0 && moves.length < HISTORY_MONTHS; mi--) {
        const m = MONTH_GROUPS[mi];
        const cell = grid.months[key]?.[m];
        if (!cell || cell.onHand === null) continue;
        const opening =
          mi === 0
            ? (grid.original[key] ?? carried[key] ?? null)
            : (grid.months[key]?.[MONTH_GROUPS[mi - 1]]?.onHand ?? null);
        moves.push(calculateMoved(opening, cell.received, cell.onHand) ?? 0);
      }
      if (moves.length > 0) avgMoved = round1(moves.reduce((a, b) => a + b, 0) / moves.length);
    }
    if (!bySection.has(r.section)) bySection.set(r.section, []);
    bySection.get(r.section)!.push({ key, code: r.code, name: r.name, onHand, avgMoved });
  }
  for (const [section, items] of bySection) sections.push({ section, items });
  return sections;
}

/** Months where every row has a count — "Recent Reports Submitted: N of 6". */
export function submissionCount(
  grid: InventoryGrid | null,
  rows: GridRow[],
): { done: number; total: number } {
  const total = MONTH_GROUPS.length;
  if (!grid || rows.length === 0) return { done: 0, total };
  let done = 0;
  for (const m of MONTH_GROUPS as readonly MonthGroup[]) {
    if (rows.every((r) => {
      const v = grid.months[r.key]?.[m]?.onHand;
      return v !== null && v !== undefined;
    })) done += 1;
  }
  return { done, total };
}

export function formatQty(v: Quantity): string {
  return v === null ? "" : String(v);
}
