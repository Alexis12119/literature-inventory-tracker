"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CATALOG } from "@/src/lib/reports/template";
import { pubKey, type GridRow } from "@/src/features/inventory/store";

export interface LocalPub {
  itemNo: string;
  name: string;
  code: string;
  section: string;
  archived: boolean;
}

export interface CatalogOverride {
  itemNo: string;
  name: string;
  code: string;
  section: string;
}

export interface CatalogCustom {
  renames: Record<string, string>;
  hidden: string[];
  customs: string[];
  local: LocalPub[];
  overrides: Record<string, CatalogOverride>;
  archived: string[];
}

const STORAGE_KEY = "litinv:catalog-v1";
const MAX_NAME = 60;

const BLANK_CUSTOM: CatalogCustom = {
  renames: {},
  hidden: [],
  customs: [],
  local: [],
  overrides: {},
  archived: [],
};

function templateRows(): GridRow[] {
  return CATALOG.map((r) => ({
    key: pubKey(r.section, r.itemNo, r.name),
    itemNo: r.itemNo,
    name: r.name,
    code: r.code,
    section: r.section,
  }));
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Effective rows: template (renamed, hidden dropped) + local publications. */
export function resolveRows(custom: CatalogCustom): GridRow[] {
  const rows: GridRow[] = [];
  for (const r of templateRows()) {
    if (custom.hidden.some((h) => sameName(h, r.section))) continue;
    const over = custom.overrides[r.key];
    rows.push({
      key: r.key,
      itemNo: over?.itemNo ?? r.itemNo,
      name: over?.name ?? r.name,
      code: over?.code ?? r.code,
      section: over?.section ?? custom.renames[r.section] ?? r.section,
    });
  }
  for (const p of custom.local) {
    if (custom.hidden.some((h) => sameName(h, p.section))) continue;
    rows.push({
      key: `local::${p.itemNo}::${p.name}`,
      itemNo: p.itemNo || null,
      name: p.name,
      code: p.code || null,
      section: p.section,
    });
  }
  return rows;
}

/** Ordered display sections: template order (renamed), then customs. */
export function resolveSections(custom: CatalogCustom): string[] {
  const out: string[] = [];
  for (const r of templateRows()) {
    const display = custom.renames[r.section] ?? r.section;
    if (!out.some((s) => sameName(s, display))) out.push(display);
  }
  for (const c of custom.customs) {
    if (!out.some((s) => sameName(s, c))) out.push(c);
  }
  return out;
}

export function sectionCounts(rows: GridRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.section] = (counts[r.section] ?? 0) + 1;
  return counts;
}

function allNames(custom: CatalogCustom): string[] {
  return [...resolveSections(custom), ...custom.hidden];
}

/** Null when ok, otherwise the reason it was rejected. */
export function validateSectionName(custom: CatalogCustom, name: string, except?: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Enter a category name.";
  if (trimmed.length > MAX_NAME) return `Keep it under ${MAX_NAME} characters.`;
  if (allNames(custom).some((s) => sameName(s, trimmed) && !(except && sameName(s, except)))) {
    return "A category with that name already exists.";
  }
  return null;
}

function loadCustom(): CatalogCustom {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return BLANK_CUSTOM;
    const parsed = JSON.parse(raw) as Partial<CatalogCustom>;
    return {
      renames: parsed.renames ?? {},
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden.filter((s) => typeof s === "string") : [],
      customs: Array.isArray(parsed.customs) ? parsed.customs.filter((s) => typeof s === "string") : [],
      local: Array.isArray(parsed.local) ? parsed.local : [],
      overrides: parsed.overrides ?? {},
      archived: Array.isArray(parsed.archived) ? parsed.archived.filter((s) => typeof s === "string") : [],
    };
  } catch {
    return BLANK_CUSTOM;
  }
}

