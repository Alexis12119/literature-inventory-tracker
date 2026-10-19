import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MonthGroup } from "@/src/lib/reports/template";
import type { GridRow } from "@/src/features/inventory/store";

export type Db = SupabaseClient;

export interface DbMonth {
  id: string;
  position: number;
  pairLabel: string;
  month: string;
}

export interface DbPeriod {
  id: string;
  key: string;
  label: string;
  months: DbMonth[];
}

/** All cycles with their month slots, oldest first. */
export async function listPeriods(db: Db): Promise<DbPeriod[]> {
  const { data: periods, error } = await db
    .from("reporting_periods")
    .select("id, key, label, reporting_months(id, position, pair_label, month)")
    .order("start_month", { ascending: true });
  if (error) throw new Error("Could not load reporting periods.");
  return (periods ?? []).map((p) => ({
    id: p.id as string,
    key: p.key as string,
    label: p.label as string,
    months: ((p.reporting_months as Array<Record<string, unknown>> | null) ?? [])
      .map((m) => ({
        id: m.id as string,
        position: m.position as number,
        pairLabel: m.pair_label as MonthGroup,
        month: m.month as string,
      }))
      .sort((a, b) => a.position - b.position),
  }));
}

export async function getPeriod(db: Db, key: string): Promise<DbPeriod | null> {
  const { data, error } = await db
    .from("reporting_periods")
    .select("id, key, label, reporting_months(id, position, pair_label, month)")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error("Could not load reporting period.");
  if (!data) return null;
  return {
    id: data.id as string,
    key: data.key as string,
    label: data.label as string,
    months: ((data.reporting_months as Array<Record<string, unknown>> | null) ?? [])
      .map((m) => ({
        id: m.id as string,
        position: m.position as number,
        pairLabel: m.pair_label as MonthGroup,
        month: m.month as string,
      }))
      .sort((a, b) => a.position - b.position),
  };
}

/** Previous period key for carry-forward (null before Mar 2024). */
export function previousPeriodKey(key: string): string | null {
  const m = /^(\d{4})-(mar-aug|sep-feb)$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  if (m[2] === "mar-aug") return year <= 2024 ? null : `${year - 1}-sep-feb`;
  return `${year}-mar-aug`;
}

/** Template-identity key shared with the client (stable across renames). */
export function rowKey(section: string, itemNo: string | null, name: string): string {
  return `${section}::${itemNo ?? ""}::${name}`;
}

export interface CatalogRow extends GridRow {
  id: string;
  active: boolean;
}

/** Effective catalog for a language: active categories, renames applied. */
export async function listCatalog(
  db: Db,
  lang: string,
  includeInactive = false,
): Promise<{ rows: CatalogRow[]; sections: string[] }> {
  const [categoriesResult, publicationsResult] = await Promise.all([
    db
      .from("publication_categories")
      .select("id, name, sort_order, is_active")
      .eq("language_code", lang)
      .order("sort_order", { ascending: true }),
    db
      .from("publications")
      .select("id, category_id, item_no, name, code, sort_order, is_active")
      .eq("language_code", lang)
      .order("sort_order", { ascending: true }),
  ]);
  const { data: cats, error: cErr } = categoriesResult;
  if (cErr) throw new Error("Could not load categories.");
  const { data: pubs, error: pErr } = publicationsResult;
  if (pErr) throw new Error("Could not load publications.");
  const catById = new Map((cats ?? []).map((c) => [c.id as string, c]));
  const rows: CatalogRow[] = [];
  for (const p of pubs ?? []) {
    const cat = catById.get(p.category_id as string);
    if (!cat || !(cat.is_active as boolean)) continue; // hidden category hides its rows (data retained)
    const active = (p.is_active as boolean) ?? true;
    if (!active && !includeInactive) continue;
    rows.push({
      id: p.id as string,
      key: rowKey(cat.name as string, (p.item_no as string | null) ?? null, p.name as string),
      itemNo: (p.item_no as string | null) ?? null,
      name: p.name as string,
      code: (p.code as string | null) ?? null,
      section: cat.name as string,
      active: (p.is_active as boolean) ?? true,
    });
  }
  const sections: string[] = [];
  for (const c of cats ?? []) {
    if (!(c.is_active as boolean)) continue;
    sections.push(c.name as string);
  }
  return { rows, sections };
}

/** Split a client row key back into its parts. */
export function parseRowKey(key: string): { section: string; itemNo: string | null; name: string } | null {
  const parts = key.split("::");
  if (parts.length !== 3) return null;
  const [section, itemNo, ...rest] = parts;
  return { section, itemNo: itemNo === "" ? null : itemNo, name: rest.join("::") };
}

/**
 * Resolve client row keys to publication ids by (item_no, name) — the
 * section part is ignored so category renames never orphan saved data
 * or workbook imports.
 */
export async function resolvePubIds(
  db: Db,
  lang: string,
  keys: string[],
): Promise<Map<string, string>> {
  const { data: pubs } = await db
    .from("publications")
    .select("id, item_no, name")
    .eq("language_code", lang);
  const byIdentity = new Map<string, string>();
  for (const p of pubs ?? []) {
    byIdentity.set(`${(p.item_no as string | null) ?? ""}::${p.name as string}`, p.id as string);
  }
  const out = new Map<string, string>();
  for (const k of keys) {
    const parsed = parseRowKey(k);
    if (!parsed) continue;
    const id = byIdentity.get(`${parsed.itemNo ?? ""}::${parsed.name}`);
    if (id) out.set(k, id);
  }
  return out;
}
