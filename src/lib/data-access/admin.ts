import "server-only";

import type { Db } from "@/src/lib/data-access/catalog";

function normName(s: string): string {
  return s.trim().toLowerCase();
}

async function categoryId(db: Db, lang: string, name: string): Promise<string | null> {
  const { data } = await db
    .from("publication_categories")
    .select("id")
    .eq("language_code", lang)
    .ilike("name", name.trim());
  return (data?.[0]?.id as string | undefined) ?? null;
}

export async function createCategory(db: Db, lang: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 60) throw new Error("Enter a valid category name.");
  const { data: existing } = await db
    .from("publication_categories")
    .select("id")
    .eq("language_code", lang);
  if ((existing ?? []).length >= 60) throw new Error("Category limit reached.");
  const { data: maxRow } = await db
    .from("publication_categories")
    .select("sort_order")
    .eq("language_code", lang)
    .order("sort_order", { ascending: false })
    .limit(1);
  const next = ((maxRow?.[0]?.sort_order as number | undefined) ?? -1) + 1;
  const { error } = await db.from("publication_categories").insert({
    language_code: lang,
    name: trimmed,
    sort_order: next,
  });
  if (error) throw new Error("That category already exists.");
}

export async function renameCategory(db: Db, lang: string, from: string, to: string): Promise<void> {
  const trimmed = to.trim();
  if (!trimmed || trimmed.length > 60) throw new Error("Enter a valid category name.");
  const id = await categoryId(db, lang, from);
  if (!id) throw new Error("Category not found.");
  const { error } = await db.from("publication_categories").update({ name: trimmed }).eq("id", id);
  if (error) throw new Error("A category with that name already exists.");
}

export async function setCategoryActive(db: Db, lang: string, name: string, active: boolean): Promise<void> {
  const id = await categoryId(db, lang, name);
  if (!id) throw new Error("Category not found.");
  const { error } = await db.from("publication_categories").update({ is_active: active }).eq("id", id);
  if (error) throw new Error("Could not update that category.");
}

export async function deleteCategory(db: Db, lang: string, name: string): Promise<void> {
  const id = await categoryId(db, lang, name);
  if (!id) throw new Error("Category not found.");
  const { count } = await db
    .from("publications")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if ((count ?? 0) > 0) {
    throw new Error("Move or remove its publications first — categories with items can't be deleted (hide instead).");
  }
  const { error } = await db.from("publication_categories").delete().eq("id", id);
  if (error) throw new Error("Could not delete that category.");
}

export interface PublicationInput {
  itemNo: string | null;
  name: string;
  code: string | null;
  category: string;
  sortOrder?: number;
}

function cleanOpt(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
}

export async function createPublication(db: Db, lang: string, input: PublicationInput): Promise<void> {
  const name = input.name.trim();
  if (!name || name.length > 200) throw new Error("Enter a valid publication name.");
  const category_id = await categoryId(db, lang, input.category);
  if (!category_id) throw new Error("Choose an existing category.");
  const { error } = await db.from("publications").insert({
    language_code: lang,
    category_id,
    item_no: cleanOpt(input.itemNo),
    name,
    code: cleanOpt(input.code),
  });
  if (error) throw new Error("Could not add that publication (duplicate item number?).");
}

export async function updatePublication(
  db: Db,
  lang: string,
  key: { itemNo: string | null; name: string; section: string },
  input: PublicationInput,
): Promise<void> {
  const name = input.name.trim();
  if (!name || name.length > 200) throw new Error("Enter a valid publication name.");
  const category_id = await categoryId(db, lang, input.category);
  if (!category_id) throw new Error("Choose an existing category.");
  // Locate by template identity (original section/item/name), then rewrite display fields.
  const { data: cats } = await db.from("publication_categories").select("id, name").eq("language_code", lang);
  const catByName = new Map((cats ?? []).map((c) => [normName(c.name as string), c.id as string]));
  const origCatId = catByName.get(normName(key.section));
  let query = db.from("publications").select("id").eq("language_code", lang).eq("name", key.name);
  if (origCatId) query = query.eq("category_id", origCatId);
  if (key.itemNo) query = query.eq("item_no", key.itemNo);
  const { data: found } = await query.limit(2);
  if (!found || found.length !== 1) throw new Error("Publication not found (it may have been edited already).");
  const { error } = await db
    .from("publications")
    .update({
      category_id,
      item_no: cleanOpt(input.itemNo),
      name,
      code: cleanOpt(input.code),
    })
    .eq("id", found[0].id as string);
  if (error) throw new Error("Could not save those changes (duplicate item number?).");
}

