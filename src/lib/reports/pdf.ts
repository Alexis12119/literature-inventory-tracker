import {
  CATALOG,
  FIXED_COLUMNS,
  INSTRUCTIONS_HEADING,
  INSTRUCTIONS_PARAGRAPHS,
  INSTRUCTION_5_BULLETS,
  INSTRUCTION_5_INTRO,
  MONTH_GROUPS,
  MONTH_SUBCOLUMNS,
  REPORT_TITLE,
  languageLabel,
  monthYearLine,
  type MonthGroup,
} from "@/src/lib/reports/template";
import { calculateMoved, type Quantity } from "@/src/lib/domain/movement";
import { pubKey, type InventoryGrid } from "@/src/features/inventory/store";
import type { LanguageCode } from "@/src/features/inventory/store";

/**
 * Custom PDF export (no browser-print dependency).
 *
 * Portrait A4, compact office-form styling that mirrors the paper report:
 * title, instructions (item 5 as bullets), Month & Year line, then the table
 * fitted to the page width. Body text 6pt, month sub-column labels 4pt —
 * matching the congregation's Google Docs sizing. `Moved` columns stay pale
 * gray (like the paper form) on every page.
 *
 * One month group is exported at a time (usually Feb/Aug, the service-year
 * end); "all six" remains available explicitly.
 */

// Item | Name | Rec'd | On Hand | Moved — single month (sums ≤ 194).
const SINGLE_WIDTHS = [14, 108, 22, 28, 20];
// Item | Name | Originally | 6 × (Rec'd | On Hand | Moved) — all six (sums ≤ 194).
const FULL_WIDTHS = [10, 38, 12, ...MONTH_GROUPS.flatMap(() => [7.5, 7.5, 7])];

const PAGE_W = 210;
const MARGIN = 8;
const USABLE = PAGE_W - MARGIN * 2; // 194mm
const BODY_SIZE = 6;
const SUB_SIZE = 4;
const GRAY: [number, number, number] = [229, 229, 234];

export interface PdfOptions {
  grid: InventoryGrid | null;
  carried?: Record<string, Quantity>;
  lang: LanguageCode;
  cycleId: string;
  cycleLabel: string;
  monthLabel: string;
  yearLabel: string;
  /** Month groups to include — defaults to Feb/Aug (service-year end). */
  months?: MonthGroup[];
}

function fmt(v: Quantity): string {
  return v === null ? "" : String(v);
}

