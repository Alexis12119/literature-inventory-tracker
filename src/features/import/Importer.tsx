"use client";

import { useState } from "react";
import { Download, FileUp, X } from "lucide-react";
import { Badge, Button, Select } from "@/src/components/ui/controls";
import {
  buildTemplateCsv,
  mapSheet,
  monthYearOf,
  sheetTarget,
  type MappedImport,
  type SheetTarget,
} from "@/src/features/import/mapping";
import type { Cycle } from "@/src/features/inventory/cycles";
import type { LanguageCode } from "@/src/features/inventory/store";

export function downloadTextFile(filename: string, text: string, mime = "text/csv") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface SheetImportRequest {
  sheetName: string;
  cycleId: string;
  lang: LanguageCode;
  mapped: MappedImport;
}

interface SheetRow {
  sheetName: string;
  target: SheetTarget | null;
  monthYear: string | null;
  mapped: MappedImport;
  checked: boolean;
  overrideCycle: string | null;
}

function cellsTotal(m: MappedImport): number {
  return (
    Object.keys(m.original).length +
    Object.values(m.received).reduce((a, p) => a + Object.keys(p).length, 0) +
    Object.values(m.onHand).reduce((a, p) => a + Object.keys(p).length, 0)
  );
}

export function ImportDialog({
  open,
  onClose,
  cycles,
  onApplyAll,
}: {
  open: boolean;
  onClose: () => void;
  cycles: Cycle[];
  onApplyAll: (items: SheetImportRequest[]) => void;
}) {
  const [sheets, setSheets] = useState<SheetRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  if (!open) return null;

  const reset = () => {
    setSheets(null);
    setFileName(null);
    setError(null);
  };

  const cycleLabel = (id: string) => cycles.find((c) => c.id === id)?.label ?? id;

  const parseFile = async (file: File) => {
    setParsing(true);
    setError(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const rows: SheetRow[] = wb.SheetNames.map((name) => {
        const table = XLSX.utils.sheet_to_json<unknown[]>(
          wb.Sheets[name],
          { header: 1, raw: true, defval: null },
        );
        const target = sheetTarget(name);
        return {
          sheetName: name,
          target,
          monthYear: monthYearOf(table),
          mapped: mapSheet(table),
          checked: target !== null,
          overrideCycle: null,
        };
      });
      if (rows.length === 0) throw new Error("No worksheets found");
      setSheets(rows);
      setFileName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file");
      setSheets(null);
    } finally {
      setParsing(false);
    }
  };

  const resolved = (s: SheetRow): SheetTarget | null =>
    s.overrideCycle ? { cycleId: s.overrideCycle, lang: s.target?.lang ?? "tl" } : s.target;

  const checked = (sheets ?? []).filter((s) => s.checked && resolved(s));
  const dupes = new Set(
    checked
      .map((s) => {
        const t = resolved(s)!;
        return `${t.cycleId}::${t.lang}`;
      })
      .filter((key, _, all) => all.filter((k) => k === key).length > 1),
  );

  const apply = () => {
    onApplyAll(
      checked.map((s) => {
        const t = resolved(s)!;
        return { sheetName: s.sheetName, cycleId: t.cycleId, lang: t.lang, mapped: s.mapped };
      }),
    );
    reset();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Import previous records"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-3 overflow-y-auto rounded-lg bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold">Import previous records</h2>
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            aria-label="Close import dialog"
            className="ml-auto rounded-md p-1.5 hover:bg-zinc-100"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <p className="text-sm text-zinc-600">
          Upload the inventory workbook (<code>.xlsx</code>). Every sheet is read: rows match by item
          number, then name; section headers and <code>Moved</code> columns are skipped. Imported
          values merge in — blanks never overwrite. Sheets whose <em>Month &amp; Year</em> looks
          stale can be retargeted below before applying.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => downloadTextFile("inventory-template.csv", buildTemplateCsv())}
          >
            <Download size={15} aria-hidden /> CSV template
          </Button>
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-zinc-300 bg-white px-3.5 text-sm font-medium hover:bg-zinc-50">
            <FileUp size={15} aria-hidden /> {parsing ? "Reading…" : fileName ?? "Choose workbook"}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              disabled={parsing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void parseFile(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        {sheets && (
          <div className="flex flex-col gap-2">
            {dupes.size > 0 && (
              <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Two checked sheets target the same report — both will merge, later sheets win on
                conflicts. Uncheck or retarget one if that is not intended.
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {sheets.map((s) => {
                const t = resolved(s);
                const total = cellsTotal(s.mapped);
                const key = t ? `${t.cycleId}::${t.lang}` : "";
                return (
                  <li
                    key={s.sheetName}
                    className={`rounded-lg border p-3 ${s.checked && t ? "border-blue-300 bg-blue-50/40" : "border-zinc-200 bg-white"}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="checkbox"
                        checked={s.checked}
                        disabled={!t && !s.overrideCycle}
                        onChange={() =>
                          setSheets((prev) =>
                            prev!.map((p) => (p.sheetName === s.sheetName ? { ...p, checked: !p.checked } : p)),
                          )
                        }
                        aria-label={`Import sheet ${s.sheetName}`}
                        className="h-4 w-4 accent-blue-700"
                      />
                      <span className="text-sm font-bold">{s.sheetName}</span>
                      {t ? (
                        <Badge tone="neutral">
                          {t.lang === "tl" ? "Tagalog" : "English"} · {cycleLabel(t.cycleId)}
                        </Badge>
                      ) : (
                        <Badge tone="warning">template sheet — skipped</Badge>
                      )}
                      {s.mapped.headerRow < 0 && <Badge tone="danger">no header row found</Badge>}
                      {dupes.has(key) && t && <Badge tone="warning">duplicate target</Badge>}
                    </div>
                    <div className="mt-1.5 grid gap-2 text-xs text-zinc-600 sm:grid-cols-2">
                      <p>
                        {s.monthYear ? `Month & Year: ${s.monthYear} · ` : ""}
                        {s.mapped.matched} publications · {total} values
                        {s.mapped.detectedMonths.length > 0 ? ` · ${s.mapped.detectedMonths.join(", ")}` : ""}
                      </p>
                      <label className="flex items-center gap-1.5">
                        Target report
                        <Select
                          value={s.overrideCycle ?? t?.cycleId ?? ""}
                          onChange={(e) =>
                            setSheets((prev) =>
                              prev!.map((p) =>
                                p.sheetName === s.sheetName
                                  ? { ...p, overrideCycle: e.target.value || null, checked: true }
                                  : p,
                              ),
                            )
                          }
                          aria-label={`Target report for ${s.sheetName}`}
                          className="h-8 min-w-0 flex-1 text-xs"
                        >
                          <option value="">— skip —</option>
                          {cycles.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </Select>
                      </label>
                    </div>
                    {(s.mapped.unmatched.length > 0 || s.mapped.issues.length > 0) && (
                      <details className="mt-1 text-xs text-zinc-600">
                        <summary className="cursor-pointer font-medium">
                          {s.mapped.unmatched.length} unmatched · {s.mapped.issues.length} invalid
                        </summary>
                        <ul className="list-disc pl-5">
                          {s.mapped.unmatched.slice(0, 5).map((u, i) => (
                            <li key={`u${i}`}>Unmatched: {u}</li>
                          ))}
                          {s.mapped.issues.slice(0, 5).map((iss, i) => (
                            <li key={`i${i}`}>Row {iss.row}: {iss.message}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="button" disabled={checked.length === 0} onClick={apply}>
            Apply {checked.length > 0 ? `(${checked.length} sheets)` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
