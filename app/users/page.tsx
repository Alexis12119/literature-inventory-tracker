import { connection } from "next/server";
import { requireAdmin, displayNameOf, type AppRole } from "@/src/lib/auth/gates";
import { createServiceClient } from "@/src/lib/supabase/service";
import { setAccountActive, setAccountRole } from "@/src/features/users/actions";
import { Badge, EmptyState } from "@/src/components/ui/controls";

interface Row {
  id: string;
  email: string;
  displayName: string;
  role: AppRole | "—";
  active: boolean;
  createdAt: string;
}

export default async function UsersPage() {
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
    <div className="flex flex-col gap-3 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-bold tracking-tight">Registered users</h1>
        <Badge tone={pending.length > 0 ? "warning" : "success"}>
          {pending.length > 0 ? `${pending.length} awaiting approval` : "Queue clear"}
        </Badge>
      </div>
      <p className="text-sm text-zinc-500">
        New registrations stay pending until approved here. Approving activates the account;
        suspending signs the user out on their next request.
      </p>
      {rows.length === 0 ? (
        <EmptyState title="No registrations yet" hint="Accounts appear here after someone registers." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full min-w-2xl border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-900 text-left text-white">
                <th scope="col" className="px-3 py-2 text-xs font-semibold">Name</th>
                <th scope="col" className="px-3 py-2 text-xs font-semibold">Email</th>
                <th scope="col" className="px-3 py-2 text-xs font-semibold">Status</th>
                <th scope="col" className="px-3 py-2 text-xs font-semibold">Role</th>
                <th scope="col" className="px-3 py-2 text-xs font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-zinc-200">
                  <td className="px-3 py-1.5 font-medium">
                    {r.displayName}
                    {r.id === admin.id && <span className="ml-1 text-xs text-zinc-400">(you)</span>}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-600">{r.email}</td>
                  <td className="px-3 py-1.5">
                    <Badge tone={r.active ? "success" : "warning"}>{r.active ? "Active" : "Pending"}</Badge>
                  </td>
                  <td className="px-3 py-1.5">
                    <form action={setAccountRole.bind(null, r.id, r.role === "administrator" ? "literature_servant" : "administrator")}>
                      <button
                        type="submit"
                        disabled={r.id === admin.id}
                        title={r.id === admin.id ? "You cannot change your own role" : `Switch to ${r.role === "administrator" ? "literature servant" : "administrator"}`}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {r.role === "administrator" ? "Administrator" : "Servant"}
                      </button>
                    </form>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <form action={setAccountActive.bind(null, r.id, !r.active)}>
                      <button
                        type="submit"
                        disabled={r.id === admin.id}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {r.active ? "Suspend" : "Approve"}
                      </button>
                    </form>
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
