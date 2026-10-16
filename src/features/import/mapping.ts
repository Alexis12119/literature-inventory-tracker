import { CATALOG, MONTH_GROUPS, SECTIONS, type MonthGroup } from "@/src/lib/reports/template";
import { pubKey } from "@/src/features/inventory/store";
import type { GridRow, InventoryGrid } from "@/src/features/inventory/store";
import type { Quantity } from "@/src/lib/domain/movement";
import type { LanguageCode } from "@/src/features/inventory/store";

const MAX_QTY = 999_999;

/**
 * Import engine (pure part) for the real SFSPC workbook layout:
 *
 *   row N-1: `Month & Year: …` + six `Sep/Mar` … `Feb/Aug` group labels
 *            (labels may be merged across each triple — carried forward)
 *   row N:   `Item No.` | `Name` | `Originally on Hand` + repeating
 *            `Rec'd` | `Currently on Hand` | `Moved`
 *   row N+1… data, with bold section rows (`Bibles`, …) interleaved.
 *
 * Title/instruction rows sit above in Tagalog sheets and are absent in
 * English sheets, so the header row is *found*, never assumed. `Moved`
 * columns are ignored (movement is always recomputed). Quantities:
 * blank → null (untouched on merge), integers 0..MAX.
 */

export interface ColumnMap {
  index: number;
  month: MonthGroup;
  field: "received" | "onHand";
}

export interface RowIssue {
  row: number;
  message: string;
}

export interface MappedImport {
  headerRow: number; // -1 when no header row was found
  monthYear: string | null;
  original: Record<string, Quantity>;
  received: Record<string, Record<MonthGroup, Quantity>>;
  onHand: Record<string, Record<MonthGroup, Quantity>>;
  matched: number;
  unmatched: string[];
  issues: RowIssue[];
  detectedMonths: MonthGroup[];
}

export interface SheetTarget {
  cycleId: string;
  lang: LanguageCode;
}

function norm(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9/ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** First row containing an `Item No.` cell (prose rows only mention items). */
export function findHeaderRow(table: unknown[][]): number {
  return table.findIndex(
    (row) => row && row.some((c) => norm(c) === "item no"),
  );
}

/** `Month & Year: August, 2024` → `August, 2024` (display/confidence only). */
export function monthYearOf(table: unknown[][]): string | null {
  for (let i = 0; i < Math.min(8, table.length); i++) {
    const row = table[i];
    if (!row) continue;
    for (const cell of row) {
      const s = String(cell ?? "");
      if (/month\s*&\s*year/i.test(s)) {
        const after = s.split(/:/).slice(1).join(":").trim();
        return after || s.trim();
      }
    }
  }
  return null;
}

/** Sheet name → target cycle + language. `202X` template sheets → null. */
export function sheetTarget(sheetName: string): SheetTarget | null {
  const m = /^\s*(\d{4})\.([12])\s*-\s*(TG|E)\s*$/i.exec(sheetName);
  if (!m) return null;
  const year = Number(m[1]);
  const cycleId = m[2] === "1" ? `${year}-mar-aug` : `${year}-sep-feb`;
  const lang: LanguageCode = m[3].toUpperCase() === "TG" ? "tl" : "en";
  return { cycleId, lang };
}

function groupLabelToMonth(cell: unknown): MonthGroup | null {
  const h = norm(cell);
  if (!h) return null;
  for (const m of MONTH_GROUPS) {
    const [a, b] = m.split("/");
    if (h.includes(a.toLowerCase()) && h.includes(b.toLowerCase())) return m;
  }
  return null;
}

function fieldOf(header: unknown): "received" | "onHand" | "moved" | null {
  const h = ` ${norm(header)} `;
  if (/\bmov/.test(h)) return "moved";
  if (/ rec(d)? | receiv/.test(h)) return "received";
  if (/ hand | count /.test(h)) return "onHand";
  return null;
}

function isOriginalHeader(header: unknown): boolean {
  const h = norm(header);
  return /original/.test(h) && /hand|stock/.test(h);
}

function headerIndex(headers: unknown[], pred: (h: string) => boolean): number {
  return headers.findIndex((h) => h !== null && h !== undefined && pred(String(h)));
}

const byItemNo = new Map<string, string>();
const byName = new Map<string, string>();
let catalogReady = false;

function ensureCatalog() {
  if (catalogReady) return;
  for (const r of CATALOG) {
    const key = pubKey(r.section, r.itemNo, r.name);
    if (r.itemNo) byItemNo.set(r.itemNo.trim().toLowerCase(), key);
    const nm = r.name.trim().toLowerCase();
    byName.set(nm, key);
    // Workbook cells append the code: "New World Translation nwt".
    if (r.code) byName.set(`${nm} ${r.code.trim().toLowerCase()}`, key);
  }
  catalogReady = true;
}

export function matchPublication(itemNo: unknown, name: unknown): string | null {
  ensureCatalog();
  const ino = String(itemNo ?? "").trim().toLowerCase();
  if (ino && byItemNo.has(ino)) return byItemNo.get(ino)!;
  const nm = String(name ?? "").trim().toLowerCase();
  if (nm && byName.has(nm)) return byName.get(nm)!;
  return null;
}

/** Section divider rows (`Bibles`, …) carry no quantities — skip silently. */
export function isSectionRow(itemNo: unknown, name: unknown): boolean {
  const ino = String(itemNo ?? "").trim();
  const nm = String(name ?? "").trim().toLowerCase();
  if (ino !== "") return false;
  if (nm === "") return true;
  return SECTIONS.some((s) => s.toLowerCase() === nm);
}

function toQty(raw: unknown): Quantity | "invalid" {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string" && raw.trim() === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim().replace(/,/g, ""));
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > MAX_QTY) return "invalid";
  return n;
}

