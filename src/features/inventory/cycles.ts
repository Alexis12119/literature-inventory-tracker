"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Continuous reporting cycles.
 *
 * Coverage starts at March 2024 (order 0) and always extends through the
 * current cycle plus one upcoming cycle. Order n maps deterministically:
 * even = Mar–Aug of 2024 + n/2, odd = Sep–Feb starting 2024 + floor(n/2).
 * IDs keep the historical `YYYY-mar-aug` / `YYYY-sep-feb` shape so previously
 * saved local workspace data keeps loading.
 *
 * For performance the list is capped (MAX_CYCLES) instead of generated
 * unboundedly; the "+" button extends coverage to the end of the next
 * service year (August boundary) on demand, persisted in localStorage.
 */

export interface Cycle {
  id: string;
  label: string;
  order: number;
}

const EPOCH_YEAR = 2024;
const ADDED_KEY = "litinv:added-cycles";
const SELECTED_KEY = "litinv:selected-cycle";
const MAX_CYCLES = 60; // orders 0..59 → Mar 2024 through Aug 2053

export function cycleFromOrder(order: number): Cycle {
  const year = EPOCH_YEAR + Math.floor(order / 2);
  if (order % 2 === 0) {
    return { order, id: `${year}-mar-aug`, label: `Mar – Aug ${year}` };
  }
  return { order, id: `${year}-sep-feb`, label: `Sep ${year} – Feb ${year + 1}` };
}

/** Which cycle order contains the given date (clamped at 0 for pre-epoch dates). */
export function orderContaining(date: Date): number {
  const totalMonths = (date.getFullYear() - EPOCH_YEAR) * 12 + (date.getMonth() - 2);
  return Math.max(0, Math.floor(totalMonths / 6));
}

/** Last pre-generated order: current cycle + 1 upcoming. */
export function baseEndOrder(now: Date = new Date()): number {
  return Math.min(orderContaining(now) + 1, MAX_CYCLES - 1);
}

export function buildCycles(throughOrder: number): Cycle[] {
  const end = Math.max(0, Math.min(throughOrder, MAX_CYCLES - 1));
  const out: Cycle[] = [];
  for (let o = 0; o <= end; o++) out.push(cycleFromOrder(o));
  return out;
}

export interface CycleMonth {
  groupIndex: number;
  monthIndex: number; // 0 = January
  year: number;
  label: string; // e.g. "September 2026"
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Actual calendar months for a cycle order (Mar–Aug of Y, or Sep Y–Feb Y+1). */
export function monthsForCycle(order: number): CycleMonth[] {
  const year = EPOCH_YEAR + Math.floor(order / 2);
  const start = order % 2 === 0 ? 2 : 8; // March or September
  return Array.from({ length: 6 }, (_, i) => {
    const abs = start + i;
    const monthIndex = abs % 12;
    const y = year + Math.floor(abs / 12);
    return { groupIndex: i, monthIndex, year: y, label: `${MONTH_NAMES[monthIndex]} ${y}` };
  });
}

/** True when the given group of a cycle is a September (campaign month). */
export function isSeptember(order: number, groupIndex: number): boolean {
  return monthsForCycle(order)[groupIndex]?.monthIndex === 8;
}

/** Orders to append so coverage ends at the next August (service-year) boundary. */
export function nextServiceYearOrders(lastOrder: number): number[] {
  const out: number[] = [];
  let o = lastOrder;
  if (o % 2 === 1) {
    // Coverage ends mid-year (Sep–Feb): just complete this service year through August.
    if (o + 1 < MAX_CYCLES) out.push(o + 1);
    return out;
  }
  // Coverage ends in August: append the next full service year (Sep–Feb + Mar–Aug).
  for (let i = 0; i < 2 && o + 1 < MAX_CYCLES; i++) {
    o += 1;
    out.push(o);
  }
  return out;
}

function readAdded(): number {
  try {
    const raw = window.localStorage.getItem(ADDED_KEY);
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function useCycles() {
  const [added, setAdded] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setAdded(readAdded());
      try {
        setSelected(window.localStorage.getItem(SELECTED_KEY));
      } catch {
        setSelected(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const baseEnd = baseEndOrder();
  const cycles = useMemo(
    () => buildCycles(Math.min(baseEnd + added, MAX_CYCLES - 1)),
    [baseEnd, added],
  );
  const defaultId = cycleFromOrder(orderContaining(new Date())).id;
  const selectedId =
    selected && cycles.some((c) => c.id === selected) ? selected : defaultId;

  const setSelectedId = useCallback((id: string) => {
    setSelected(id);
    try {
      window.localStorage.setItem(SELECTED_KEY, id);
    } catch {
      /* local preview cache only */
    }
  }, []);

  const canAddMore =
    cycles.length > 0 && cycles[cycles.length - 1].order < MAX_CYCLES - 1;

  const addServiceYear = useCallback(() => {
    const last = baseEnd + added;
    const extra = nextServiceYearOrders(last).length;
    if (extra === 0) return;
    const next = Math.min(added + extra, MAX_CYCLES - 1 - baseEnd);
    if (next <= added) return;
    setAdded(next);
    try {
      window.localStorage.setItem(ADDED_KEY, String(next));
    } catch {
      /* local preview cache only */
    }
  }, [baseEnd, added]);

  return { cycles, selectedId, setSelectedId, addServiceYear, canAddMore };
}

/** Cycle ID → order (inverse of cycleFromOrder); null when unparseable. */
export function orderFromId(cycleId: string): number | null {
  const m = /^(\d{4})-(mar-aug|sep-feb)$/.exec(cycleId);
  if (!m) return null;
  return (Number(m[1]) - EPOCH_YEAR) * 2 + (m[2] === "mar-aug" ? 0 : 1);
}
