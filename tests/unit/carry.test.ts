import { describe, expect, it } from "vitest";
import { blankGrid, pubKey } from "@/src/features/inventory/store";
import { CATALOG } from "@/src/lib/reports/template";
import {
  carriedOriginals,
  closingCounts,
  effectiveOriginal,
  labelFromId,
  previousCycleId,
} from "@/src/features/inventory/carry";

function keyOf(index: number): string {
  const r = CATALOG[index];
  return pubKey(r.section, r.itemNo, r.name);
}

describe("cross-cycle carry-forward", () => {
  it("resolves previous cycle IDs and stops before Mar 2024", () => {
    expect(previousCycleId("2026-sep-feb")).toBe("2026-mar-aug");
    expect(previousCycleId("2026-mar-aug")).toBe("2025-sep-feb");
    expect(previousCycleId("2024-mar-aug")).toBeNull();
    expect(previousCycleId("nope")).toBeNull();
    expect(labelFromId("2026-sep-feb")).toBe("Sep 2026 – Feb 2027");
  });

  it("takes each publication's last counted stock", () => {
    const grid = blankGrid();
    const k = keyOf(0);
    grid.months[k]["Sep/Mar"] = { received: 0, onHand: 9 };
    grid.months[k]["Feb/Aug"] = { received: 0, onHand: 4 };
    expect(closingCounts(grid)[k]).toBe(4);
    expect(closingCounts(grid)[keyOf(1)]).toBeUndefined();
  });

  it("walks back past blank reports per publication", () => {
    const prev = blankGrid();
    const older = blankGrid();
    const k = keyOf(0);
    older.months[k]["Jan/July"] = { received: 0, onHand: 12 };
    const carried = carriedOriginals(
      (id) => (id === "2026-mar-aug" ? prev : id === "2025-sep-feb" ? older : null),
      "2026-sep-feb",
    );
    expect(carried.values[k]).toBe(12);
    expect(carried.sources[k]).toBe("2025-sep-feb");
  });

  it("prefers the nearest report and leaves true blanks blank", () => {
    const prev = blankGrid();
    const older = blankGrid();
    const k = keyOf(0);
    prev.months[k]["Feb/Aug"] = { received: 0, onHand: 7 };
    older.months[k]["Feb/Aug"] = { received: 0, onHand: 3 };
    const carried = carriedOriginals(
      (id) => (id === "2026-mar-aug" ? prev : id === "2025-sep-feb" ? older : null),
      "2026-sep-feb",
    );
    expect(carried.values[k]).toBe(7);
    expect(carried.values[keyOf(1)]).toBeUndefined();
  });

  it("explicit values always win over carried ones", () => {
    expect(effectiveOriginal(5, "k", { k: 9 })).toBe(5);
    expect(effectiveOriginal(0, "k", { k: 9 })).toBe(0);
    expect(effectiveOriginal(null, "k", { k: 9 })).toBe(9);
    expect(effectiveOriginal(null, "k", {})).toBeNull();
  });
});
