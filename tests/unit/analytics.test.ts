import { describe, expect, it } from "vitest";
import { blankGrid, pubKey } from "@/src/features/inventory/store";
import { CATALOG } from "@/src/lib/reports/template";
import { computeCycleStats, isGridEmpty } from "@/src/features/dashboard/analytics";

function fixture() {
  const grid = blankGrid();
  const a = CATALOG[0];
  const b = CATALOG[1];
  const ka = pubKey(a.section, a.itemNo, a.name);
  const kb = pubKey(b.section, b.itemNo, b.name);
  grid.original[ka] = 10;
  grid.months[ka]["Sep/Mar"] = { received: 3, onHand: 8 }; // moved 10+3-8 = 5
  grid.months[kb]["Sep/Mar"] = { received: null, onHand: 4 }; // blank opening → 0+0-4 = -4
  grid.months[ka]["Oct/Apr"] = { received: null, onHand: 8 }; // opening 8 → 8+0-8 = 0
  return { grid, ka, kb };
}

describe("dashboard analytics", () => {
  it("detects an untouched grid", () => {
    expect(isGridEmpty(blankGrid())).toBe(true);
    expect(isGridEmpty(fixture().grid)).toBe(false);
  });

  it("handles an empty focus month without breaking", () => {
    const { grid } = fixture();
    const stats = computeCycleStats(grid, "Feb/Aug");
    expect(stats.counted).toBe(0);
    expect(stats.missing).toBe(CATALOG.length);
    expect(stats.completionPct).toBe(0);
    expect(stats.topMovers).toEqual([]);
    expect(stats.months).toHaveLength(6);
  });

  it("computes focus-month totals from counted rows only", () => {
    const { grid } = fixture();
    const stats = computeCycleStats(grid, "Sep/Mar");
    expect(stats.totalPublications).toBe(CATALOG.length);
    expect(stats.counted).toBe(2);
    expect(stats.missing).toBe(CATALOG.length - 2);
    expect(stats.totalReceived).toBe(3);
    expect(stats.totalMoved).toBe(1); // 5 + (-4)
    expect(stats.cycleCounted).toBe(2);
  });

  it("ranks top movers and flags zero stock", () => {
    const { grid, ka } = fixture();
    grid.months[ka]["Sep/Mar"] = { received: 3, onHand: 0 }; // moved 13
    const stats = computeCycleStats(grid, "Sep/Mar");
    expect(stats.topMovers[0]).toMatchObject({ key: ka, moved: 13 });
    expect(stats.zeroStock.map((p) => p.key)).toContain(ka);
  });

  it("uses carried openings when the original is blank", () => {
    const { grid, ka } = fixture();
    grid.original[ka] = null;
    const plain = computeCycleStats(grid, "Sep/Mar");
    // Without the original, month-0 moved coerces opening to 0: 0+3-8 = -5.
    expect(plain.totalMoved).toBe(-5 + -4);
    const carried = computeCycleStats(grid, "Sep/Mar", { [ka]: 10 });
    expect(carried.totalMoved).toBe(5 + -4);
  });

  it("builds a six-month trend with carry-forward", () => {
    const { grid } = fixture();
    const stats = computeCycleStats(grid, "Oct/Apr");
    expect(stats.months).toHaveLength(6);
    expect(stats.months[0]).toMatchObject({ counted: 2, received: 3, moved: 1 });
    expect(stats.months[1]).toMatchObject({ counted: 1, received: 0, moved: 0 });
    expect(stats.months[2].counted).toBe(0);
  });
});
