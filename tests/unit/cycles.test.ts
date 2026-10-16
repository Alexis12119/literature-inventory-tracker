import { describe, expect, it } from "vitest";
import {
  baseEndOrder,
  buildCycles,
  cycleFromOrder,
  isSeptember,
  monthsForCycle,
  nextServiceYearOrders,
  orderContaining,
  orderFromId,
} from "@/src/features/inventory/cycles";

describe("continuous cycles", () => {
  it("starts at March 2024 with stable historical IDs", () => {
    expect(cycleFromOrder(0)).toEqual({ order: 0, id: "2024-mar-aug", label: "Mar – Aug 2024" });
    expect(cycleFromOrder(1)).toEqual({ order: 1, id: "2024-sep-feb", label: "Sep 2024 – Feb 2025" });
    // Previously saved local workspaces keep loading (same ID shape).
    expect(cycleFromOrder(4)).toMatchObject({ id: "2026-mar-aug", label: "Mar – Aug 2026" });
    expect(cycleFromOrder(5)).toMatchObject({ id: "2026-sep-feb", label: "Sep 2026 – Feb 2027" });
  });

  it("places dates in the correct cycle", () => {
    expect(orderContaining(new Date(2024, 2, 1))).toBe(0); // Mar 2024
    expect(orderContaining(new Date(2024, 7, 31))).toBe(0); // Aug 2024
    expect(orderContaining(new Date(2024, 8, 1))).toBe(1); // Sep 2024
    expect(orderContaining(new Date(2025, 0, 15))).toBe(1); // Jan 2025 → Sep 2024 cycle
    expect(orderContaining(new Date(2025, 1, 28))).toBe(1); // Feb 2025
    expect(orderContaining(new Date(2025, 2, 1))).toBe(2); // Mar 2025
    expect(orderContaining(new Date(2026, 9, 16))).toBe(5); // Oct 2026 → Sep 2026 cycle
    expect(orderContaining(new Date(2020, 0, 1))).toBe(0); // pre-epoch clamps
  });

  it("pre-generates through the current cycle plus one upcoming", () => {
    const end = baseEndOrder(new Date(2026, 9, 16));
    expect(end).toBe(6); // current 5 + 1
    const cycles = buildCycles(end);
    expect(cycles).toHaveLength(7);
    expect(cycles[6]).toMatchObject({ id: "2027-mar-aug" });
  });

  it("extends to the next August boundary on demand", () => {
    // Mid-year coverage (ends Sep–Feb): completes through August (+1).
    expect(nextServiceYearOrders(5)).toEqual([6]);
    // Complete coverage (ends Mar–Aug): appends the next full service year (+2).
    expect(nextServiceYearOrders(6)).toEqual([7, 8]);
    expect(cycleFromOrder(7).label).toBe("Sep 2027 – Feb 2028");
    expect(cycleFromOrder(8).label).toBe("Mar – Aug 2028");
  });

  it("lists each cycle's calendar months and spots September", () => {
    expect(monthsForCycle(4).map((m) => m.label)).toEqual([
      "March 2026",
      "April 2026",
      "May 2026",
      "June 2026",
      "July 2026",
      "August 2026",
    ]);
    const sep = monthsForCycle(5);
    expect(sep[0]).toMatchObject({ monthIndex: 8, year: 2026 });
    expect(sep[5]).toMatchObject({ monthIndex: 1, year: 2027, label: "February 2027" });
    expect(isSeptember(5, 0)).toBe(true);
    expect(isSeptember(5, 1)).toBe(false);
    expect(isSeptember(4, 0)).toBe(false); // March, not September
    expect(orderFromId("2026-mar-aug")).toBe(4);
    expect(orderFromId("2026-sep-feb")).toBe(5);
    expect(orderFromId("nope")).toBeNull();
  });
});
