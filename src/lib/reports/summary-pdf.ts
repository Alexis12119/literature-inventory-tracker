import type { InventoryGrid } from "@/src/features/inventory/store";
import type { GridRow, LanguageCode } from "@/src/features/inventory/store";
import type { Quantity } from "@/src/lib/domain/movement";
import { buildSummary, formatQty } from "@/src/lib/reports/summary";

/**
 * Congregation Literature summary PDF (JW Hub style) — portrait, three
 * columns with the Item column dominant. Header mirrors the source form:
 * contextual label, centered title, congregation, month | language, and the
 * submission count. Table headers repeat on continuation pages.
 */

const PAGE_W = 210;
const MARGIN = 10;
const USABLE = PAGE_W - MARGIN * 2; // 190mm
const TITLE_SIZE = 14;
const BODY_SIZE = 10;
const SMALL_SIZE = 8;

export interface SummaryPdfOptions {
  grid: InventoryGrid | null;
  carried?: Record<string, Quantity>;
  rows: GridRow[];
  lang: LanguageCode;
  cycleId: string;
  monthIndex: number;
  monthLabel: string;
  yearLabel: string;
  congregation: string;
}

export async function generateSummaryPdf(opts: SummaryPdfOptions): Promise<{
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

  let y = 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(SMALL_SIZE);
  doc.setTextColor(80);
  doc.text("Congregation Literature", MARGIN, y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(TITLE_SIZE);
  doc.setTextColor(20);
  doc.text("MONTHLY MOVEMENT OF LITERATURE", PAGE_W / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(BODY_SIZE);
  if (opts.congregation) {
    doc.text(opts.congregation, MARGIN, y);
    y += 6;
  }
  doc.setFont("helvetica", "normal");
  doc.text(
    `${opts.monthLabel} ${opts.yearLabel} | ${opts.lang === "tl" ? "Tagalog" : "English"}`,
    MARGIN,
    y,
  );
  y += 8;

  const sections = buildSummary(opts.grid, opts.monthIndex, opts.carried ?? {}, opts.rows);
  const body: string[][] = [];
  const sectionRows = new Set<number>();
  for (const sec of sections) {
    sectionRows.add(body.length);
    body.push([sec.section, "", ""]);
    for (const item of sec.items) {
      body.push([`${item.code ? `(${item.code}) ` : ""}${item.name}`, formatQty(item.onHand), formatQty(item.avgMoved)]);
    }
  }

  autoTable(doc, {
    startY: y,
    margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
    head: [[
      { content: "Item" },
      { content: "Current Quantity on Hand" },
      { content: "Average Monthly Movement" },
    ]],
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: BODY_SIZE,
      cellPadding: 1.5,
      lineWidth: 0.15,
      lineColor: 20,
      textColor: 20,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fontSize: SMALL_SIZE,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      fillColor: [255, 255, 255],
      textColor: 20,
    },
    columnStyles: {
      0: { cellWidth: USABLE - 74 },
      1: { cellWidth: 37, halign: "center" },
      2: { cellWidth: 37, halign: "center" },
    },
    showHead: "everyPage",
    rowPageBreak: "avoid",
    didParseCell: (data) => {
      if (data.section === "body" && sectionRows.has(data.row.index)) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  return {
    bytes: doc.output("arraybuffer"),
    pages: doc.getNumberOfPages(),
    filename: `literature-summary-${langName}-${opts.cycleId}.pdf`,
  };
}
