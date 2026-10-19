"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Pagination } from "@/src/components/ui/Pagination";
import { ConfirmAction } from "@/src/components/ui/confirm";
import { Badge, Button, EmptyState, Input, Select, StickyBar } from "@/src/components/ui/controls";
import { getUserDirectoryPage, setAccountActive, setAccountRole } from "@/src/features/users/actions";
import type { AppRole } from "@/src/lib/auth/gates";
import { useDebouncedValue } from "@/src/lib/use-debounced-value";
import { ClientPageCache } from "@/src/lib/client-page-cache";

export interface UserDirectoryRow {
  id: string;
  email: string;
  displayName: string;
  role: AppRole | "—";
  active: boolean;
  createdAt: string;
}

export function UserDirectory({ initialPage, adminId }: { initialPage: { rows: UserDirectoryRow[]; total: number }; adminId: string }) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState(initialPage.rows);
  const [total, setTotal] = useState(initialPage.total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRender = useRef(true);
  const [pageCache] = useState(() => new ClientPageCache<Awaited<ReturnType<typeof getUserDirectoryPage>>>());

  const prefetchPage = useCallback((targetPage: number) => {
    const input = { search: debouncedSearch.trim(), status, role, page: targetPage, pageSize };
    void pageCache.get(JSON.stringify(input), () => getUserDirectoryPage(input)).catch(() => {});
  }, [debouncedSearch, status, role, pageSize, pageCache]);

  const load = useCallback(async (force = false) => {
    const input = { search: debouncedSearch.trim(), status, role, page, pageSize };
    const key = JSON.stringify(input);
    if (force) pageCache.clear();
    if (!pageCache.has(key)) setLoading(true);
    setError(null);
    try {
      const result = await pageCache.get(key, () => getUserDirectoryPage(input));
      setRows(result.rows);
      setTotal(result.total);
      if (page * pageSize < result.total) prefetchPage(page + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load registered users.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, role, page, pageSize, pageCache, prefetchPage]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      if (pageSize < initialPage.total) prefetchPage(2);
      return;
    }
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) void load(); });
    return () => { cancelled = true; };
  }, [load, prefetchPage, pageSize, initialPage.total]);
  const runAndReload = async (action: () => Promise<void>) => { await action(); await load(true); };
  const hasFilters = Boolean(search || status !== "all" || role !== "all");

  return (
    <>
      <StickyBar className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Search users
          <span className="relative">
            <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Name or email…" className="pl-9" />
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Account status
          <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Filter users by account status">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending approval</option>
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Role
          <Select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} aria-label="Filter users by role">
            <option value="all">All roles</option>
            <option value="administrator">Administrator</option>
            <option value="literature_servant">Literature servant</option>
            <option value="—">Unassigned</option>
          </Select>
        </label>
      </StickyBar>
      <p className="text-xs text-zinc-500" aria-live="polite">
        Showing {rows.length} of {total} registered {total === 1 ? "user" : "users"}
      </p>
      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error} <Button variant="secondary" onClick={() => void load(true)}>Retry</Button></p> : null}
      {!loading && rows.length === 0 ? (
        <EmptyState
          title={total === 0 && !hasFilters ? "No registrations yet" : "No matching users"}
          hint={total === 0 && !hasFilters ? "Accounts appear here after someone registers." : "Try another name or adjust the account filters."}
          action={hasFilters ? <Button variant="secondary" onClick={() => { setSearch(""); setStatus("all"); setRole("all"); setPage(1); }}>Clear filters</Button> : undefined}
        />
      ) : (
        <div aria-busy={loading} className={`max-h-[min(50vh,28rem)] overflow-auto overscroll-contain rounded-xl border border-zinc-200 bg-white shadow-sm ${loading ? "opacity-70" : ""}`} role="region" aria-label="Registered users" tabIndex={0}>
          <table className="w-full min-w-2xl border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#314b3d] text-left text-white">
                <th scope="col" className="px-3 py-2 text-xs font-semibold">Name</th>
                <th scope="col" className="px-3 py-2 text-xs font-semibold">Email</th>
                <th scope="col" className="px-3 py-2 text-xs font-semibold">Status</th>
                <th scope="col" className="px-3 py-2 text-xs font-semibold">Role</th>
                <th scope="col" className="px-3 py-2 text-xs font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-zinc-200 transition-colors hover:bg-[#f4f8f4]">
                  <td className="px-3 py-3 font-medium">
                    {row.displayName}
                    {row.id === adminId && <span className="ml-1 text-xs text-zinc-400">(you)</span>}
                  </td>
                  <td className="px-3 py-3 text-zinc-600">{row.email}</td>
                  <td className="px-3 py-3">
                    <Badge tone={row.active ? "success" : "warning"}>{row.active ? "Active" : "Pending"}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <ConfirmAction
                      run={() => runAndReload(() => setAccountRole(row.id, row.role === "administrator" ? "literature_servant" : "administrator"))}
                      title={`Make ${row.displayName} ${row.role === "administrator" ? "a servant" : "an administrator"}?`}
                      message={row.role === "administrator" ? "They will lose access to user approval and catalog management." : "They will gain access to user approval and catalog management."}
                      confirmLabel="Change role"
                      disabled={row.id === adminId}
                      label={row.id === adminId ? "You cannot change your own role" : `Switch ${row.displayName} to ${row.role === "administrator" ? "literature servant" : "administrator"}`}
                    >
                      {row.role === "administrator" ? "Administrator" : row.role === "literature_servant" ? "Servant" : "Unassigned"}
                    </ConfirmAction>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <ConfirmAction
                      run={() => runAndReload(() => setAccountActive(row.id, !row.active))}
                      title={row.active ? `Suspend ${row.displayName}?` : `Approve ${row.displayName}?`}
                      message={row.active ? "They will be signed out and blocked until re-approved." : "They will be able to sign in and use the inventory."}
                      confirmLabel={row.active ? "Suspend" : "Approve"}
                      danger={row.active}
                      disabled={row.id === adminId}
                      label={row.active ? `Suspend ${row.displayName}` : `Approve ${row.displayName}`}
                    >
                      {row.active ? "Suspend" : "Approve"}
                    </ConfirmAction>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {total > 0 && (
        <Pagination
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          onPrefetchPage={prefetchPage}
        />
      )}
    </>
  );
}