export async function setPublicationActive(
  db: Db,
  lang: string,
  key: { itemNo: string | null; name: string; section: string },
  active: boolean,
): Promise<void> {
  const { data: cats } = await db.from("publication_categories").select("id, name").eq("language_code", lang);
  const catByName = new Map((cats ?? []).map((c) => [normName(c.name as string), c.id as string]));
  const origCatId = catByName.get(normName(key.section));
  let query = db.from("publications").select("id").eq("language_code", lang).eq("name", key.name);
  if (origCatId) query = query.eq("category_id", origCatId);
  if (key.itemNo) query = query.eq("item_no", key.itemNo);
  const { data: found } = await query.limit(2);
  if (!found || found.length !== 1) throw new Error("Publication not found.");
  const { error } = await db.from("publications").update({ is_active: active }).eq("id", found[0].id as string);
  if (error) throw new Error("Could not update that publication.");
}

export async function getSettings(db: Db): Promise<Record<string, string>> {
  const { data, error } = await db.from("app_settings").select("key, value");
  if (error) throw new Error("Could not load settings.");
  return Object.fromEntries((data ?? []).map((r) => [r.key as string, (r.value as string) ?? ""]));
}

export async function setSetting(db: Db, actorId: string, key: string, value: string): Promise<void> {
  const { error } = await db
    .from("app_settings")
    .upsert({ key, value: value.slice(0, 500), updated_by: actorId }, { onConflict: "key" });
  if (error) throw new Error("Could not save that setting.");
}

export async function listActivity(
  db: Db,
  limit = 50,
): Promise<Array<{ id: number; actor: string | null; action: string; detail: string; at: string }>> {
  const { data, error } = await db
    .from("audit_events")
    .select("id, actor, action, entity_id, after, at")
    .order("at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 200));
  if (error) throw new Error("Could not load activity.");
  return (data ?? []).map((e) => ({
    id: e.id as number,
    actor: (e.actor as string | null) ?? null,
    action: e.action as string,
    detail: describeEvent(e.action as string, (e.after as Record<string, unknown> | null) ?? null),
    at: e.at as string,
  }));
}

export async function listActivityPage(
  db: Db,
  input: { search: string; category: string; since: string | null; page: number; pageSize: number },
): Promise<{ rows: Array<{ id: number; actor: string | null; action: string; detail: string; at: string }>; total: number }> {
  const { data, error } = await db.rpc("activity_page", {
    p_search: input.search,
    p_category: input.category,
    p_since: input.since,
    p_page: input.page,
    p_page_size: input.pageSize,
  });
  if (error) throw new Error("Could not load activity.");
  const result = data as {
    total: number;
    rows: Array<{ id: number; actor: string | null; action: string; after: Record<string, unknown> | null; at: string }>;
  };
  return {
    total: Number(result.total ?? 0),
    rows: (result.rows ?? []).map((event) => ({
      id: event.id,
      actor: event.actor,
      action: event.action,
      detail: describeEvent(event.action, event.after),
      at: event.at,
    })),
  };
}

function describeEvent(action: string, after: Record<string, unknown> | null): string {
  if (action === "inventory.save" && after) {
    const total = (after["original"] as number) ?? 0;
    void total;
    return `Saved ${after["period"] as string} / ${String(after["lang"] ?? "").toUpperCase()} workspace`;
  }
  if (action === "inventory.import" && after) {
    return `Imported ${after["total"] as number} values (${after["sheets"] as number} sheets)`;
  }
  if (action === "users.approve" && after) return `Approved account ${(after["email"] ?? after["user_id"]) as string}`;
  if (action === "users.suspend" && after) return `Suspended account ${(after["user_id"] ?? "") as string}`;
  if (action === "users.role" && after) return `Changed role to ${after["role"] as string}`;
  if (action === "catalog.save" && after) return `${after["detail"] as string}`;
  if (action === "settings.save" && after) return `Updated setting ${after["key"] as string}`;
  return action;
}

export async function logEvent(
  db: Db,
  actorId: string | null,
  action: string,
  entity: string,
  after: Record<string, unknown>,
): Promise<void> {
  await db.from("audit_events").insert({ actor: actorId, action, entity, after });
}
