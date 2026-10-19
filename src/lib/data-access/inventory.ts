import "server-only";

import type { MonthGroup } from "@/src/lib/reports/template";
import type { Quantity } from "@/src/lib/domain/movement";
import type { GridRow } from "@/src/features/inventory/store";
import {
  getPeriod,
  listCatalog,
  listPeriods,
  previousPeriodKey,
  resolvePubIds,
  type Db,
} from "@/src/lib/data-access/catalog";

export interface GridCell {
  received: Quantity;
  onHand: Quantity;
}

export interface InventoryGridPayload {
  rows: GridRow[];
  sections: string[];
  months: { position: number; pairLabel: string }[];
  original: Record<string, Quantity>;
  cells: Record<string, Record<MonthGroup, GridCell>>;
  carried: { values: Record<string, Quantity>; sources: Record<string, string>; sourceLabel: string | null };
}

const EMPTY_CELL: GridCell = { received: null, onHand: null };

function blankCells(): Record<MonthGroup, GridCell> {
  return {
    "Sep/Mar": { ...EMPTY_CELL },
    "Oct/Apr": { ...EMPTY_CELL },
    "Nov/May": { ...EMPTY_CELL },
    "Dec/June": { ...EMPTY_CELL },
    "Jan/July": { ...EMPTY_CELL },
    "Feb/Aug": { ...EMPTY_CELL },
  };
}

/** Last counted stock per row key, walking back past blank periods. */
async function closingCounts(
  db: Db,
  periodKey: string,
  periods: Awaited<ReturnType<typeof listPeriods>>,
  keyById: Map<string, string>,
): Promise<{ values: Record<string, Quantity>; sources: Record<string, string>; sourceLabel: string | null }> {
  const values: Record<string, Quantity> = {};
  const sources: Record<string, string> = {};
  const idByKey = new Map([...keyById.entries()].map(([key, id]) => [id, key]));
  const periodByKey = new Map(periods.map((period) => [period.key, period]));
  const priorPeriods: typeof periods = [];
  let prevKey = previousPeriodKey(periodKey);
  for (let step = 0; step < 12 && prevKey; step++) {
    const prev = periodByKey.get(prevKey);
    if (!prev) break;
    priorPeriods.push(prev);
    prevKey = previousPeriodKey(prevKey);
  }

  const monthIds = priorPeriods.flatMap((period) => period.months.map((month) => month.id));
  if (monthIds.length === 0 || keyById.size === 0) return { values, sources, sourceLabel: null };

  const monthById = new Map(
    priorPeriods.flatMap((period) => period.months.map((month) => [month.id, { period, month }] as const)),
  );
  const latestMonthByPub = new Map<string, string>();
  let newestSource: { month: string; label: string } | null = null;
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data: recs, error } = await db
      .from("inventory_records")
      .select("publication_id, month_id, on_hand")
      .in("month_id", monthIds)
      .in("publication_id", [...idByKey.keys()])
      .not("on_hand", "is", null)
      .order("month_id", { ascending: true })
      .order("publication_id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error("Could not load previous inventory counts.");
    for (const record of recs ?? []) {
      const pubId = record.publication_id as string;
      const key = idByKey.get(pubId);
      const month = monthById.get(record.month_id as string);
      if (!key || !month) continue;
      const currentLatest = latestMonthByPub.get(pubId);
      if (currentLatest && currentLatest >= month.month.month) continue;
      latestMonthByPub.set(pubId, month.month.month);
      values[key] = record.on_hand as number;
      sources[key] = month.period.key;
      if (!newestSource || newestSource.month < month.month.month) {
        newestSource = { month: month.month.month, label: month.period.label };
      }
    }
    if ((recs?.length ?? 0) < pageSize) break;
  }

  return { values, sources, sourceLabel: newestSource?.label ?? null };
}

/** Full workspace payload, servanted by role-checked actions. */
export async function getGrid(db: Db, periodKey: string, lang: string): Promise<InventoryGridPayload> {
  const [periods, catalog] = await Promise.all([listPeriods(db), listCatalog(db, lang)]);
  const period = periods.find((candidate) => candidate.key === periodKey) ?? null;
  if (!period) throw new Error(`Reporting period not found: ${periodKey}.`);
  const { rows, sections } = catalog;

  const original: Record<string, Quantity> = {};
  const cells: Record<string, Record<MonthGroup, GridCell>> = {};
  for (const r of rows) {
    cells[r.key] = blankCells();
  }

  const keyById = new Map(rows.map((row) => [row.key, row.id]));
  const idByKey = new Map([...keyById.entries()].map(([k, id]) => [id, k]));

  const monthIds = period.months.map((m) => m.id);
  const [recordsResult, openingsResult, carried] = await Promise.all([
    db
      .from("inventory_records")
      .select("publication_id, month_id, received, on_hand")
      .in("month_id", monthIds),
    db.from("cycle_openings").select("publication_id, quantity").eq("period_id", period.id),
    closingCounts(db, periodKey, periods, keyById),
  ]);
  const { data: recs, error } = recordsResult;
  if (error) throw new Error("Could not load inventory records.");
  const posByMonth = new Map(period.months.map((m) => [m.id, m.position] as [string, number]));
  const pairByPos = new Map(period.months.map((m) => [m.position, m.pairLabel as MonthGroup]));
  for (const r of recs ?? []) {
    const key = idByKey.get(r.publication_id as string);
    const pos = posByMonth.get(r.month_id as string);
    if (!key || !pos || !cells[key]) continue;
    const group = pairByPos.get(pos);
    if (!group) continue;
    cells[key][group] = {
      received: (r.received as number | null) ?? null,
      onHand: (r.on_hand as number | null) ?? null,
    };
  }

  const { data: openings, error: openingsError } = openingsResult;
  if (openingsError) throw new Error("Could not load opening balances.");
  for (const o of openings ?? []) {
    const key = idByKey.get(o.publication_id as string);
    if (key && original[key] === undefined) original[key] = (o.quantity as number | null) ?? null;
  }

  // Cross-cycle carry: blank originals inherit previous closing counts.
  const carriedValues: Record<string, Quantity> = {};
  const carriedSources: Record<string, string> = {};
  for (const r of rows) {
    if ((original[r.key] ?? null) === null && carried.values[r.key] != null) {
      carriedValues[r.key] = carried.values[r.key];
      carriedSources[r.key] = carried.sources[r.key];
    }
  }

  return {
    rows,
    sections,
    months: period.months.map((m) => ({ position: m.position, pairLabel: m.pairLabel })),
    original,
    cells,
    carried: { values: carriedValues, sources: carriedSources, sourceLabel: carried.sourceLabel },
  };
}

