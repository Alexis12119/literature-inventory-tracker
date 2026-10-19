"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/src/lib/auth/gates";
import { createServiceClient } from "@/src/lib/supabase/service";
import { getSettings, listActivity, listActivityPage as readActivityPage, logEvent, setSetting } from "@/src/lib/data-access/admin";

export async function getPublicSettings(): Promise<{ congregationName: string; congregationNumber: string }> {
  const user = await requireUser();
  void user;
  const settings = await getSettings(createServiceClient());
  return {
    congregationName: settings["congregation_name"] ?? "",
    congregationNumber: settings["congregation_number"] ?? "",
  };
}

export async function saveCongregation(name: unknown, number: unknown): Promise<void> {
  const admin = await requireAdmin();
  const service = createServiceClient();
  await setSetting(service, admin.id, "congregation_name", String(name ?? ""));
  await setSetting(service, admin.id, "congregation_number", String(number ?? ""));
  await logEvent(service, admin.id, "settings.save", "app_settings", { key: "congregation" });
  revalidatePath("/settings");
  revalidatePath("/reports");
}

export async function listRecentActivity(limit = 50) {
  const user = await requireUser();
  void user;
  return listActivity(createServiceClient(), limit);
}

const activityPageSchema = z.object({
  search: z.string().trim().max(100),
  category: z.enum(["all", "inventory", "catalog", "users", "settings"]),
  range: z.enum(["all", "7", "30"]),
  page: z.number().int().min(1).max(100000),
  pageSize: z.number().int().min(1).max(50),
});

export async function getActivityPage(input: unknown) {
  await requireUser();
  const parsed = activityPageSchema.parse(input);
  const since = parsed.range === "all" ? null : new Date(Date.now() - Number(parsed.range) * 86400000).toISOString();
  return readActivityPage(createServiceClient(), { ...parsed, since });
}
