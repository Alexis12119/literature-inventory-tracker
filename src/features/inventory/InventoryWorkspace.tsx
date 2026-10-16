"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Plus, Printer, Save, Upload } from "lucide-react";
import { MONTH_GROUPS, type MonthGroup } from "@/src/lib/reports/template";
import { Badge, Button, Input, Select, StickyBar } from "@/src/components/ui/controls";
import { blankGrid, mergeImportPatch, useInventoryGrid, type LanguageCode } from "@/src/features/inventory/store";
import { useCarriedOriginals } from "@/src/features/inventory/carry";
import { useCatalog } from "@/src/features/catalog/store";
import { useCycles } from "@/src/features/inventory/cycles";
import { buildExportCsv } from "@/src/features/import/mapping";
import { ImportDialog, downloadTextFile, type SheetImportRequest } from "@/src/features/import/Importer";
import { InventoryDesktopGrid, InventoryMobileCards } from "@/src/features/inventory/grids";

export function InventoryWorkspace() {
  const { cycles, selectedId: cycle, setSelectedId: setCycle, addServiceYear, canAddMore } = useCycles();
  const [lang, setLang] = useState<LanguageCode>("tl");
  const [month, setMonth] = useState<MonthGroup>(MONTH_GROUPS[5]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [importOpen, setImportOpen] = useState(false);
  const catalog = useCatalog();
  const categories = useMemo(() => ["all", ...catalog.sections], [catalog.sections]);
  const carried = useCarriedOriginals(cycle, lang);
  const { grid, setCell, save, status, savedAt, missingInMonth, applyImport } = useInventoryGrid(cycle, lang, carried.values, catalog.rows);
  const missing = useMemo(() => missingInMonth(month), [missingInMonth, month]);
  const carriedCount = useMemo(
    () =>
      carried.ready
        ? catalog.rows.filter((r) => {
            return (grid.original[r.key] ?? null) === null && carried.values[r.key] != null;
          }).length
        : 0,
    [carried, grid, catalog.rows],
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Sticky filter bar: stays pinned while scrolling through publication rows. */}
      <StickyBar className="no-print flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight">Inventory</h1>
          <Badge tone="neutral">Frontend preview · saves locally</Badge>
        </div>
        {/* Controls */}
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 bg-white p-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            <span id="cycle-label">Reporting cycle</span>
            <div className="flex gap-1" role="group" aria-labelledby="cycle-label">
              <Select value={cycle} onChange={(e) => setCycle(e.target.value)} aria-label="Reporting cycle" className="min-w-0 flex-1">
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
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
                <button
                  key={l}
                  type="button"
                  aria-pressed={lang === l}
                  onClick={() => setLang(l)}
                  className={`h-9 flex-1 text-sm font-medium ${lang === l ? "bg-blue-700 text-white" : "bg-white text-zinc-700 hover:bg-zinc-50"}`}
                >
                  {l === "en" ? "English" : "Tagalog"}
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            Month
            <Select value={month} onChange={(e) => setMonth(e.target.value as MonthGroup)} aria-label="Current month">
              {MONTH_GROUPS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            Search
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, item, code…" aria-label="Publication search" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            Category
            <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category filter">
              {categories.map((c) => (
                <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>
              ))}
            </Select>
          </label>
          <div className="flex items-end gap-2">
            <Button onClick={save} className="flex-1">
              <Save size={15} aria-hidden /> Save
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge tone={missing === 0 ? "success" : "warning"}>
            {missing === 0 ? "No missing counts" : `${missing} missing in ${month}`}
          </Badge>
          <Badge tone={status === "saved" ? "success" : status === "pending" ? "warning" : "danger"}>
            {status === "saved" ? `Saved${savedAt ? ` · ${new Date(savedAt).toLocaleString()}` : ""}` : status === "pending" ? "Unsaved changes" : "Save failed — retry"}
          </Badge>
          {carriedCount > 0 && (
            <Badge tone="info">
              {carriedCount} originals carried from {carried.sourceLabel}
            </Badge>
          )}
          <span className="text-zinc-500">Blank = not counted · 0 = counted zero · gray Moved is calculated. Blue dashed originals are carried from the previous report and update automatically — typing overrides them.</span>
          <span className="ml-auto flex gap-1.5">
            <button
              type="button"
              onClick={() => downloadTextFile(`inventory-${cycle}-${lang}.csv`, buildExportCsv(grid))}
              title="Download this workspace as CSV"
              aria-label="Export workspace as CSV"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium hover:bg-zinc-50"
            >
              <Download size={14} aria-hidden /> Export
            </button>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              title="Import previous records from a spreadsheet"
              aria-label="Import previous records"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium hover:bg-zinc-50"
            >
              <Upload size={14} aria-hidden /> Import
            </button>
            <Link href="/reports" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium hover:bg-zinc-50">
              <Printer size={14} aria-hidden /> Report preview
            </Link>
          </span>
        </div>
      </StickyBar>
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        cycles={cycles}
        onApplyAll={(items: SheetImportRequest[]) => {
          let total = 0;
          const applied: string[] = [];
          for (const item of items) {
            if (item.cycleId === cycle && item.lang === lang) {
              const counts = applyImport(item.mapped);
              total += counts.original + counts.received + counts.onHand;
            } else {
              // Historical reports have no open workspace: merge straight into storage.
              try {
                const key = `litinv:grid:${item.cycleId}:${item.lang}`;
                const raw = window.localStorage.getItem(key);
                const base = raw ? (JSON.parse(raw) as ReturnType<typeof blankGrid>) : blankGrid();
                const merged = mergeImportPatch(base, item.mapped);
                window.localStorage.setItem(key, JSON.stringify(merged.grid));
                window.localStorage.setItem(`${key}:at`, new Date().toISOString());
                total += merged.counts.original + merged.counts.received + merged.counts.onHand;
              } catch {
                /* local preview cache only */
              }
            }
            applied.push(`${item.sheetName} → ${item.cycleId}/${item.lang.toUpperCase()}`);
          }
          try {
            const raw = window.localStorage.getItem("litinv:activity");
            const log = raw ? (JSON.parse(raw) as Array<Record<string, string>>) : [];
            log.unshift({
              at: new Date().toISOString(),
              action: "inventory.import",
              detail: `Imported ${total} values: ${applied.join("; ")}`,
            });
            window.localStorage.setItem("litinv:activity", JSON.stringify(log.slice(0, 100)));
          } catch {
            /* local preview cache only */
          }
        }}
      />

      {/* Desktop grid */}
      <div className="hidden md:block">
        <InventoryDesktopGrid grid={grid} rows={catalog.rows} search={search} category={category} setCell={setCell} carriedValues={carried.values} carriedSources={carried.sources} />
      </div>
      {/* Mobile cards */}
      <InventoryMobileCards grid={grid} rows={catalog.rows} month={month} search={search} category={category} setCell={setCell} carriedValues={carried.values} />
    </div>
  );
}
