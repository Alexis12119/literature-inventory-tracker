"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Plus, Upload } from "lucide-react";
import { MONTH_GROUPS, type MonthGroup } from "@/src/lib/reports/template";
import { Button, Input, Select, StickyBar } from "@/src/components/ui/controls";
import { mergeImportPatch, type GridRow, type LanguageCode, type MonthCell } from "@/src/features/inventory/store";
import type { Quantity } from "@/src/lib/domain/movement";
import { useDebouncedValue } from "@/src/lib/use-debounced-value";
import { useCycles } from "@/src/features/inventory/cycles";
import { buildExportCsv } from "@/src/features/import/mapping";
import { ImportDialog, downloadTextFile, type SheetImportRequest } from "@/src/features/import/Importer";
import { InventoryDesktopGrid, InventoryMobileCards } from "@/src/features/inventory/grids";
import {
  getInventoryGrid,
  importInventorySheets,
  saveInventoryGrid,
  type GridPayload,
} from "@/src/features/inventory/actions";

interface GridState {
  original: Record<string, Quantity>;
  cells: Record<string, Record<MonthGroup, MonthCell>>;
}

const AUTOSAVE_DELAY = 1500;

const EMPTY_MONTH: Record<MonthGroup, MonthCell> = {
  "Sep/Mar": { received: null, onHand: null },
  "Oct/Apr": { received: null, onHand: null },
  "Nov/May": { received: null, onHand: null },
  "Dec/June": { received: null, onHand: null },
  "Jan/July": { received: null, onHand: null },
  "Feb/Aug": { received: null, onHand: null },
};

