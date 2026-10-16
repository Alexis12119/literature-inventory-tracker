import { describe, expect, it } from "vitest";
import {
  buildExportCsv,
  buildTemplateCsv,
  findHeaderRow,
  isSectionRow,
  mapSheet,
  matchPublication,
  monthYearOf,
  sheetTarget,
} from "@/src/features/import/mapping";
import { MONTH_GROUPS } from "@/src/lib/reports/template";
import { blankGrid, mergeImportPatch, pubKey } from "@/src/features/inventory/store";
import { CATALOG } from "@/src/lib/reports/template";

/** Minimal quote-aware CSV line parser (test-only). */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** Mirrors the real SFSPC layout: title/instructions, group row, sub-header row, sections. */
function workbookFixture(): unknown[][] {
  return [
    ["", "", "MONTHLY MOVEMENT OF LITERATURE"],
    ["", "", "INSTRUCTIONS: …"],
    ["Month & Year: August, 2024", "", "Sep/Mar", "", "", "Oct/Apr", "", ""],
    ["Item No.", "Name", "Originally on Hand", "Rec’d", "Currently on Hand", "Moved", "Rec'd", "Currently on Hand", "Moved"],
    ["", "Bibles"],
    [5140, "New World Translation nwt", 87, 16, 95, 8, 0, 85, -7],
    [5142, "New World Translation (pocket size) nwtpkt", 3, 0, 2, 1, 0, 1, -1],
    ["", "Public Magazines"],
    [null, "Watchtower No.1 2020 wp20.1", 5, 0, 3, 2, "", "", ""],
    [null, "All other public magazines", "", "", "", "", "", "", ""],
    ["9999", "Ghost Pub", 1, 2, 3, 0, 0, 0, 0],
    ["", "", "", "", "", "", "", "", ""],
  ];
}

describe("workbook import", () => {
  it("finds the header row below title/instruction rows", () => {
    expect(findHeaderRow(workbookFixture())).toBe(3);
    expect(findHeaderRow([["a", "b"], ["c"]])).toBe(-1);
  });

  it("reads the Month & Year marker", () => {
    expect(monthYearOf(workbookFixture())).toBe("August, 2024");
  });

  it("maps sheet names to cycles and languages", () => {
    expect(sheetTarget("2024.1-TG")).toEqual({ cycleId: "2024-mar-aug", lang: "tl" });
    expect(sheetTarget("2024.2-E")).toEqual({ cycleId: "2024-sep-feb", lang: "en" });
    expect(sheetTarget("2026.2-TG")).toEqual({ cycleId: "2026-sep-feb", lang: "tl" });
    expect(sheetTarget(" 202X-TG")).toBeNull();
    expect(sheetTarget("Notes")).toBeNull();
  });

  it("skips section dividers silently", () => {
    expect(isSectionRow(null, "Bibles")).toBe(true);
    expect(isSectionRow(null, "")).toBe(true);
    expect(isSectionRow(null, "All other public magazines")).toBe(false);
    expect(isSectionRow("5140", "New World Translation nwt")).toBe(false);
  });

  it("maps the workbook: item numbers, name+code, magazines; ignores Moved", () => {
    const mapped = mapSheet(workbookFixture());
    expect(mapped.headerRow).toBe(3);
    expect(mapped.detectedMonths).toEqual(["Sep/Mar", "Oct/Apr"]);
    const k = pubKey("Bibles", "5140", "New World Translation");
    expect(mapped.original[k]).toBe(87);
    expect(mapped.received[k]?.["Sep/Mar"]).toBe(16);
    expect(mapped.onHand[k]?.["Sep/Mar"]).toBe(95);
    expect(mapped.received[k]?.["Oct/Apr"]).toBe(0);
    // Moved columns are never imported.
    expect(Object.keys(mapped.received[k] ?? {})).toHaveLength(2);
    // Magazine matched by name+code without an item number.
    const mag = CATALOG.find((r) => r.code === "wp20.1")!;
    const mk = pubKey(mag.section, mag.itemNo, mag.name);
    expect(mapped.onHand[mk]?.["Sep/Mar"]).toBe(3);
    // Section rows are skipped, not reported as unmatched.
    expect(mapped.unmatched).toEqual(["9999 · Ghost Pub"]);
    expect(mapped.matched).toBe(4);
  });

  it("matches names with appended codes", () => {
    const first = CATALOG[0];
    const key = pubKey(first.section, first.itemNo, first.name);
    expect(matchPublication(first.itemNo, null)).toBe(key);
    expect(matchPublication(Number(first.itemNo), null)).toBe(key);
    expect(matchPublication(null, `${first.name} ${first.code}`)).toBe(key);
    expect(matchPublication("nope", "Unknown Publication")).toBeNull();
  });

  it("merges without letting imported blanks overwrite", () => {
    const grid = blankGrid();
    const first = CATALOG[0];
    const key = pubKey(first.section, first.itemNo, first.name);
    grid.months[key]["Sep/Mar"] = { received: 5, onHand: 9 };
    const { grid: next, counts } = mergeImportPatch(grid, {
      original: {},
      received: {},
      onHand: { [key]: { "Sep/Mar": 7 } },
    });
    expect(next.months[key]["Sep/Mar"]).toEqual({ received: 5, onHand: 7 });
    expect(counts).toEqual({ original: 0, received: 0, onHand: 1 });
    // Unknown keys are ignored, never crash.
    const again = mergeImportPatch(next, {
      original: { "ghost::": 3 },
      received: {},
      onHand: {},
    });
    expect(again.counts.original).toBe(0);
  });

  it("builds a template with all six month pairs", () => {
    const csv = buildTemplateCsv();
    const [groups, head] = csv.split("\n");
    expect(groups).toContain("Sep/Mar");
    for (const m of MONTH_GROUPS) {
      expect(head).toContain(`${m} Rec'd`);
      expect(head).toContain(`${m} Currently on Hand`);
    }
    expect(csv.split("\n").length).toBe(CATALOG.length + 2);
  });

  it("round-trips an export back through the importer", () => {
    const grid = blankGrid();
    const first = CATALOG[0];
    const key = pubKey(first.section, first.itemNo, first.name);
    grid.original[key] = 87;
    grid.months[key]["Sep/Mar"] = { received: 16, onHand: 95 };
    const exported = buildExportCsv(grid, [
      { key, itemNo: first.itemNo, name: first.name, code: first.code, section: first.section },
    ]);
    const mapped = mapSheet(exported.split("\n").map(parseCsvLine));
    expect(mapped.original[key]).toBe(87);
    expect(mapped.onHand[key]?.["Sep/Mar"]).toBe(95);
  });
});
