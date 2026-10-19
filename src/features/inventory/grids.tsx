"use client";

import { Fragment, memo, useMemo } from "react";
import { MONTH_GROUPS, type MonthGroup } from "@/src/lib/reports/template";
import { parseQtyInput, type GridRow } from "@/src/features/inventory/store";
import { labelFromId } from "@/src/features/inventory/carry";
import { calculateMoved, type Quantity } from "@/src/lib/domain/movement";
import { cn } from "@/src/lib/utils";

type SetCell = (
  key: string,
  month: MonthGroup | "original",
  field: "received" | "onHand" | "original",
  value: Quantity,
) => void;

type MonthMap = Record<MonthGroup, { received: Quantity; onHand: Quantity }>;

const EMPTY_CELL = { received: null, onHand: null } as { received: Quantity; onHand: Quantity };
const EMPTY_MONTHS = Object.fromEntries(
  MONTH_GROUPS.map((m) => [m, { received: null, onHand: null }]),
) as MonthMap;

function QtyInput({
  value,
  label,
  onCommit,
  fallbackValue,
  fallbackNote,
}: {
  value: Quantity;
  label: string;
  onCommit: (v: Quantity) => void;
  /** Derived display when the field itself is blank (never written back). */
  fallbackValue?: Quantity;
  fallbackNote?: string;
}) {
  const shown = value ?? fallbackValue ?? null;
  const isFallback = value === null && fallbackValue !== null && fallbackValue !== undefined;
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={isFallback && fallbackNote ? `${label} (${fallbackNote})` : label}
      title={isFallback ? fallbackNote : undefined}
      value={shown === null ? "" : String(shown)}
      placeholder="—"
      onChange={(e) => {
        const parsed = parseQtyInput(e.target.value);
        if (parsed !== "invalid") onCommit(parsed);
      }}
      className={cn(
        "h-10 w-full min-w-14 rounded-lg border border-zinc-300 bg-white px-1.5 text-center text-sm tabular-nums shadow-sm shadow-zinc-900/[0.02] focus:border-accent focus:outline-2 focus:outline-accent",
        isFallback && "border-dashed border-[#9ab19f] bg-[#f1f6f2] text-[#315b4b]",
      )}
    />
  );
}

function matchesSearch(
  r: { itemNo: string | null; name: string; code: string | null; section: string },
  q: string,
): boolean {
  if (!q) return true;
  return `${r.itemNo ?? ""} ${r.name} ${r.code ?? ""}`.toLowerCase().includes(q);
}

/** One publication row — memoized so editing/searching touches only dirty rows. */
const InventoryRow = memo(function InventoryRow({
  rowKey,
  itemNo,
  name,
  code,
  original,
  carriedValue,
  carriedFrom,
  months,
  setCell,
}: {
  rowKey: string;
  itemNo: string | null;
  name: string;
  code: string | null;
  original: Quantity;
  carriedValue: Quantity;
  carriedFrom: string | null;
  months: MonthMap;
  setCell: SetCell;
}) {
  return (
    <tr className="bg-white transition-colors hover:bg-[#f4f8f4]">
      <td className="sticky left-0 z-10 w-[76px] max-w-[76px] min-w-[76px] border-b border-zinc-200 bg-white px-2 py-1.5 text-[13px] text-zinc-600">
        {itemNo ?? ""}
      </td>
      <td className="sticky left-[76px] z-10 w-52 max-w-52 min-w-52 border-b border-r border-zinc-200 bg-white px-2 py-1.5 text-[13px] font-medium leading-5">
        {name}
        {code ? <span className="ml-1 text-zinc-400">{code}</span> : null}
      </td>
      <td className="w-[76px] max-w-[76px] min-w-[76px] border-b border-zinc-200 px-1 py-1">
        <QtyInput
          value={original}
          fallbackValue={carriedValue}
          fallbackNote={carriedFrom ? `Carried from ${labelFromId(carriedFrom)} — typing overrides it` : undefined}
          label={`${name} originally on hand`}
          onCommit={(v) => setCell(rowKey, "original", "original", v)}
        />
      </td>
      {MONTH_GROUPS.map((m, mi) => {
        const cell = months[m] ?? EMPTY_CELL;
        const opening =
          mi === 0
            ? (original ?? carriedValue ?? null)
            : (months[MONTH_GROUPS[mi - 1]]?.onHand ?? null);
        const moved = calculateMoved(opening, cell.received, cell.onHand);
        return (
          <Fragment key={m}>
            <td className="w-[72px] max-w-[72px] min-w-[72px] border-b border-l border-zinc-200 px-1 py-1">
              <QtyInput
                value={cell.received}
                label={`${name} ${m} received`}
                onCommit={(v) => setCell(rowKey, m, "received", v)}
              />
            </td>
            <td className="w-[72px] max-w-[72px] min-w-[72px] border-b border-zinc-200 px-1 py-1">
              <QtyInput
                value={cell.onHand}
                label={`${name} ${m} currently on hand`}
                onCommit={(v) => setCell(rowKey, m, "onHand", v)}
              />
            </td>
            <td
              aria-label={`${name} ${m} moved${moved === null ? " (blank)" : ""}`}
              className="w-[68px] max-w-[68px] min-w-[68px] border-b border-zinc-200 bg-zinc-200/60 px-1 py-1 text-center text-sm tabular-nums text-zinc-900"
            >
              {moved === null ? <span className="text-zinc-400">—</span> : moved}
              <span className="sr-only">{moved === null ? "blank" : `equals ${moved}`}</span>
            </td>
          </Fragment>
        );
      })}
    </tr>
  );
});

