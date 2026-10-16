"use client";

import { CATALOG, FIXED_COLUMNS, INSTRUCTIONS_HEADING, INSTRUCTIONS_PARAGRAPHS, INSTRUCTION_5_BULLETS, INSTRUCTION_5_INTRO, MONTH_GROUPS, MONTH_SUBCOLUMNS, REPORT_TITLE, languageLabel, monthYearLine, type MonthGroup } from "@/src/lib/reports/template";
import { calculateMoved, type Quantity } from "@/src/lib/domain/movement";
import type { InventoryGrid } from "@/src/features/inventory/store";
import { pubKey } from "@/src/features/inventory/store";
import type { LanguageCode } from "@/src/features/inventory/store";

export function ReportView({
  grid,
  lang,
  monthLabel,
  yearLabel,
  carried = {},
  months = [...MONTH_GROUPS],
}: {
  grid: InventoryGrid | null;
  lang: LanguageCode;
  monthLabel: string;
  yearLabel: string;
  carried?: Record<string, Quantity>;
  /** Month groups to render — usually just Feb/Aug (service-year end). */
  months?: MonthGroup[];
}) {
  const showOriginal = months.length > 1;
  const rows: React.ReactNode[] = [];
  let seen = "";
  for (const r of CATALOG) {
    const key = pubKey(r.section, r.itemNo, r.name);
    if (r.section !== seen) {
      seen = r.section;
      rows.push(
        <tr key={`sec-${r.section}`} className="section-row">
          <td />
          <td className="name-cell">{r.section}</td>
          {showOriginal && <td />}
          {months.flatMap((m) => [
            <td key={`${r.section}-${m}-r`} />,
            <td key={`${r.section}-${m}-c`} />,
            <td key={`${r.section}-${m}-m`} className="moved-col" />,
          ])}
        </tr>,
      );
    }
    const openingFor = (mi: number): Quantity =>
      mi === 0
        ? (grid?.original[key] ?? carried[key] ?? null)
        : (grid?.months[key]?.[MONTH_GROUPS[mi - 1]]?.onHand ?? null);
    const originalShown = grid?.original[key] ?? carried[key] ?? null;
    rows.push(
      <tr key={key}>
        <td className="num-cell">{r.itemNo ?? ""}</td>
        <td className="name-cell">{r.name}{r.code ? ` ${r.code}` : ""}</td>
        {showOriginal && <td className="num-cell">{fmt(originalShown)}</td>}
          {months.map((m: MonthGroup) => {
            // True position keeps carry-forward correct even when earlier
            // groups are hidden from the report.
            const mi = MONTH_GROUPS.indexOf(m);
            const cell = grid?.months[key]?.[m];
            const moved = cell ? calculateMoved(openingFor(mi), cell.received, cell.onHand) : null;
          return [
            <td key={`${key}-${m}-r`} className="num-cell">{fmt(cell?.received ?? null)}</td>,
            <td key={`${key}-${m}-c`} className="num-cell">{fmt(cell?.onHand ?? null)}</td>,
            <td key={`${key}-${m}-m`} className="num-cell moved-col">{fmt(moved)}</td>,
          ];
        })}
      </tr>,
    );
  }
  return (
    <section className="report-sheet rounded-lg border border-zinc-300 p-4" aria-label="Monthly Movement of Literature report">
      <h2 className="text-center text-base font-bold uppercase tracking-wide">{REPORT_TITLE}</h2>
      <div className="mt-2 flex items-start justify-between gap-4 text-[6pt]">
        <p className="font-bold">{INSTRUCTIONS_HEADING}</p>
        <p className="font-bold">{languageLabel(lang)}</p>
      </div>
      <ol className="mt-1 list-none space-y-1 text-[6pt] leading-snug">
        {INSTRUCTIONS_PARAGRAPHS.map((p) => (
          <li key={p.slice(0, 24)}>{p}</li>
        ))}
        <li>
          {INSTRUCTION_5_INTRO}
          <ul className="mt-0.5 list-disc space-y-0.5 pl-5">
            {INSTRUCTION_5_BULLETS.map((b) => (
              <li key={b.slice(0, 8)}>{b}</li>
            ))}
          </ul>
        </li>
      </ol>
      <p className="mt-2 text-[6pt] font-semibold">{monthYearLine(monthLabel, yearLabel)}</p>

      <div className="report-scroll mt-2 overflow-x-auto">
        <table className={months.length > 1 ? "report-grid min-w-300" : "report-grid"}>
          <thead>
            <tr>
              <th scope="col" rowSpan={2}>
                {FIXED_COLUMNS[0]}
              </th>
              <th scope="col" rowSpan={2} className="name-cell" style={showOriginal ? undefined : { width: "40%" }}>
                {FIXED_COLUMNS[1]}
              </th>
              {showOriginal && (
                <th scope="col" rowSpan={2}>
                  {FIXED_COLUMNS[2]}
                </th>
              )}
              {months.map((m) => (
                <th key={m} scope="col" colSpan={3}>{m}</th>
              ))}
            </tr>
            <tr className="report-sub">
              {months.map((m) => MONTH_SUBCOLUMNS.map((s) => (
                <th key={`${m}-${s}`} scope="col" className={s === "Moved" ? "moved-col" : undefined}>{s}</th>
              )))}
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function fmt(v: Quantity): string {
  return v === null ? "" : String(v);
}
