"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Plus, Save, Upload } from "lucide-react";
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

const EMPTY_MONTH: Record<MonthGroup, MonthCell> = {
  "Sep/Mar": { received: null, onHand: null },
  "Oct/Apr": { received: null, onHand: null },
  "Nov/May": { received: null, onHand: null },
  "Dec/June": { received: null, onHand: null },
  "Jan/July": { received: null, onHand: null },
  "Feb/Aug": { received: null, onHand: null },
};

// Stable fallbacks so memoized selectors below keep referential stability
// when no payload is loaded yet (avoids exhaustive-deps warnings and
// needless callback invalidation).
const EMPTY_ROWS: GridRow[] = [];
const EMPTY_CARRIED: {
  values: Record<string, Quantity>;
  sources: Record<string, string>;
  sourceLabel: string | null;
} = { values: {}, sources: {}, sourceLabel: null };

export function InventoryWorkspace() {
  const { cycles, selectedId: cycle, setSelectedId: setCycle, addServiceYear, canAddMore } = useCycles();
  const [lang, setLang] = useState<LanguageCode>("tl");
  const [month, setMonth] = useState<MonthGroup>(MONTH_GROUPS[5]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [category, setCategory] = useState("all");
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<GridPayload | null>(null);
  const [grid, setGrid] = useState<GridState>({ original: {}, cells: {} });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Revision counting drives manual save: every local edit bumps revision;
  // Save persists until the saved revision catches up. Nothing is written
  // until the user presses Save, so navigating away never triggers a
  // half-debounced write — unsaved edits stay visible as dirty instead.
  const [revision, setRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);

  const isDirty = revision !== savedRevision;

  const rows = useMemo<GridRow[]>(() => data?.rows ?? EMPTY_ROWS, [data]);
  const categories = useMemo(() => ["all", ...(data?.sections ?? [])], [data]);
  const carried = useMemo(() => data?.carried ?? EMPTY_CARRIED, [data]);

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

  // Manual save: diff against the loaded payload so a save touches only
  // changed rows (a full-grid write is ~700 sequential statements and times
  // out — that was the permanent "Couldn't save changes"). Overlapping edits
  // schedule follow-up saves via the revision counters instead of dropping.
  const saveNow = useCallback(async () => {
    if (saving) return false;
    if (revision === savedRevision) return true;
    if (!data) return false;
    const snap = { cycle, lang, grid, rows, revision, data };
    setSaving(true);
    setSaveError(null);
    try {
      const originals: Record<string, Quantity> = {};
      const keys = new Set([
        ...Object.keys(snap.grid.original),
        ...Object.keys(snap.data.original),
      ]);
      for (const k of keys) {
        const cur = snap.grid.original[k] ?? null;
        const loaded = snap.data.original[k] ?? null;
        if (cur !== loaded) originals[k] = cur;
      }
      const cells: Array<{ key: string; monthPos: number; received: Quantity; onHand: Quantity }> = [];
      for (const r of snap.rows) {
        MONTH_GROUPS.forEach((m, mi) => {
          const cur = snap.grid.cells[r.key]?.[m];
          const loaded = snap.data.cells[r.key]?.[m];
          if (!cur && !loaded) return;
          const curR = cur?.received ?? null;
          const curH = cur?.onHand ?? null;
          const loadedR = loaded?.received ?? null;
          const loadedH = loaded?.onHand ?? null;
          if (curR !== loadedR || curH !== loadedH) {
            cells.push({ key: r.key, monthPos: mi + 1, received: curR, onHand: curH });
          }
        });
      }
      if (Object.keys(originals).length === 0 && cells.length === 0) {
        setSavedRevision(snap.revision);
        return true;
      }
      await saveInventoryGrid({ periodKey: snap.cycle, lang: snap.lang, originals, cells });
      setSavedRevision(snap.revision);
      return true;
    } catch (e) {
      setSaveError(e instanceof Error && e.message ? e.message : "Couldn't save changes");
      return false;
    } finally {
      setSaving(false);
    }
  }, [saving, revision, savedRevision, data, cycle, lang, grid, rows]);

  // Warn on refresh/close with unsaved edits. (Client-side route changes
  // unmount without firing this, so the Save button + dirty badge are the
  // primary guard — this covers reloads and tab closes.)
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

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

  // Switching cycle/language with unsaved edits saves first so nothing is
  // lost. A failed save blocks the switch and surfaces the error pill.
  // The reload for the new context resets the counters afterwards.
  const switchContext = useCallback(
    async (nextCycle: string, nextLang: LanguageCode) => {
      if (nextCycle === cycle && nextLang === lang) return;
      if (revision !== savedRevision) {
        const ok = await saveNow();
        if (!ok) return;
      }
      setCycle(nextCycle);
      setLang(nextLang);
    },
    [revision, savedRevision, saveNow, cycle, lang, setCycle],
  );

  const carriedCount = useMemo(
    () =>
      rows.filter((r) => (grid.original[r.key] ?? null) === null && carried.values[r.key] != null).length,
    [rows, grid, carried],
  );

  const applySheet = useCallback(
    async (item: SheetImportRequest) => {
      if (item.cycleId === cycle && item.lang === lang) {
        // Current workspace: merge locally for review — press Save to persist.
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
    },
    [cycle, lang, rows],
  );

  return (
    <div className="page-content flex flex-col gap-4 pb-8">
      <StickyBar className="no-print flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto min-w-[9rem]">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Inventory</h1>
            <p className="mt-0.5 text-sm text-zinc-500">Enter monthly stock and physical counts.</p>
          </div>
          <div className="flex overflow-hidden rounded-lg border border-zinc-300" role="group" aria-label="Language">
            {(["en", "tl"] as LanguageCode[]).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lang === l}
                onClick={() => void switchContext(cycle, l)}
                className={`h-10 px-4 text-sm font-semibold ${lang === l ? "bg-accent text-white" : "bg-white text-zinc-700 hover:bg-zinc-50"}`}
              >
                {l === "en" ? "English" : "Tagalog"}
              </button>
            ))}
          </div>
          {carriedCount > 0 && (
              <span className="inline-flex items-center rounded-full border border-[#cad9cd] bg-[#edf4ee] px-2 py-0.5 text-xs font-medium text-[#315b4b]">
              {carriedCount} carried from {carried.sourceLabel}
            </span>
          )}
          {isDirty ? (
            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
              Unsaved changes
            </span>
          ) : revision > 0 ? (
            <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
              Saved
            </span>
          ) : null}
          <span className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!isDirty || saving || !data}
              onClick={() => void saveNow()}
              title="Save inventory changes"
              aria-label="Save inventory changes"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover disabled:opacity-60"
            >
              {saving ? (
                <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#a9c0ae] border-t-white" />
              ) : (
                <Save size={14} aria-hidden />
              )}
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={exporting || !data}
              onClick={async () => {
                setExporting(true);
                try {
                  // Yield so the busy state paints before the synchronous build.
                  await new Promise((r) => setTimeout(r, 30));
                  downloadTextFile(
                    `inventory-${cycle}-${lang}.csv`,
                    buildExportCsv({ original: grid.original, months: grid.cells }, rows),
                  );
                } finally {
                  setExporting(false);
                }
              }}
              title="Download this workspace as CSV"
              aria-label="Export workspace as CSV"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold shadow-sm hover:bg-zinc-50 disabled:opacity-60"
            >
              {exporting ? (
                <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-accent" />
              ) : (
                <Download size={14} aria-hidden />
              )}
              {exporting ? "Preparing…" : "Export"}
            </button>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              title="Import previous records from a spreadsheet"
              aria-label="Import previous records"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold shadow-sm hover:bg-zinc-50"
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
              onClick={() => void saveNow()}
              className="rounded-md border border-red-300 px-2 py-0.5 font-medium hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}
        {/* Controls */}
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:grid-cols-2 sm:p-4 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            <span id="cycle-label">Reporting cycle</span>
            <div className="flex gap-1" role="group" aria-labelledby="cycle-label">
              <Select value={cycle} onChange={(e) => void switchContext(e.target.value, lang)} aria-label="Reporting cycle" className="min-w-0 flex-1">
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
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            Search
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, item, code…" aria-label="Publication search" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            Month
            <Select value={month} onChange={(e) => setMonth(e.target.value as MonthGroup)} aria-label="Current month">
              {MONTH_GROUPS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
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
        onApplySheet={(item) => applySheet(item)}
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
