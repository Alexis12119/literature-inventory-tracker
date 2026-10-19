"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, type AppRole } from "@/src/lib/auth/gates";
import { createServiceClient } from "@/src/lib/supabase/service";
import { logEvent } from "@/src/lib/data-access/admin";
import { listUserPage } from "@/src/lib/data-access/users";

const userPageSchema = z.object({
  search: z.string().trim().max(100),
  status: z.enum(["all", "active", "pending"]),
  role: z.enum(["all", "administrator", "literature_servant", "—"]),
  page: z.number().int().min(1).max(100000),
  pageSize: z.number().int().min(1).max(50),
});

export async function getUserDirectoryPage(input: unknown) {
  await requireAdmin();
  return listUserPage(createServiceClient(), userPageSchema.parse(input));
}

/** Approve (activate) or suspend a registered account. */
export async function setAccountActive(userId: string, active: boolean): Promise<void> {
  const admin = await requireAdmin();
  if (admin.id === userId && !active) {
    throw new Error("You cannot suspend your own account.");
  }
  const service = createServiceClient();
  const { error } = await service.from("profiles").update({ is_deactivated: !active }).eq("id", userId);
  if (error) throw new Error("Could not update that account. Try again.");
  await logEvent(service, admin.id, active ? "users.approve" : "users.suspend", "profiles", {
    user_id: userId,
  });
  revalidatePath("/users");
}

/** Change a registered account's role. Never self-applicable. */
export async function setAccountRole(userId: string, role: AppRole): Promise<void> {
  const admin = await requireAdmin();
  if (admin.id === userId) {
    throw new Error("You cannot change your own role.");
  }
  if (role !== "administrator" && role !== "literature_servant") {
    throw new Error("Unknown role.");
  }
  const service = createServiceClient();
  const { error } = await service.from("user_roles").update({ role, granted_by: admin.id }).eq("user_id", userId);
  if (error) throw new Error("Could not update that role. Try again.");
  await logEvent(service, admin.id, "users.role", "user_roles", { user_id: userId, role });
  revalidatePath("/users");
}
