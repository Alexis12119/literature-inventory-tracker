import { describe, expect, it } from "vitest";
import { blankGrid } from "@/src/features/inventory/store";
import type { GridRow } from "@/src/features/inventory/store";
import { buildSummary, submissionCount } from "@/src/lib/reports/summary";

const ROWS: GridRow[] = [
  { key: "a", itemNo: "5140", name: "New World Translation", code: "nwt", section: "Bibles" },
  { key: "b", itemNo: null, name: "Other Bibles", code: null, section: "Bibles" },
  { key: "c", itemNo: "65445", name: "Enjoy Life Forever! brochure", code: "llfi", section: "Teaching Toolbox" },
];

describe("summary report", () => {
  it("derives sections and items from catalog rows in order", () => {
    const sections = buildSummary(null, 5, {}, ROWS);
    expect(sections.map((s) => s.section)).toEqual(["Bibles", "Teaching Toolbox"]);
    expect(sections[0].items.map((i) => i.name)).toEqual([
      "New World Translation",
      "Other Bibles",
    ]);
    expect(sections[0].items[0]).toMatchObject({ key: "a", code: "nwt" });
    expect(sections[0].items[1].code).toBeNull();
  });

  it("resolves current counts and trailing averages by row key", () => {
    const grid = blankGrid();
    grid.original["a"] = 100;
    grid.months["a"] = {
      "Sep/Mar": { received: 0, onHand: 90 }, // moved 10
      "Oct/Apr": { received: 0, onHand: 78 }, // moved 12
      "Nov/May": { received: null, onHand: null },
      "Dec/June": { received: null, onHand: null },
      "Jan/July": { received: null, onHand: null },
      "Feb/Aug": { received: null, onHand: null },
    };
    const sections = buildSummary(grid, 1, {}, ROWS);
    const item = sections[0].items[0];
    expect(item.onHand).toBe(78);
    expect(item.avgMoved).toBe(11);
    // Untouched rows stay blank.
    expect(sections[0].items[1].onHand).toBeNull();
    expect(sections[0].items[1].avgMoved).toBeNull();
  });

  it("counts fully-counted months for the submission status", () => {
    const grid = blankGrid();
    const rows = [{ key: "k", itemNo: null, name: "X", code: null, section: "S" }];
    expect(submissionCount(grid, rows)).toEqual({ done: 0, total: 6 });
    expect(submissionCount(null, rows)).toEqual({ done: 0, total: 6 });
  });
});
