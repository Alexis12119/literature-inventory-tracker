import { describe, expect, it } from "vitest";
import { blankGrid, pubKey } from "@/src/features/inventory/store";
import { CATALOG } from "@/src/lib/reports/template";
import { generateReportPdf } from "@/src/lib/reports/pdf";

function populated() {
  const grid = blankGrid();
  const first = CATALOG[0];
  const key = pubKey(first.section, first.itemNo, first.name);
  grid.original[key] = 87;
  grid.months[key]["Sep/Mar"] = { received: 16, onHand: 95 };
  grid.months[key]["Feb/Aug"] = { received: 0, onHand: 80 };
  return grid;
}

const base = {
  lang: "tl" as const,
  cycleId: "2026-sep-feb",
  cycleLabel: "Sep 2026 – Feb 2027",
  monthLabel: "February",
  yearLabel: "2027",
};

describe("custom PDF export", () => {
  it("generates a single-month portrait PDF by default (Feb/Aug)", async () => {
    const pdf = await generateReportPdf({ grid: populated(), carried: {}, ...base });
    const header = new TextDecoder().decode(new Uint8Array(pdf.bytes.slice(0, 5)));
    expect(header).toBe("%PDF-");
    expect(pdf.pages).toBeGreaterThanOrEqual(1);
    expect(pdf.filename).toContain("tagalog");
    expect(pdf.filename).toContain("2026-sep-feb");
    expect(pdf.filename).toContain("febaug");
  }, 60000);

  it("still renders all six months when asked", async () => {
    const single = await generateReportPdf({ grid: populated(), carried: {}, ...base });
    const full = await generateReportPdf({
      grid: populated(),
      carried: {},
      ...base,
      months: ["Sep/Mar", "Oct/Apr", "Nov/May", "Dec/June", "Jan/July", "Feb/Aug"],
    });
    expect(full.filename).toContain("all");
    expect(full.pages).toBeGreaterThanOrEqual(single.pages);
  }, 60000);
});
