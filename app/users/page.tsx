import { connection } from "next/server";
import { Suspense } from "react";
import { requireAdmin, displayNameOf, type AppRole } from "@/src/lib/auth/gates";
import { createServiceClient } from "@/src/lib/supabase/service";
import { setAccountActive, setAccountRole } from "@/src/features/users/actions";
import { ConfirmAction } from "@/src/components/ui/confirm";
import { Badge, EmptyState } from "@/src/components/ui/controls";

interface Row {
  id: string;
  email: string;
  displayName: string;
  role: AppRole | "—";
  active: boolean;
  createdAt: string;
}

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
        <p className="border-b border-zinc-200 px-4 py-3 text-sm text-zinc-500">Loading registered users…</p>
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
  const roleById = new Map((roles ?? []).map((r) => [r.user_id as string, r.role as AppRole]));
  const emailById = new Map((authList?.users ?? []).map((u) => [u.id, u.email ?? "—"]));
  const rows: Row[] = (profiles ?? []).map((p) => ({
    id: p.id as string,
    email: emailById.get(p.id as string) ?? "—",
    displayName: displayNameOf(p as { first_name: string; middle_name: string | null; last_name: string }),
    role: roleById.get(p.id as string) ?? "—",
    active: !(p.is_deactivated as boolean),
    createdAt: p.created_at as string,
  }));
  const pending = rows.filter((r) => !r.active);

  return (
    <div className="page-content flex flex-col gap-4 pb-8 pt-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Registered users</h1>
          <p className="mt-1 text-sm text-zinc-500">Review registrations and manage account access.</p>
        </div>
        <Badge tone={pending.length > 0 ? "warning" : "success"}>
          {pending.length > 0 ? `${pending.length} awaiting approval` : "Queue clear"}
        </Badge>
      </div>
      <p className="max-w-3xl text-sm leading-6 text-zinc-600">
        New registrations stay pending until approved here. Approving activates the account;
        suspending signs the user out on their next request.
      </p>
      {rows.length === 0 ? (
        <EmptyState title="No registrations yet" hint="Accounts appear here after someone registers." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full min-w-2xl border-collapse text-sm">
            <thead>
              <tr className="bg-[#314b3d] text-left text-white">
                <th scope="col" className="px-3 py-2 text-xs font-semibold">Name</th>
                <th scope="col" className="px-3 py-2 text-xs font-semibold">Email</th>
                <th scope="col" className="px-3 py-2 text-xs font-semibold">Status</th>
                <th scope="col" className="px-3 py-2 text-xs font-semibold">Role</th>
                <th scope="col" className="px-3 py-2 text-xs font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-zinc-200 transition-colors hover:bg-[#f4f8f4]">
                  <td className="px-3 py-3 font-medium">
                    {r.displayName}
                    {r.id === admin.id && <span className="ml-1 text-xs text-zinc-400">(you)</span>}
                  </td>
                  <td className="px-3 py-3 text-zinc-600">{r.email}</td>
                  <td className="px-3 py-3">
                    <Badge tone={r.active ? "success" : "warning"}>{r.active ? "Active" : "Pending"}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <ConfirmAction
                      run={setAccountRole.bind(null, r.id, r.role === "administrator" ? "literature_servant" : "administrator")}
                      title={`Make ${r.displayName} ${r.role === "administrator" ? "a servant" : "an administrator"}?`}
                      message={
                        r.role === "administrator"
                          ? "They will lose access to user approval and catalog management."
                          : "They will gain access to user approval and catalog management."
                      }
                      confirmLabel="Change role"
                      disabled={r.id === admin.id}
                      label={r.id === admin.id ? "You cannot change your own role" : `Switch ${r.displayName} to ${r.role === "administrator" ? "literature servant" : "administrator"}`}
                    >
                      {r.role === "administrator" ? "Administrator" : "Servant"}
                    </ConfirmAction>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <ConfirmAction
                      run={setAccountActive.bind(null, r.id, !r.active)}
                      title={r.active ? `Suspend ${r.displayName}?` : `Approve ${r.displayName}?`}
                      message={
                        r.active
                          ? "They will be signed out and blocked until re-approved."
                          : "They will be able to sign in and use the inventory."
                      }
                      confirmLabel={r.active ? "Suspend" : "Approve"}
                      danger={r.active}
                      disabled={r.id === admin.id}
                      label={r.active ? `Suspend ${r.displayName}` : `Approve ${r.displayName}`}
                    >
                      {r.active ? "Suspend" : "Approve"}
                    </ConfirmAction>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