export function InventoryWorkspace() {
  const { cycles, selectedId: cycle, setSelectedId: setCycle, addServiceYear, canAddMore } = useCycles();
  const [lang, setLang] = useState<LanguageCode>("tl");
  const [month, setMonth] = useState<MonthGroup>(MONTH_GROUPS[5]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [category, setCategory] = useState("all");
  const [importOpen, setImportOpen] = useState(false);
  const [data, setData] = useState<GridPayload | null>(null);
  const [grid, setGrid] = useState<GridState>({ original: {}, cells: {} });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Revision counting drives autosave: every local edit bumps revision; the
  // effect persists until the saved revision catches up — no edit is lost
  // even when edits land mid-save.
  const [revision, setRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);
  const [retryKey, setRetryKey] = useState(0);

  const rows: GridRow[] = data?.rows ?? [];
  const categories = useMemo(() => ["all", ...(data?.sections ?? [])], [data]);
  const carried = data?.carried ?? { values: {}, sources: {}, sourceLabel: null };

  const reload = useCallback(async () => {
    setLoadError(null);
    setData(null);
    try {
      const payload = await getInventoryGrid(cycle, lang);
      setData(payload);
      setGrid({ original: { ...payload.original }, cells: JSON.parse(JSON.stringify(payload.cells)) });
      setRevision(0);
      setSavedRevision(0);
      setSaveError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load this workspace.");
    }
  }, [cycle, lang]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) void reload();
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  // Autosave: debounce on revision; each attempt snapshots its own revision
  // so overlapping edits schedule follow-up saves instead of being dropped.
  useEffect(() => {
    if (revision === 0 || revision === savedRevision) return;
    const snap = { cycle, lang, grid, rows, revision };
    const t = setTimeout(() => {
      (async () => {
        try {
          const cells: Array<{ key: string; monthPos: number; received: Quantity; onHand: Quantity }> = [];
          for (const r of snap.rows) {
            MONTH_GROUPS.forEach((m, mi) => {
              const cell = snap.grid.cells[r.key]?.[m];
              if (!cell) return;
              cells.push({ key: r.key, monthPos: mi + 1, received: cell.received, onHand: cell.onHand });
            });
          }
          await saveInventoryGrid({ periodKey: snap.cycle, lang: snap.lang, originals: snap.grid.original, cells });
          setSaveError(null);
          setSavedRevision(snap.revision);
        } catch {
          setSaveError("Couldn't save changes");
        }
      })();
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, savedRevision, retryKey, cycle, lang]);

  const setCell = useCallback(
    (key: string, m: MonthGroup | "original", field: "received" | "onHand" | "original", value: Quantity) => {
      setGrid((g) => {
        if (m === "original") return { ...g, original: { ...g.original, [key]: value } };
        const perMonth = g.cells[key] ?? { ...EMPTY_MONTH };
        return {
          ...g,
          cells: { ...g.cells, [key]: { ...perMonth, [m]: { ...perMonth[m], [field]: value } } },
        };
      });
      setRevision((v) => v + 1);
    },
    [],
  );

  // Flush pending edits before switching context so nothing is lost. The
  // reload for the new context resets the counters afterwards.
  const switchContext = useCallback(
    (nextCycle: string, nextLang: LanguageCode) => {
      if (revision !== savedRevision) {
        const snap = { grid, rows, revision };
        void (async () => {
          try {
            const cells: Array<{ key: string; monthPos: number; received: Quantity; onHand: Quantity }> = [];
            for (const r of snap.rows) {
              MONTH_GROUPS.forEach((m, mi) => {
                const cell = snap.grid.cells[r.key]?.[m];
                if (!cell) return;
                cells.push({ key: r.key, monthPos: mi + 1, received: cell.received, onHand: cell.onHand });
              });
            }
            await saveInventoryGrid({ periodKey: cycle, lang, originals: snap.grid.original, cells });
          } catch {
            /* surfaced as a pending revision on return; the error pill shows */
          }
        })();
      }
      setCycle(nextCycle);
      setLang(nextLang);
    },
    [revision, savedRevision, grid, rows, cycle, lang, setCycle],
  );

  const carriedCount = useMemo(
    () =>
      rows.filter((r) => (grid.original[r.key] ?? null) === null && carried.values[r.key] != null).length,
    [rows, grid, carried],
  );

  const applySheets = useCallback(
    async (items: SheetImportRequest[]) => {
      for (const item of items) {
        if (item.cycleId === cycle && item.lang === lang) {
          // Current workspace: merge locally for review — autosave persists it.
          setGrid((g) => {
            const base = { original: { ...g.original } as Record<string, Quantity>, months: {} as Record<string, Record<MonthGroup, MonthCell>> };
            for (const r of rows) {
              base.months[r.key] = { ...(g.cells[r.key] ?? {}) } as Record<MonthGroup, MonthCell>;
            }
            const merged = mergeImportPatch(
              { original: base.original, months: base.months },
              item.mapped,
            );
            const cells: Record<string, Record<MonthGroup, MonthCell>> = {};
            for (const [k, v] of Object.entries(merged.grid.months)) cells[k] = v;
            return { original: merged.grid.original, cells };
          });
          setRevision((v) => v + 1);
        } else {
          await importInventorySheets([
            { periodKey: item.cycleId, lang: item.lang, patch: item.mapped },
          ]);
        }
      }
    },
    [cycle, lang, rows],
  );

  return (
    <div className="flex flex-col gap-3 py-4">
      <StickyBar className="no-print flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight">Inventory</h1>
          {carriedCount > 0 && (
            <span className="inline-flex items-center rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
              {carriedCount} carried from {carried.sourceLabel}
            </span>
          )}
          <span className="ml-auto flex gap-1.5">
            <button
              type="button"
              onClick={() => downloadTextFile(`inventory-${cycle}-${lang}.csv`, buildExportCsv({ original: grid.original, months: grid.cells }, rows))}
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
          </span>
        </div>
        {saveError && (
          <div role="alert" className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
            <span>{saveError}</span>
            <button
              type="button"
              onClick={() => {
                setSaveError(null);
                setRetryKey((k) => k + 1);
              }}
              className="rounded-md border border-red-300 px-2 py-0.5 font-medium hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}
        {/* Controls */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-5">
          <div className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            <span id="cycle-label">Reporting cycle</span>
            <div className="flex gap-1" role="group" aria-labelledby="cycle-label">
              <Select value={cycle} onChange={(e) => switchContext(e.target.value, lang)} aria-label="Reporting cycle" className="min-w-0 flex-1">
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
                  onClick={() => switchContext(cycle, l)}
                  className={`h-9 flex-1 text-sm font-medium ${lang === l ? "bg-blue-700 text-white" : "bg-white text-zinc-700 hover:bg-zinc-50"}`}
                >
                  {l === "en" ? "English" : "Tagalog"}
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            Search
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, item, code…" aria-label="Publication search" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            Month
            <Select value={month} onChange={(e) => setMonth(e.target.value as MonthGroup)} aria-label="Current month">
              {MONTH_GROUPS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            Category
            <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category filter">
              {categories.map((c) => (
                <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>
              ))}
            </Select>
          </label>
        </div>
      </StickyBar>
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        cycles={cycles}
        onApplyAll={(items) => void applySheets(items)}
      />

      {loadError ? (
        <div role="alert" className="flex flex-col items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-8 text-center">
          <p className="text-sm font-semibold">Could not load this workspace</p>
          <p className="max-w-md text-sm text-zinc-500">{loadError}</p>
          <Button variant="secondary" onClick={() => void reload()}>Retry</Button>
        </div>
      ) : !data ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading inventory">
          <div className="h-24 animate-pulse rounded-lg border border-zinc-200 bg-white" />
          <div className="h-64 animate-pulse rounded-lg border border-zinc-200 bg-white" />
        </div>
      ) : (
        <>
          {/* Desktop grid */}
          <div className="hidden md:block">
            <InventoryDesktopGrid grid={{ original: grid.original, months: grid.cells }} rows={rows} search={debouncedSearch} category={category} setCell={setCell} carriedValues={carried.values} carriedSources={carried.sources} />
          </div>
          {/* Mobile cards */}
          <InventoryMobileCards grid={{ original: grid.original, months: grid.cells }} rows={rows} month={month} search={debouncedSearch} category={category} setCell={setCell} carriedValues={carried.values} />
        </>
      )}
    </div>
  );
}
