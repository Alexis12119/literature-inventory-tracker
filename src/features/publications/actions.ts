"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/src/lib/auth/gates";
import { createServiceClient } from "@/src/lib/supabase/service";
import {
  createCategory,
  createPublication,
  deleteCategory,
  logEvent,
  renameCategory,
  setCategoryActive,
  setPublicationActive,
  updatePublication,
} from "@/src/lib/data-access/admin";
import { listCatalog as readCatalog, listCatalogPage as readCatalogPage } from "@/src/lib/data-access/catalog";
import type { LanguageCode } from "@/src/features/inventory/store";

const langSchema = z.enum(["en", "tl"]);

export async function listCatalogPublic(lang: LanguageCode, includeInactive = false) {
  const user = await requireUser();
  void user;
  return readCatalog(createServiceClient(), lang, includeInactive);
}

const catalogPageSchema = z.object({
  lang: langSchema,
  search: z.string().trim().max(100),
  category: z.string().max(60),
  archived: z.boolean(),
  page: z.number().int().min(1).max(100000),
  pageSize: z.number().int().min(1).max(50),
});

export async function listCatalogPage(input: unknown) {
  await requireUser();
  const parsed = catalogPageSchema.parse(input);
  return readCatalogPage(createServiceClient(), parsed);
}

const pubSchema = z.object({
  itemNo: z.string().max(20).nullable(),
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().max(20).nullable(),
  category: z.string().trim().min(1).max(60),
});

const keySchema = z.object({
  itemNo: z.string().max(20).nullable(),
  name: z.string().min(1).max(200),
  section: z.string().min(1).max(60),
});

export async function adminCreatePublication(lang: LanguageCode, input: unknown): Promise<void> {
  const actor = await requireAdmin();
  const service = createServiceClient();
  await createPublication(service, langSchema.parse(lang), pubSchema.parse(input));
  await logEvent(service, actor.id, "catalog.save", "publications", { detail: "Added a publication" });
  revalidatePath("/publications");
  revalidatePath("/inventory");
}

export async function adminUpdatePublication(
  lang: LanguageCode,
  key: unknown,
  input: unknown,
): Promise<void> {
  const actor = await requireAdmin();
  const service = createServiceClient();
  await updatePublication(service, langSchema.parse(lang), keySchema.parse(key), pubSchema.parse(input));
  await logEvent(service, actor.id, "catalog.save", "publications", { detail: "Edited a publication" });
  revalidatePath("/publications");
  revalidatePath("/inventory");
}

export async function adminSetPublicationActive(lang: LanguageCode, key: unknown, active: boolean): Promise<void> {
  const actor = await requireAdmin();
  const service = createServiceClient();
  await setPublicationActive(service, langSchema.parse(lang), keySchema.parse(key), active);
  await logEvent(service, actor.id, "catalog.save", "publications", {
    detail: `${active ? "Restored" : "Archived"} a publication`,
  });
  revalidatePath("/publications");
  revalidatePath("/inventory");
}

export async function adminCreateCategory(lang: LanguageCode, name: unknown): Promise<void> {
  const actor = await requireAdmin();
  const service = createServiceClient();
  await createCategory(service, langSchema.parse(lang), z.string().parse(name));
  await logEvent(service, actor.id, "catalog.save", "categories", { detail: "Added a category" });
  revalidatePath("/publications");
  revalidatePath("/inventory");
}

export async function adminRenameCategory(lang: LanguageCode, from: unknown, to: unknown): Promise<void> {
  const actor = await requireAdmin();
  const service = createServiceClient();
  await renameCategory(service, langSchema.parse(lang), z.string().parse(from), z.string().parse(to));
  await logEvent(service, actor.id, "catalog.save", "categories", { detail: "Renamed a category" });
  revalidatePath("/publications");
  revalidatePath("/inventory");
}

export async function adminSetCategoryActive(lang: LanguageCode, name: unknown, active: boolean): Promise<void> {
  const actor = await requireAdmin();
  const service = createServiceClient();
  await setCategoryActive(service, langSchema.parse(lang), z.string().parse(name), active);
  await logEvent(service, actor.id, "catalog.save", "categories", {
    detail: `${active ? "Restored" : "Hid"} a category`,
  });
  revalidatePath("/publications");
  revalidatePath("/inventory");
}

export async function adminDeleteCategory(lang: LanguageCode, name: unknown): Promise<void> {
  const actor = await requireAdmin();
  const service = createServiceClient();
  await deleteCategory(service, langSchema.parse(lang), z.string().parse(name));
  await logEvent(service, actor.id, "catalog.save", "categories", { detail: "Deleted a category" });
  revalidatePath("/publications");
  revalidatePath("/inventory");
}
