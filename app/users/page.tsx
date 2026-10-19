import { connection } from "next/server";
import { Suspense } from "react";
import { requireAdmin } from "@/src/lib/auth/gates";
import { createServiceClient } from "@/src/lib/supabase/service";
import { UserDirectory } from "@/src/features/users/UserDirectory";
import { listUserPage } from "@/src/lib/data-access/users";

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
  const initialPage = await listUserPage(service, {
    search: "", status: "all", role: "all", page: 1, pageSize: 20,
  });
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
      <UserDirectory initialPage={initialPage} adminId={admin.id} />
    </div>
  );
}
