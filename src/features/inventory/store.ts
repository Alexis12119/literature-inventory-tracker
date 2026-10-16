"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CATALOG, MONTH_GROUPS, type MonthGroup } from "@/src/lib/reports/template";
import { calculateMoved, type Quantity } from "@/src/lib/domain/movement";

export type LanguageCode = "en" | "tl";

export interface MonthCell {
  received: Quantity;
  onHand: Quantity;
}

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

function storageKey(cycle: string, lang: LanguageCode): string {
  return `litinv:grid:${cycle}:${lang}`;
}

export type SaveStatus = "saved" | "pending" | "failed";

export function useInventoryGrid(
  cycle: string,
  lang: LanguageCode,
  carried: Record<string, Quantity> = {},
) {
  const [grid, setGrid] = useState<InventoryGrid>(blankGrid);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Deferred hydration from localStorage (client preview cache).
    // setState inside this async callback is the subscribe-pattern exception.
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const raw = window.localStorage.getItem(storageKey(cycle, lang));
        if (raw) {
          const parsed = JSON.parse(raw) as InventoryGrid;
          const fresh = blankGrid();
          setGrid({
            original: { ...fresh.original, ...parsed.original },
            months: { ...fresh.months, ...parsed.months },
          });
          setSavedAt(window.localStorage.getItem(`${storageKey(cycle, lang)}:at`));
        } else {
          setGrid(blankGrid());
          setSavedAt(null);
        }
        setStatus("saved");
      } catch {
        setStatus("failed");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cycle, lang]);

  const setCell = useCallback(
    (key: string, month: MonthGroup | "original", field: "received" | "onHand" | "original", value: Quantity) => {
      setGrid((g) => {
        const next = { ...g, original: { ...g.original }, months: { ...g.months } };
        if (month === "original") {
          next.original[key] = value;
        } else {
          next.months[key] = { ...next.months[key], [month]: { ...next.months[key][month], [field]: value } };
        }
        return next;
      });
      setStatus("pending");
    },
    [],
  );

  const save = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey(cycle, lang), JSON.stringify(grid));
      const at = new Date().toISOString();
      window.localStorage.setItem(`${storageKey(cycle, lang)}:at`, at);
      const logRaw = window.localStorage.getItem("litinv:activity");
      const log = logRaw ? (JSON.parse(logRaw) as Array<Record<string, string>>) : [];
      log.unshift({
        at,
        action: "inventory.save",
        detail: `Saved ${cycle} / ${lang.toUpperCase()} workspace`,
      });
      window.localStorage.setItem("litinv:activity", JSON.stringify(log.slice(0, 100)));
      setSavedAt(at);
      setStatus("saved");
    } catch {
      setStatus("failed");
    }
  }, [cycle, lang, grid]);

  const movedFor = useCallback(
    (key: string, monthIndex: number): Quantity => {
      const month = MONTH_GROUPS[monthIndex];
      const cell = grid.months[key]?.[month];
      if (!cell) return null;
      // Explicit original wins; otherwise the carried previous-report closing.
      const opening =
        monthIndex === 0
          ? (grid.original[key] ?? carried[key] ?? null)
          : (grid.months[key]?.[MONTH_GROUPS[monthIndex - 1]]?.onHand ?? null);
      return calculateMoved(opening, cell.received, cell.onHand);
    },
    [grid, carried],
  );

  const missingInMonth = useMemo(() => {
    return (month: MonthGroup): number =>
      CATALOG.filter((r) => grid.months[pubKey(r.section, r.itemNo, r.name)]?.[month]?.onHand === null).length;
  }, [grid]);

  const applyImport = useCallback(
    (patch: ImportPatch) => {
      const { counts } = mergeImportPatch(grid, patch);
      setGrid((g) => mergeImportPatch(g, patch).grid);
      setStatus("pending");
      return counts;
    },
    [grid],
  );

  return { grid, setCell, save, status, savedAt, movedFor, missingInMonth, applyImport };
}

export function parseQtyInput(raw: string): Quantity | "invalid" {
  if (raw.trim() === "") return null;
  if (!/^\d{1,6}$/.test(raw.trim())) return "invalid";
  return Number(raw.trim());
}