function emptyMapped(): MappedImport {
  return {
    headerRow: -1,
    monthYear: null,
    original: {},
    received: {},
    onHand: {},
    matched: 0,
    unmatched: [],
    issues: [],
    detectedMonths: [],
  };
}

/** Map a worksheet (rows of cells, first-sheet order) into grid quantities. */
export function mapSheet(table: unknown[][]): MappedImport {
  const out = emptyMapped();
  out.monthYear = monthYearOf(table);
  const hr = findHeaderRow(table);
  out.headerRow = hr;
  if (hr < 0) {
    out.issues.push({ row: 1, message: "No header row (Item No. / Originally on Hand) found" });
    return out;
  }
  const headers = (table[hr] ?? []).map((h) => String(h ?? ""));
  const groupRow = (table[hr - 1] ?? []) as unknown[];

  const inoIdx = headerIndex(headers, (h) => /\bitem\b/.test(norm(h)));
  const nameIdx = headerIndex(headers, (h) => /\bname\b/.test(norm(h)));
  const origIdx = headerIndex(headers, isOriginalHeader);

  // Pair each sub-column with its month group (labels may be merged).
  const columns: ColumnMap[] = [];
  let lastGroup: MonthGroup | null = null;
  const width = Math.max(headers.length, groupRow.length);
  for (let i = 0; i < width; i++) {
    const g = groupLabelToMonth(groupRow[i]);
    if (g) lastGroup = g;
    const field = fieldOf(headers[i]);
    if ((field === "received" || field === "onHand") && lastGroup) {
      columns.push({ index: i, month: lastGroup, field });
    }
  }
  out.detectedMonths = [...new Set(columns.map((c) => c.month))];

  const seen = new Set<string>();
  for (let i = hr + 1; i < table.length; i++) {
    const cells = table[i] as unknown[];
    if (!cells || cells.every((c) => c === null || c === undefined || String(c).trim() === "")) continue;
    const rowNo = i + 1;
    const inoCell = inoIdx >= 0 ? cells[inoIdx] : null;
    const nameCell = nameIdx >= 0 ? cells[nameIdx] : null;
    if (isSectionRow(inoCell, nameCell)) continue;
    const key = matchPublication(inoCell, nameCell);
    if (!key) {
      const label =
        [inoCell, nameCell]
          .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
          .join(" · ") || `row ${rowNo}`;
      out.unmatched.push(String(label));
      continue;
    }
    if (!seen.has(key)) {
      seen.add(key);
      out.matched += 1;
    }
    if (origIdx >= 0) {
      const q = toQty(cells[origIdx]);
      if (q === "invalid") out.issues.push({ row: rowNo, message: "Originally on Hand is not a valid quantity" });
      else if (q !== null) out.original[key] = q;
    }
    for (const c of columns) {
      const q = toQty(cells[c.index]);
      if (q === "invalid") {
        out.issues.push({
          row: rowNo,
          message: `${c.month} ${c.field === "received" ? "Rec'd" : "On Hand"} is not a valid quantity`,
        });
        continue;
      }
      if (q === null) continue;
      const bucket = c.field === "received" ? out.received : out.onHand;
      bucket[key] ??= {} as Record<MonthGroup, Quantity>;
      bucket[key][c.month] = q;
    }
  }

  return out;
}

/** Starter CSV for the report-shaped import (moved is computed, not imported). */
export function buildTemplateCsv(): string {
  // Two header lines, workbook-style: group labels above the sub-columns.
  const groups = ["", "", ...MONTH_GROUPS.flatMap((m) => [m, "", ""])];
  const head = ["Item No.", "Name", "Originally on Hand"];
  for (const m of MONTH_GROUPS) head.push(`${m} Rec'd`, `${m} Currently on Hand`);
  const lines = [groups.join(","), head.join(",")];
  for (const r of CATALOG) {
    const name = /[",]/.test(r.name) ? `"${r.name.replace(/"/g, '""')}"` : r.name;
    lines.push([r.itemNo ?? "", name, "", ...MONTH_GROUPS.flatMap(() => ["", ""])].join(","));
  }
  return lines.join("\n");
}

function csvCell(v: Quantity | string): string {
  const s = v === null ? "" : String(v);
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Export a workspace grid to the same report-shaped CSV. */
export function buildExportCsv(
  grid: InventoryGrid,
  rows: GridRow[],
): string {
  const groups = ["", "", ...MONTH_GROUPS.flatMap((m) => [m, "", ""])];
  const head = ["Item No.", "Name", "Originally on Hand"];
  for (const m of MONTH_GROUPS) head.push(`${m} Rec'd`, `${m} Currently on Hand`);
  const lines = [groups.join(","), head.join(",")];
  for (const r of rows) {
    const key = r.key;
    const row: Array<Quantity | string> = [r.itemNo ?? "", r.name, grid.original[key] ?? null];
    for (const m of MONTH_GROUPS) {
      const cell = grid.months[key]?.[m];
      row.push(cell?.received ?? null, cell?.onHand ?? null);
    }
    lines.push(row.map(csvCell).join(","));
  }
  return lines.join("\n");
}
