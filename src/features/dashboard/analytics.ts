import { CATALOG, MONTH_GROUPS, type MonthGroup } from "@/src/lib/reports/template";
import { calculateMoved, type Quantity } from "@/src/lib/domain/movement";
import { pubKey, type InventoryGrid } from "@/src/features/inventory/store";
import type { GridRow } from "@/src/features/inventory/store";

const TEMPLATE_ROWS: GridRow[] = CATALOG.map((r) => ({
  key: pubKey(r.section, r.itemNo, r.name),
  itemNo: r.itemNo,
  name: r.name,
  code: r.code,
  section: r.section,
}));

/**
 * Dashboard analytics — pure functions over a saved workspace grid.
 * Every figure derives from entered quantities only:
 * - A row contributes to a month's totals only when its physical count
 *   (`onHand`) is entered. Blank counts are excluded, never filled.
 * - Blank opening/received coerce to 0 inside the movement math
 *   (spreadsheet-faithful; see domain/movement.ts).
 */

export interface MonthStat {
  month: MonthGroup;
  counted: number;
  total: number;
  received: number;
  moved: number;
}

export interface CategoryStat {
  section: string;
  counted: number;
  total: number;
  received: number;
  moved: number;
}

export interface RankedPublication {
  key: string;
  name: string;
  itemNo: string | null;
  code: string | null;
  section: string;
  received: number | null;
  onHand: number | null;
  moved: number | null;
}

export interface CycleStats {
  totalPublications: number;
  focusMonth: MonthGroup;
  counted: number;
  missing: number;
  completionPct: number;
  totalReceived: number;
  totalMoved: number;
  cycleCounted: number; // publications counted in at least one month
  months: MonthStat[];
  categories: CategoryStat[];
  topMovers: RankedPublication[];
  zeroStock: RankedPublication[];
}

export function computeCycleStats(
  grid: InventoryGrid,
  focusMonth: MonthGroup,
  carried: Record<string, Quantity> = {},
  rows: GridRow[] = TEMPLATE_ROWS,
): CycleStats {
  const total = rows.length;
  const months: MonthStat[] = MONTH_GROUPS.map((m) => ({
    month: m,
    counted: 0,
    total,
    received: 0,
    moved: 0,
  }));
  const catMap = new Map<string, CategoryStat>();
  for (const r of rows) {
    if (!catMap.has(r.section)) {
      catMap.set(r.section, {
        section: r.section,
        counted: 0,
        total: 0,
        received: 0,
        moved: 0,
      });
    }
    catMap.get(r.section)!.total += 1;
  }

  const ranked: RankedPublication[] = [];
  const countedKeys = new Set<string>();

  rows.forEach((r) => {
    const key = r.key;
    MONTH_GROUPS.forEach((m, mi) => {
      const cell = grid.months[key]?.[m];
      if (!cell || cell.onHand === null) return;
      countedKeys.add(key);
      const opening =
        mi === 0
          ? (grid.original[key] ?? carried[key] ?? null)
          : (grid.months[key]?.[MONTH_GROUPS[mi - 1]]?.onHand ?? null);
      const moved = calculateMoved(opening, cell.received, cell.onHand);
      const ms = months[mi];
      ms.counted += 1;
      ms.received += cell.received ?? 0;
      ms.moved += moved ?? 0;
      const cs = catMap.get(r.section)!;
      if (m === focusMonth) {
        cs.counted += 1;
        cs.received += cell.received ?? 0;
        cs.moved += moved ?? 0;
        ranked.push({
          key,
          name: r.name,
          itemNo: r.itemNo,
          code: r.code,
          section: r.section,
          received: cell.received,
          onHand: cell.onHand,
          moved,
        });
      }
    });
  });

  const focusIdx = MONTH_GROUPS.indexOf(focusMonth);
  const focus = months[focusIdx];
  const topMovers = [...ranked]
    .filter((p) => p.moved !== null)
    .sort((a, b) => (b.moved ?? 0) - (a.moved ?? 0))
    .slice(0, 5);
  const zeroStock = ranked.filter((p) => p.onHand === 0).slice(0, 8);

  return {
    totalPublications: total,
    focusMonth,
    counted: focus.counted,
    missing: total - focus.counted,
    completionPct: total === 0 ? 0 : Math.round((focus.counted / total) * 100),
    totalReceived: focus.received,
    totalMoved: focus.moved,
    cycleCounted: countedKeys.size,
    months,
    categories: [...catMap.values()],
    topMovers,
    zeroStock,
  };
}

/** True when no physical count has been entered anywhere in the grid. */
export function isGridEmpty(grid: InventoryGrid): boolean {
  return !Object.values(grid.months).some((perMonth) =>
    Object.values(perMonth).some((c) => c.onHand !== null || c.received !== null),
  );
}