export async function generateReportPdf(opts: PdfOptions): Promise<{
  bytes: ArrayBuffer;
  pages: number;
  filename: string;
}> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const langName = opts.lang === "tl" ? "tagalog" : "english";
  const months = opts.months && opts.months.length > 0 ? opts.months : (["Feb/Aug"] as MonthGroup[]);
  // Originally on Hand only appears in the full six-month report.
  const showOriginal = months.length > 1;
  const widths = showOriginal ? FULL_WIDTHS : SINGLE_WIDTHS;
  const fixed = showOriginal ? 3 : 2;
  const movedCols = new Set(months.map((_, i) => fixed + i * 3 + 2));
  const monthSlug = months.length === MONTH_GROUPS.length ? "all" : months.map((m) => m.replace("/", "").toLowerCase()).join("-");

  // ---- Heading block ----
  let y = 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(REPORT_TITLE, PAGE_W / 2, y, { align: "center" });
  y += 6;

  doc.setFontSize(BODY_SIZE);
  doc.text(INSTRUCTIONS_HEADING, MARGIN, y);
  const langText = languageLabel(opts.lang);
  doc.text(langText, PAGE_W - MARGIN, y, { align: "right" });
  y += 4;

  const para = (text: string, opts2?: { bullet?: boolean; bold?: boolean }) => {
    doc.setFont("helvetica", opts2?.bold ? "bold" : "normal");
    doc.setFontSize(BODY_SIZE);
    const prefix = opts2?.bullet ? "•  " : "";
    const lines = doc.splitTextToSize(prefix + text, USABLE - (opts2?.bullet ? 5 : 0)) as string[];
    doc.text(lines, MARGIN + (opts2?.bullet ? 5 : 0), y);
    y += lines.length * BODY_SIZE * 0.45 + 1;
  };

  for (const p of INSTRUCTIONS_PARAGRAPHS) para(p);
  para(INSTRUCTION_5_INTRO);
  for (const b of INSTRUCTION_5_BULLETS) para(b, { bullet: true });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(BODY_SIZE);
  y += 1;
  doc.text(monthYearLine(opts.monthLabel, opts.yearLabel), MARGIN, y);
  y += 4;

  // ---- Table ----
  const head = [
    [
      { content: FIXED_COLUMNS[0], rowSpan: 2 },
      { content: FIXED_COLUMNS[1], rowSpan: 2 },
      ...(showOriginal ? [{ content: FIXED_COLUMNS[2], rowSpan: 2 }] : []),
      ...months.flatMap((m) => [{ content: m, colSpan: 3 }]),
    ],
    months.flatMap(() =>
      MONTH_SUBCOLUMNS.map((s) => ({ content: s })),
    ),
  ];

  const body: string[][] = [];
  const sectionRows = new Set<number>();
  const blankTail = (n: number) => Array(n * 3).fill("");
  let seen = "";
  for (const r of CATALOG) {
    const key = pubKey(r.section, r.itemNo, r.name);
    if (r.section !== seen) {
      seen = r.section;
      sectionRows.add(body.length);
      body.push(["", r.section, ...(showOriginal ? [""] : []), ...blankTail(months.length)]);
    }
    const opening0 = opts.grid?.original[key] ?? opts.carried?.[key] ?? null;
    const cells: string[] = [
      r.itemNo ?? "",
      `${r.name}${r.code ? ` ${r.code}` : ""}`,
      ...(showOriginal ? [fmt(opening0)] : []),
    ];
    months.forEach((m) => {
      const mi = MONTH_GROUPS.indexOf(m);
      const cell = opts.grid?.months[key]?.[m];
      const opening =
        mi === 0
          ? opening0
          : (opts.grid?.months[key]?.[MONTH_GROUPS[mi - 1]]?.onHand ?? null);
      const moved = cell ? calculateMoved(opening, cell.received, cell.onHand) : null;
      cells.push(fmt(cell?.received ?? null), fmt(cell?.onHand ?? null), fmt(moved));
    });
    body.push(cells);
  }

  const columnStyles: Record<number, { cellWidth: number }> = {};
  widths.forEach((w, i) => {
    columnStyles[i] = { cellWidth: w };
  });

  autoTable(doc, {
    startY: y,
    margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
    head,
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: BODY_SIZE,
      cellPadding: 0.8,
      lineWidth: 0.15,
      lineColor: 20,
      textColor: 20,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fontSize: BODY_SIZE,
      fontStyle: "bold",
      halign: "center",
      fillColor: [255, 255, 255],
      textColor: 20,
    },
    columnStyles,
    showHead: "everyPage",
    didParseCell: (data) => {
      if (data.section === "head" && data.row.index === 1) {
        data.cell.styles.fontSize = SUB_SIZE;
        if (String(data.cell.text ?? "").includes("Moved")) {
          data.cell.styles.fillColor = GRAY;
        }
      }
      if (data.section === "body") {
        if (sectionRows.has(data.row.index)) {
          data.cell.styles.fontStyle = "bold";
        } else if (movedCols.has(data.column.index)) {
          data.cell.styles.fillColor = GRAY;
        }
        if (data.column.index >= fixed) data.cell.styles.halign = "center";
      }
    },
  });

  return {
    bytes: doc.output("arraybuffer"),
    pages: doc.getNumberOfPages(),
    filename: `monthly-movement-${langName}-${opts.cycleId}-${monthSlug}.pdf`,
  };
}
