import { connection } from "next/server";
import { Suspense } from "react";
import { requireAdmin, displayNameOf } from "@/src/lib/auth/gates";
import { createServiceClient } from "@/src/lib/supabase/service";
import { UserDirectory, type UserDirectoryRow } from "@/src/features/users/UserDirectory";

export default function UsersPage() {
  return (
    <Suspense fallback={<UsersPageFallback />}>
      <UsersPageContent />
    </Suspense>
  );
}

function UsersPageFallback() {
  return (
    <div className="page-content flex flex-col gap-4 pb-8 pt-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Registered users</h1>
        <p className="mt-1 text-sm text-zinc-500">Review registrations and manage account access.</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm" aria-busy="true" aria-label="Loading registered users">
        <div className="flex flex-col gap-3 p-4" aria-hidden="true">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="grid grid-cols-4 gap-3">
              <span className="h-4 animate-pulse rounded bg-zinc-100" />
              <span className="h-4 animate-pulse rounded bg-zinc-100" />
              <span className="h-4 animate-pulse rounded bg-zinc-100" />
              <span className="h-4 animate-pulse rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function UsersPageContent() {
  // Request-time data (auth session clock) — never prerendered.
  await connection();
  const admin = await requireAdmin();
  const service = createServiceClient();
  const [{ data: profiles }, { data: roles }, { data: authList }] = await Promise.all([
    service.from("profiles").select("id, first_name, middle_name, last_name, is_deactivated, created_at").order("created_at", { ascending: false }),
    service.from("user_roles").select("user_id, role"),
    service.auth.admin.listUsers({ perPage: 100 }),
  ]);
  const roleById = new Map((roles ?? []).map((r) => [r.user_id as string, r.role as UserDirectoryRow["role"]]));
  const emailById = new Map((authList?.users ?? []).map((u) => [u.id, u.email ?? "—"]));
  const rows: UserDirectoryRow[] = (profiles ?? []).map((p) => ({
    id: p.id as string,
    email: emailById.get(p.id as string) ?? "—",
    displayName: displayNameOf(p as { first_name: string; middle_name: string | null; last_name: string }),
    role: roleById.get(p.id as string) ?? "—",
    active: !(p.is_deactivated as boolean),
    createdAt: p.created_at as string,
  }));
  return (
    <div className="page-content flex flex-col gap-4 pb-8 pt-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Registered users</h1>
          <p className="mt-1 text-sm text-zinc-500">Review registrations and manage account access.</p>
        </div>
      </div>
      <p className="max-w-3xl text-sm leading-6 text-zinc-600">
        New registrations stay pending until approved here. Approving activates the account;
        suspending signs the user out on their next request.
      </p>
      <UserDirectory rows={rows} adminId={admin.id} />
    </div>
  );
}
