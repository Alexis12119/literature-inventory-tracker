"use client";

import { useEffect, useState } from "react";
import { FileDown, Plus, Printer } from "lucide-react";
import { Button, Select, StickyBar } from "@/src/components/ui/controls";
import { ReportView } from "@/src/components/reports/ReportView";
import { blankGrid, type InventoryGrid, type LanguageCode } from "@/src/features/inventory/store";
import { useCarriedOriginals } from "@/src/features/inventory/carry";
import { MONTH_NAMES, monthsForCycle, orderFromId, useCycles } from "@/src/features/inventory/cycles";
import { MONTH_GROUPS, type MonthGroup } from "@/src/lib/reports/template";

export default function ReportsPage() {
  const { cycles, selectedId: cycle, setSelectedId, addServiceYear, canAddMore } = useCycles();
  const [lang, setLang] = useState<LanguageCode>("tl");
  const [month, setMonth] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [grid, setGrid] = useState<InventoryGrid | null>(null);
  const carried = useCarriedOriginals(cycle, lang);
  const [pdfBusy, setPdfBusy] = useState(false);
  const activeCycle = cycles.find((c) => c.id === cycle);

  // One month control drives everything: the Month & Year label and the
  // exported column. Options follow the cycle, defaulting to its end.
  const order = orderFromId(cycle) ?? 0;
  const options = monthsForCycle(order);
  const active = options.find((o) => o.label === month) ?? options[options.length - 1];
  const reportMonths: MonthGroup[] = showAll
    ? [...MONTH_GROUPS]
    : [MONTH_GROUPS[active?.groupIndex ?? 5]];
  const monthLabel = active ? MONTH_NAMES[active.monthIndex] : month;
  const yearLabel = active ? String(active.year) : "";

  const selectCycle = (id: string) => {
    setSelectedId(id);
    const ms = monthsForCycle(orderFromId(id) ?? 0);
    if (ms.length > 0) setMonth(ms[ms.length - 1].label);
  };

  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      const { generateReportPdf } = await import("@/src/lib/reports/pdf");
      const pdf = await generateReportPdf({
        grid,
        carried: carried.values,
        lang,
        cycleId: cycle,
        cycleLabel: activeCycle?.label ?? cycle,
        monthLabel,
        yearLabel,
        months: reportMonths,
      });
      const blob = new Blob([pdf.bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdf.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setPdfBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const raw = window.localStorage.getItem(`litinv:grid:${cycle}:${lang}`);
        setGrid(raw ? (JSON.parse(raw) as InventoryGrid) : blankGrid());
      } catch {
        setGrid(blankGrid());
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cycle, lang]);

  return (
    <div className="flex flex-col gap-3">
      <StickyBar className="no-print flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight">Reports</h1>
          <div className="ml-auto flex gap-2">
            <Button onClick={() => void downloadPdf()} disabled={pdfBusy}>
              <FileDown size={15} aria-hidden /> {pdfBusy ? "Building…" : "Download PDF"}
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={15} aria-hidden /> Print
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 bg-white p-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            <span id="report-cycle-label">Cycle</span>
            <div className="flex gap-1" role="group" aria-labelledby="report-cycle-label">
              <Select value={cycle} onChange={(e) => selectCycle(e.target.value)} aria-label="Reporting cycle" className="min-w-0 flex-1">
                {cycles.map((c) => (<option key={c.id} value={c.id}>{c.label}</option>))}
              </Select>
              <Button
                type="button"
                variant="secondary"
                onClick={addServiceYear}
                disabled={!canAddMore}
                title="Add another service year"
                aria-label="Add another service year"
                className="shrink-0 px-2.5"
              >
                <Plus size={15} aria-hidden />
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            Language
            <div className="flex overflow-hidden rounded-md border border-zinc-300" role="group" aria-label="Language">
              {(["en", "tl"] as LanguageCode[]).map((l) => (
                <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}
                  className={`h-9 flex-1 text-sm font-medium ${lang === l ? "bg-blue-700 text-white" : "bg-white text-zinc-700"}`}>
                  {l === "en" ? "English" : "Tagalog"}
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            Report month
            <Select value={active?.label ?? ""} onChange={(e) => setMonth(e.target.value)} disabled={showAll} aria-label="Report month">
              {options.map((o) => (
                <option key={o.label} value={o.label}>
                  {o.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="h-4 w-4 accent-blue-700"
            />
            All six months
          </label>
        </div>
      </StickyBar>

      <ReportView
        grid={grid}
        lang={lang}
        monthLabel={monthLabel}
        yearLabel={yearLabel}
        carried={carried.values}
        months={reportMonths}
      />
    </div>
  );
}
