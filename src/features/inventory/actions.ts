"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/src/lib/auth/gates";
import { createServiceClient } from "@/src/lib/supabase/service";
import { getGrid, saveGrid, type SaveCell } from "@/src/lib/data-access/inventory";
import { getSettings, listActivity } from "@/src/lib/data-access/admin";
import type { Quantity } from "@/src/lib/domain/movement";

const qty = z.union([z.number().int().min(0).max(999999), z.null()]);
const cellSchema = z.object({
  key: z.string().min(1).max(300),
  monthPos: z.number().int().min(1).max(6),
  received: qty,
  onHand: qty,
});
const saveSchema = z.object({
  periodKey: z.string().regex(/^\d{4}-(mar-aug|sep-feb)$/),
  lang: z.enum(["en", "tl"]),
  originals: z.record(z.string(), qty),
  cells: z.array(cellSchema).max(5000),
});

export type GridPayload = Awaited<ReturnType<typeof getGrid>>;

/** Workspace payload for one cycle + language (any active role may read). */
export async function getInventoryGrid(periodKey: string, lang: "en" | "tl"): Promise<GridPayload> {
  const user = await requireUser();
  void user;
  const service = createServiceClient();
  return getGrid(service, periodKey, lang);
}

/** Dashboard reads share one authenticated request and run in parallel server-side. */
export async function getDashboardWorkspace(periodKey: string, lang: "en" | "tl") {
  await requireUser();
  const service = createServiceClient();
  const [grid, activity] = await Promise.all([
    getGrid(service, periodKey, lang),
    listActivity(service, 5),
  ]);
  return { grid, activity };
}

/** Report preview data share one authenticated request and run in parallel server-side. */
export async function getReportWorkspace(periodKey: string, lang: "en" | "tl") {
  await requireUser();
  const service = createServiceClient();
  const [grid, settings] = await Promise.all([
    getGrid(service, periodKey, lang),
    getSettings(service),
  ]);
  return {
    grid,
    congregationName: settings["congregation_name"] ?? "",
    congregationNumber: settings["congregation_number"] ?? "",
  };
}

export async function saveInventoryGrid(input: {
  periodKey: string;
  lang: "en" | "tl";
  originals: Record<string, Quantity>;
  cells: SaveCell[];
}): Promise<{ original: number; received: number; onHand: number }> {
  const user = await requireUser();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid inventory data.");
  const service = createServiceClient();
  const counts = await saveGrid(service, user.id, parsed.data);
  revalidatePath("/inventory");
  revalidatePath("/");
  revalidatePath("/reports");
  return counts;
}

const importSchema = z.object({
  periodKey: z.string().regex(/^\d{4}-(mar-aug|sep-feb)$/),
  lang: z.enum(["en", "tl"]),
  patch: z.object({
    original: z.record(z.string(), qty),
    received: z.record(z.string(), z.record(z.string(), qty)),
    onHand: z.record(z.string(), z.record(z.string(), qty)),
  }),
});

/** Bulk workbook import across cycles (any active role may import). */
export async function importInventorySheets(
  items: Array<{ periodKey: string; lang: "en" | "tl"; patch: unknown }>,
): Promise<{ sheets: number; total: number }> {
  const user = await requireUser();
  if (items.length > 30) throw new Error("Too many sheets at once.");
  const service = createServiceClient();
  let total = 0;
  let sheets = 0;
  for (const item of items.slice(0, 30)) {
    const parsed = importSchema.safeParse(item);
    if (!parsed.success) continue;
    // Re-shape the mapped patch (keyed by month-pair label) into save cells.
    const months = ["Sep/Mar", "Oct/Apr", "Nov/May", "Dec/June", "Jan/July", "Feb/Aug"] as const;
    const byCell = new Map<string, SaveCell>();
    const buckets = [
      ["received", "received"],
      ["onHand", "onHand"],
    ] as const;
    for (const [bucket, field] of buckets) {
      const perKey = parsed.data.patch[bucket] as Record<string, Record<string, number | null>>;
      for (const [key, perMonth] of Object.entries(perKey)) {
        for (const [m, v] of Object.entries(perMonth)) {
          const mi = (months as readonly string[]).indexOf(m);
          if (mi < 0) continue;
          const id = `${key}::${mi}`;
          let cell = byCell.get(id);
          if (!cell) {
            cell = { key, monthPos: mi + 1, received: null, onHand: null };
            byCell.set(id, cell);
          }
          cell[field] = v;
        }
      }
    }
    const counts = await saveGrid(service, user.id, {
      periodKey: parsed.data.periodKey,
      lang: parsed.data.lang,
      originals: parsed.data.patch.original as Record<string, number | null>,
      cells: [...byCell.values()],
    });
    total += counts.original + counts.received + counts.onHand;
    sheets += 1;
  }
  revalidatePath("/inventory");
  revalidatePath("/");
  revalidatePath("/reports");
  revalidatePath("/activity");
  return { sheets, total };
}
