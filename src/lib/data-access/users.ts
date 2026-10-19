import "server-only";

import type { Db } from "@/src/lib/data-access/catalog";
import type { UserDirectoryRow } from "@/src/features/users/UserDirectory";

export interface UserPage {
  rows: UserDirectoryRow[];
  total: number;
}

export async function listUserPage(
  db: Db,
  input: { search: string; status: string; role: string; page: number; pageSize: number },
): Promise<UserPage> {
  const { data, error } = await db.rpc("user_directory_page", {
    p_search: input.search,
    p_status: input.status,
    p_role: input.role,
    p_page: input.page,
    p_page_size: input.pageSize,
  });
  if (error) throw new Error("Could not load registered users.");
  const result = data as { total: number; rows: UserDirectoryRow[] };
  return { total: Number(result.total ?? 0), rows: result.rows ?? [] };
}