export function useCatalog() {
  const [custom, setCustom] = useState<CatalogCustom>(BLANK_CUSTOM);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setCustom(loadCustom());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((next: CatalogCustom) => {
    setCustom(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* local preview cache only */
    }
  }, []);

  const renameSection = useCallback(
    (raw: string, name: string): string | null => {
      const err = validateSectionName(custom, name, raw);
      if (err) return err;
      const renames = { ...custom.renames };
      const templateRaw = templateRows().some((r) => sameName(r.section, raw));
      if (templateRaw) {
        renames[raw] = name.trim();
      } else {
        // Custom section: rename in place, preserving its publications.
        const trimmed = name.trim();
        update({
          ...custom,
          customs: custom.customs.map((c) => (sameName(c, raw) ? trimmed : c)),
          hidden: custom.hidden.map((h) => (sameName(h, raw) ? trimmed : h)),
          local: custom.local.map((p) => (sameName(p.section, raw) ? { ...p, section: trimmed } : p)),
        });
        return null;
      }
      update({ ...custom, renames });
      return null;
    },
    [custom, update],
  );

  const hideSection = useCallback(
    (raw: string) => {
      if (custom.hidden.some((h) => sameName(h, raw))) return;
      update({ ...custom, hidden: [...custom.hidden, raw] });
    },
    [custom, update],
  );

  const restoreSection = useCallback(
    (raw: string) => {
      update({ ...custom, hidden: custom.hidden.filter((h) => !sameName(h, raw)) });
    },
    [custom, update],
  );

  const addSection = useCallback(
    (name: string): string | null => {
      const err = validateSectionName(custom, name);
      if (err) return err;
      update({ ...custom, customs: [...custom.customs, name.trim()] });
      return null;
    },
    [custom, update],
  );

  const deleteSection = useCallback(
    (raw: string): string | null => {
      const rows = resolveRows(custom);
      if (rows.some((r) => sameName(r.section, raw))) {
        return "Move or remove its publications first — categories with items can't be deleted (hide instead).";
      }
      update({
        ...custom,
        customs: custom.customs.filter((c) => !sameName(c, raw)),
        hidden: custom.hidden.filter((h) => !sameName(h, raw)),
      });
      return null;
    },
    [custom, update],
  );

  return {
    rows: resolveRows(custom),
    sections: resolveSections(custom),
    renames: custom.renames,
    customs: custom.customs,
    hidden: custom.hidden,
    local: custom.local,
    overrides: custom.overrides,
    archived: custom.archived,
    archivedKeys: useMemo(() => {
      const set = new Set(custom.archived);
      for (const p of custom.local) {
        if (p.archived) set.add(`local::${p.itemNo}::${p.name}`);
      }
      return set;
    }, [custom]),
    renameSection,
    hideSection,
    restoreSection,
    addSection,
    deleteSection,
    resetOverride: useCallback(
      (key: string) => {
        const next = Object.fromEntries(Object.entries(custom.overrides).filter(([k]) => k !== key));
        update({ ...custom, overrides: next });
      },
      [custom, update],
    ),
    saveOverride: useCallback(
      (key: string, value: CatalogOverride) => {
        update({ ...custom, overrides: { ...custom.overrides, [key]: value } });
      },
      [custom, update],
    ),
    addLocal: useCallback(
      (p: Omit<LocalPub, "archived">) => {
        update({ ...custom, local: [...custom.local, { ...p, archived: false }] });
      },
      [custom, update],
    ),
    updateLocal: useCallback(
      (index: number, p: Omit<LocalPub, "archived">) => {
        update({
          ...custom,
          local: custom.local.map((old, j) => (j === index ? { ...old, ...p } : old)),
        });
      },
      [custom, update],
    ),
    removeLocal: useCallback(
      (index: number) => {
        update({ ...custom, local: custom.local.filter((_, j) => j !== index) });
      },
      [custom, update],
    ),
    toggleLocalArchived: useCallback(
      (index: number) => {
        update({
          ...custom,
          local: custom.local.map((old, j) => (j === index ? { ...old, archived: !old.archived } : old)),
        });
      },
      [custom, update],
    ),
    toggleArchive: useCallback(
      (key: string) => {
        update({
          ...custom,
          archived: custom.archived.includes(key)
            ? custom.archived.filter((k) => k !== key)
            : [...custom.archived, key],
        });
      },
      [custom, update],
    ),
    setCustom: update,
  };
}