export interface SaveCell {
  key: string;
  monthPos: number;
  received: Quantity;
  onHand: Quantity;
}

export interface SaveInput {
  periodKey: string;
  lang: string;
  originals: Record<string, Quantity>;
  cells: SaveCell[];
}

/** Persist a workspace (any active role may write inventory). Returns counts. */
export async function saveGrid(
  db: Db,
  actorId: string,
  input: SaveInput,
): Promise<{ original: number; received: number; onHand: number }> {
  const period = await getPeriod(db, input.periodKey);
  if (!period) throw new Error(`Reporting period not found: ${input.periodKey}.`);
  const monthIdByPos = new Map<number, string>(period.months.map((m): [number, string] => [m.position, m.id]));
  const keyById = await resolvePubIds(
    db,
    input.lang,
    [...Object.keys(input.originals), ...input.cells.map((c) => c.key)],
  );

  const counts = { original: 0, received: 0, onHand: 0 };

  // Openings: one batched upsert + one batched delete (per-period, so an
  // IN-list on publication_id is exact — no cross-product risk).
  const openingUpserts: Array<{ publication_id: string; period_id: string; quantity: number; updated_by: string }> = [];
  const openingDeletes: string[] = [];
  for (const [key, qty] of Object.entries(input.originals)) {
    const pubId = keyById.get(key);
    if (!pubId) continue;
    if (qty === null || qty === undefined) {
      openingDeletes.push(pubId);
      continue;
    }
    openingUpserts.push({ publication_id: pubId, period_id: period.id, quantity: qty, updated_by: actorId });
  }
  if (openingDeletes.length > 0) {
    const { error } = await db
      .from("cycle_openings")
      .delete()
      .eq("period_id", period.id)
      .in("publication_id", openingDeletes);
    if (error) throw new Error(`Could not save opening balances: ${error.message}`);
  }
  if (openingUpserts.length > 0) {
    const { error } = await db.from("cycle_openings").upsert(openingUpserts, {
      onConflict: "publication_id,period_id",
    });
    if (error) throw new Error(`Could not save opening balances: ${error.message}`);
    counts.original += openingUpserts.length;
  }

  // Monthly cells grouped by (publication, month): one batched upsert plus
  // deletes resolved through record ids (an IN-list on both columns would
  // over-delete the cross product, so ids are looked up first).
  const byCell = new Map<string, { pubId: string; monthId: string; received: Quantity; onHand: Quantity }>();
  for (const c of input.cells) {
    const pubId = keyById.get(c.key);
    const monthId = monthIdByPos.get(c.monthPos);
    if (!pubId || !monthId) continue;
    byCell.set(`${pubId}::${monthId}`, { pubId, monthId, received: c.received, onHand: c.onHand });
  }
  const recordUpserts: Array<{
    publication_id: string;
    month_id: string;
    received: number | null;
    on_hand: number | null;
    updated_by: string;
  }> = [];
  const deletePairs: Array<{ pubId: string; monthId: string }> = [];
  for (const { pubId, monthId, received, onHand } of byCell.values()) {
    if (received === null && onHand === null) {
      deletePairs.push({ pubId, monthId });
      continue;
    }
    recordUpserts.push({ publication_id: pubId, month_id: monthId, received, on_hand: onHand, updated_by: actorId });
  }
  if (deletePairs.length > 0) {
    const pubIds = [...new Set(deletePairs.map((d) => d.pubId))];
    const monthIds = [...new Set(deletePairs.map((d) => d.monthId))];
    const { data: existing, error: selError } = await db
      .from("inventory_records")
      .select("id, publication_id, month_id")
      .in("publication_id", pubIds)
      .in("month_id", monthIds);
    if (selError) throw new Error(`Could not save inventory records: ${selError.message}`);
    const wanted = new Set(deletePairs.map((d) => `${d.pubId}::${d.monthId}`));
    const ids = (existing ?? [])
      .filter((r) => wanted.has(`${r.publication_id as string}::${r.month_id as string}`))
      .map((r) => r.id as string);
    if (ids.length > 0) {
      const { error } = await db.from("inventory_records").delete().in("id", ids);
      if (error) throw new Error(`Could not save inventory records: ${error.message}`);
    }
  }
  if (recordUpserts.length > 0) {
    const { error } = await db.from("inventory_records").upsert(recordUpserts, {
      onConflict: "publication_id,month_id",
    });
    if (error) throw new Error(`Could not save inventory records: ${error.message}`);
    for (const u of recordUpserts) {
      if (u.received !== null) counts.received += 1;
      if (u.on_hand !== null) counts.onHand += 1;
    }
  }

  await db.from("audit_events").insert({
    actor: actorId,
    action: "inventory.save",
    entity: "reporting_period",
    entity_id: period.id,
    after: { period: input.periodKey, lang: input.lang, ...counts },
  });

  return counts;
}
