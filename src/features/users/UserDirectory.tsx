"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Pagination } from "@/src/components/ui/Pagination";
import { ConfirmAction } from "@/src/components/ui/confirm";
import { Badge, Button, EmptyState, Input, Select, StickyBar } from "@/src/components/ui/controls";
import { setAccountActive, setAccountRole } from "@/src/features/users/actions";
import type { AppRole } from "@/src/lib/auth/gates";

export interface UserDirectoryRow {
  id: string;
  email: string;
  displayName: string;
  role: AppRole | "—";
  active: boolean;
  createdAt: string;
}

export function UserDirectory({ rows, adminId }: { rows: UserDirectoryRow[]; adminId: string }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !query || `${row.displayName} ${row.email}`.toLocaleLowerCase().includes(query);
      const matchesStatus = status === "all" || (status === "active" ? row.active : !row.active);
      const matchesRole = role === "all" || row.role === role;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [rows, search, status, role]);
  const hasFilters = Boolean(search || status !== "all" || role !== "all");
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
        Showing {filteredRows.length} of {rows.length} registered {rows.length === 1 ? "user" : "users"}
      </p>
      {filteredRows.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? "No registrations yet" : "No matching users"}
          hint={rows.length === 0 ? "Accounts appear here after someone registers." : "Try another name or adjust the account filters."}
          action={rows.length > 0 && hasFilters ? <Button variant="secondary" onClick={() => { setSearch(""); setStatus("all"); setRole("all"); setPage(1); }}>Clear filters</Button> : undefined}
        />
      ) : (
        <div className="max-h-[min(50vh,28rem)] overflow-auto overscroll-contain rounded-xl border border-zinc-200 bg-white shadow-sm" role="region" aria-label="Registered users" tabIndex={0}>
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
              {pageRows.map((row) => (
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
                      run={setAccountRole.bind(null, row.id, row.role === "administrator" ? "literature_servant" : "administrator")}
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
                      run={setAccountActive.bind(null, row.id, !row.active)}
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
      {filteredRows.length > 0 && (
        <Pagination
          total={filteredRows.length}
          page={currentPage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      )}
    </>
  );
}
