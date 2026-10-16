import { describe, expect, it } from "vitest";
import { blankGrid, pubKey } from "@/src/features/inventory/store";
import { CATALOG } from "@/src/lib/reports/template";
import { DEFAULT_CAMPAIGN_QTY, suggestOrders } from "@/src/features/ordering/suggest";

function keyOf(index: number): string {
  const r = CATALOG[index];
  return pubKey(r.section, r.itemNo, r.name);
}

function llfiKey(): string {
  const r = CATALOG.find((x) => (x.code ?? "").toLowerCase() === "llfi")!;
  return pubKey(r.section, r.itemNo, r.name);
}

describe("suggestOrders", () => {
  it("covers expected movement over the lead time from current stock", () => {
    const grid = blankGrid();
    const k = keyOf(0);
    grid.original[k] = 100;
    grid.months[k]["Sep/Mar"] = { received: 0, onHand: 90 }; // moved 10
    grid.months[k]["Oct/Apr"] = { received: 0, onHand: 78 }; // moved 12 → avg 11
    const [s] = suggestOrders(grid, { leadTimeMonths: 3, isCampaignMonth: false });
    expect(s.avgMoved).toBe(11);
    expect(s.latestOnHand).toBe(78);
    expect(s.suggested).toBe(0); // ceil(11*3-78) floored at 0 → covered
    expect(s.reasons).toContain("covered");
  });

  it("recommends a top-up when cover runs short", () => {
    const grid = blankGrid();
    const k = keyOf(0);
    grid.original[k] = 30;
    grid.months[k]["Sep/Mar"] = { received: 0, onHand: 20 }; // moved 10
    grid.months[k]["Oct/Apr"] = { received: 0, onHand: 8 }; // moved 12 → avg 11
    const [s] = suggestOrders(grid, { leadTimeMonths: 3, isCampaignMonth: false });
    expect(s.suggested).toBe(Math.ceil(33 - 8)); // 25
    expect(s.reasons).toContain("reorder");
    expect(s.monthsOfCover).toBeCloseTo(8 / 11, 1);
  });

  it("tops the campaign item up to 3000 for September", () => {
    const grid = blankGrid();
    const k = llfiKey();
    grid.original[k] = 500;
    grid.months[k]["Sep/Mar"] = { received: 0, onHand: 400 }; // moved 100, avg 100
    const [s] = suggestOrders(grid, { leadTimeMonths: 2, isCampaignMonth: true });
    // Formula alone: ceil(100*2-400) = 0, but campaign tops up to 3000.
    expect(s.suggested).toBe(DEFAULT_CAMPAIGN_QTY - 400);
    expect(s.code?.toLowerCase()).toBe("llfi");
    expect(s.reasons).toContain("campaign");
  });

  it("does not apply the campaign rule outside September", () => {
    const grid = blankGrid();
    const k = llfiKey();
    grid.original[k] = 500;
    grid.months[k]["Sep/Mar"] = { received: 0, onHand: 400 };
    const [s] = suggestOrders(grid, { leadTimeMonths: 2, isCampaignMonth: false });
    expect(s.suggested).toBe(0);
    expect(s.reasons).not.toContain("campaign");
  });

  it("skips publications with no counted history", () => {
    const grid = blankGrid();
    const k = keyOf(0);
    grid.months[k]["Sep/Mar"] = { received: 50, onHand: null }; // arrived, never counted
    expect(suggestOrders(grid, { leadTimeMonths: 3, isCampaignMonth: false })).toHaveLength(0);
  });

  it("fills blank originals from carried closings", () => {
    const grid = blankGrid();
    const k = keyOf(0);
    grid.months[k]["Sep/Mar"] = { received: 0, onHand: 8 };
    const plain = suggestOrders(grid, { leadTimeMonths: 3, isCampaignMonth: false });
    expect(plain[0].avgMoved).toBe(-8); // opening coerced to 0
    const carried = suggestOrders(grid, { leadTimeMonths: 3, isCampaignMonth: false }, { [k]: 20 });
    expect(carried[0].avgMoved).toBe(12); // 20+0-8
    expect(carried[0].suggested).toBe(Math.ceil(12 * 3 - 8));
  });
});
