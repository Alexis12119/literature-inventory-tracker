"use client";

import { CATALOG, MONTH_GROUPS, type MonthGroup } from "@/src/lib/reports/template";
import type { Quantity } from "@/src/lib/domain/movement";

export type LanguageCode = "en" | "tl";

export interface MonthCell {
  received: Quantity;
  onHand: Quantity;
}

/** One inventory-bearing row: template entry or local publication. */
export interface GridRow {
  key: string;
  itemNo: string | null;
  name: string;
  code: string | null;
  section: string;
}

export const DEFAULT_ROWS: GridRow[] = CATALOG.map((r) => ({
  key: pubKey(r.section, r.itemNo, r.name),
  itemNo: r.itemNo,
  name: r.name,
  code: r.code,
  section: r.section,
}));

/** Non-blank imported values only — blanks never overwrite existing data. */
export interface ImportPatch {
  original: Record<string, Quantity>;
  received: Record<string, Partial<Record<MonthGroup, Quantity>>>;
  onHand: Record<string, Partial<Record<MonthGroup, Quantity>>>;
}

export interface ImportCounts {
  original: number;
  received: number;
  onHand: number;
}

/** Pure merge used by both the live workspace and background cycle imports. */
export function mergeImportPatch(
  grid: InventoryGrid,
  patch: ImportPatch,
): { grid: InventoryGrid; counts: ImportCounts } {
  const counts: ImportCounts = { original: 0, received: 0, onHand: 0 };
  const next: InventoryGrid = { original: { ...grid.original }, months: { ...grid.months } };
  for (const [k, v] of Object.entries(patch.original)) {
    if (v === null || v === undefined || next.original[k] === undefined) continue;
    next.original[k] = v;
    counts.original += 1;
  }
  const merge = (bucket: Record<string, Partial<Record<MonthGroup, Quantity>>>, field: "received" | "onHand") => {
    for (const [k, perMonth] of Object.entries(bucket)) {
      if (!next.months[k]) continue;
      next.months[k] = { ...next.months[k] };
      for (const [m, v] of Object.entries(perMonth)) {
        if (v === null || v === undefined) continue;
        const month = m as MonthGroup;
        if (!next.months[k][month]) continue;
        next.months[k][month] = { ...next.months[k][month], [field]: v };
        if (field === "received") counts.received += 1;
        else counts.onHand += 1;
      }
    }
  };
  merge(patch.received, "received");
  merge(patch.onHand, "onHand");
  return { grid: next, counts };
}

export interface InventoryGrid {
  original: Record<string, Quantity>;
  months: Record<string, Record<MonthGroup, MonthCell>>;
}

export function pubKey(section: string, itemNo: string | null, name: string): string {
  return `${section}::${itemNo ?? ""}::${name}`;
}

export function blankGrid(): InventoryGrid {
  const original: Record<string, Quantity> = {};
  const months: Record<string, Record<MonthGroup, MonthCell>> = {};
  for (const r of CATALOG) {
    const k = pubKey(r.section, r.itemNo, r.name);
    original[k] = null;
    months[k] = Object.fromEntries(
      MONTH_GROUPS.map((m) => [m, { received: null, onHand: null }]),
    ) as Record<MonthGroup, MonthCell>;
  }
  return { original, months };
}

export function parseQtyInput(raw: string): Quantity | "invalid" {
  if (raw.trim() === "") return null;
  if (!/^\d{1,6}$/.test(raw.trim())) return "invalid";
  return Number(raw.trim());
}