export function InventoryDesktopGrid({
  grid,
  rows,
  search,
  category,
  setCell,
  carriedValues = {},
  carriedSources = {},
}: {
  grid: { original: Record<string, Quantity>; months: Record<string, MonthMap> };
  rows: GridRow[];
  search: string;
  category: string;
  setCell: SetCell;
  carriedValues?: Record<string, Quantity>;
  carriedSources?: Record<string, string>;
}) {
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) => (category === "all" || r.section === category) && matchesSearch(r, q),
    );
  }, [rows, search, category]);

  const body: React.ReactNode[] = [];
  let lastSection = "";
  for (const r of visible) {
    const key = r.key;
    if (r.section !== lastSection) {
      lastSection = r.section;
      body.push(
        <tr key={`sec-${r.section}`} className="bg-[#f1f5f1]">
          <td className="sticky left-0 z-10 w-[76px] max-w-[76px] min-w-[76px] border-b border-zinc-200 bg-[#f1f5f1]" />
          <td className="sticky left-[76px] z-10 w-52 max-w-52 min-w-52 border-b border-r border-zinc-200 bg-[#f1f5f1] px-2 py-2 text-xs font-bold uppercase tracking-wide text-[#52645a]">
            {r.section}
          </td>
          <td className="border-b border-zinc-200 bg-[#f1f5f1]" />
          {MONTH_GROUPS.map((m) => (
            <td key={m} colSpan={3} className="border-b border-l border-zinc-200 bg-[#f1f5f1]" />
          ))}
        </tr>,
      );
    }
    body.push(
      <InventoryRow
        key={key}
        rowKey={key}
        itemNo={r.itemNo}
        name={r.name}
        code={r.code}
        original={grid.original[key] ?? null}
        carriedValue={carriedValues[key] ?? null}
        carriedFrom={carriedSources[key] ?? null}
        months={grid.months[key] ?? EMPTY_MONTHS}
        setCell={setCell}
      />,
    );
  }

  return (
    <div className="inventory-grid overscroll-x-contain max-h-[70vh] overflow-auto rounded-xl border border-zinc-300 bg-white shadow-sm" role="region" aria-label="Six-month inventory grid" tabIndex={0}>
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-20">
          <tr className="bg-[#314b3d] text-white">
            <th scope="col" className="sticky left-0 z-30 w-[76px] max-w-[76px] min-w-[76px] border-b border-[#47604f] bg-[#314b3d] px-2 py-3 text-left text-xs font-semibold">Item No.</th>
            <th scope="col" className="sticky left-[76px] z-30 w-52 max-w-52 min-w-52 border-b border-r border-[#47604f] bg-[#314b3d] px-2 py-3 text-left text-xs font-semibold">Publication</th>
            <th scope="col" className="w-[76px] max-w-[76px] min-w-[76px] border-b border-[#47604f] px-2 py-3 text-center text-xs font-semibold">Originally<br />on Hand</th>
            {MONTH_GROUPS.map((m) => (
              <th key={m} scope="col" colSpan={3} className="border-b border-l border-[#47604f] px-2 py-3 text-center text-xs font-semibold">
                {m}
              </th>
            ))}
          </tr>
          <tr className="bg-[#edf3ee] text-zinc-800">
            <th className="sticky left-0 z-30 w-[76px] max-w-[76px] min-w-[76px] border-b border-zinc-300 bg-[#edf3ee]" />
            <th className="sticky left-[76px] z-30 w-52 max-w-52 min-w-52 border-b border-r border-zinc-300 bg-[#edf3ee]" />
            <th className="w-[76px] max-w-[76px] min-w-[76px] border-b border-zinc-300 bg-[#edf3ee]" />
            {MONTH_GROUPS.map((m) => (
              <Fragment key={m}>
                <th scope="col" className="w-[72px] max-w-[72px] min-w-[72px] border-b border-l border-zinc-300 px-1 py-2 text-xs font-semibold">Rec&apos;d</th>
                <th scope="col" className="w-[72px] max-w-[72px] min-w-[72px] border-b border-zinc-300 px-1 py-2 text-xs font-semibold">Currently on Hand</th>
                <th scope="col" className="w-[68px] max-w-[68px] min-w-[68px] border-b border-zinc-300 bg-[#e1eae2] px-1 py-2 text-xs font-semibold">Moved</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>{body.length ? body : (
          <tr>
            <td colSpan={21} className="px-4 py-8 text-center text-sm text-zinc-500">No publications match your search.</td>
          </tr>
        )}</tbody>
      </table>
    </div>
  );
}

const MobileCard = memo(function MobileCard({
  rowKey,
  itemNo,
  name,
  code,
  section,
  month,
  received,
  onHand,
  moved,
  setCell,
}: {
  rowKey: string;
  itemNo: string | null;
  name: string;
  code: string | null;
  section: string;
  month: MonthGroup;
  received: Quantity;
  onHand: Quantity;
  moved: Quantity;
  setCell: SetCell;
}) {
  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/[0.02]">
      <p className="text-base font-semibold leading-5">{name}</p>
      <p className="mt-1 text-sm text-zinc-500">{itemNo ? `Item ${itemNo} · ` : ""}{section}{code ? ` · ${code}` : ""}</p>
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-700">
          Rec&apos;d
          <QtyInput value={received} label={`${name} ${month} received`} onCommit={(v) => setCell(rowKey, month, "received", v)} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-700">
          On Hand
          <QtyInput value={onHand} label={`${name} ${month} currently on hand`} onCommit={(v) => setCell(rowKey, month, "onHand", v)} />
        </label>
        <div className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-700">
          Moved
          <span className="flex h-10 items-center justify-center rounded-lg bg-[#edf3ee] text-sm font-semibold tabular-nums text-[#314b3d]" aria-live="polite">
            {moved === null ? "—" : moved}
          </span>
        </div>
      </div>
    </li>
  );
});

export function InventoryMobileCards({
  grid,
  rows,
  month,
  search,
  category,
  setCell,
  carriedValues = {},
}: {
  grid: { original: Record<string, Quantity>; months: Record<string, MonthMap> };
  rows: GridRow[];
  month: MonthGroup;
  search: string;
  category: string;
  setCell: SetCell;
  carriedValues?: Record<string, Quantity>;
}) {
  const mi = MONTH_GROUPS.indexOf(month);
  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) => (category === "all" || r.section === category) && matchesSearch(r, q),
    );
  }, [rows, search, category]);
  if (!items.length) return <p className="rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">No publications match your search.</p>;
  return (
    <ul className="flex flex-col gap-2 md:hidden">
      {items.map((r) => {
        const key = r.key;
        const cell = grid.months[key]?.[month] ?? EMPTY_CELL;
        const opening =
          mi === 0
            ? (grid.original[key] ?? carriedValues[key] ?? null)
            : (grid.months[key]?.[MONTH_GROUPS[mi - 1]]?.onHand ?? null);
        const moved = calculateMoved(opening, cell.received, cell.onHand);
        return (
          <MobileCard
            key={key}
            rowKey={key}
            itemNo={r.itemNo}
            name={r.name}
            code={r.code}
            section={r.section}
            month={month}
            received={cell.received}
            onHand={cell.onHand}
            moved={moved}
            setCell={setCell}
          />
        );
      })}
    </ul>
  );
}
