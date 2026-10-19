"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Pagination } from "@/src/components/ui/Pagination";
import { Button, EmptyState, Input, Select, StickyBar } from "@/src/components/ui/controls";
import { getActivityPage } from "@/src/features/settings/actions";
import { useDebouncedValue } from "@/src/lib/use-debounced-value";
import { ClientPageCache } from "@/src/lib/client-page-cache";

interface Entry {
  id: number;
  actor: string | null;
  action: string;
  detail: string;
  at: string;
}

export default function ActivityPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [category, setCategory] = useState("all");
  const [timeRange, setTimeRange] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pageCache] = useState(() => new ClientPageCache<Awaited<ReturnType<typeof getActivityPage>>>());

  const hasFilters = Boolean(search || category !== "all" || timeRange !== "all");

  const prefetchPage = useCallback((targetPage: number) => {
    const input = { search: debouncedSearch.trim(), category, range: timeRange, page: targetPage, pageSize };
    void pageCache.get(JSON.stringify(input), () => getActivityPage(input)).catch(() => {});
  }, [debouncedSearch, category, timeRange, pageSize, pageCache]);

  const load = useCallback(async (force = false) => {
    const input = { search: debouncedSearch.trim(), category, range: timeRange, page, pageSize };
    const key = JSON.stringify(input);
    if (force) pageCache.clear();
    if (!pageCache.has(key)) setLoading(true);
    setError(null);
    try {
      const result = await pageCache.get(key, () => getActivityPage(input));
      setEntries(result.rows);
      setTotal(result.total);
      if (page * pageSize < result.total) prefetchPage(page + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load activity.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, timeRange, page, pageSize, pageCache, prefetchPage]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) void load(); });
    return () => { cancelled = true; };
  }, [load]);

  return (
    <div className="page-content flex flex-col gap-4 pb-8 pt-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Activity History</h1>
        <p className="mt-1 text-sm text-zinc-500">Recent inventory, catalog, and account changes.</p>
      </div>
      {loading && entries.length === 0 && total === 0 ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading activity">
          <div className="h-12 animate-pulse rounded-lg border border-zinc-200 bg-white" />
          <div className="h-12 animate-pulse rounded-lg border border-zinc-200 bg-white" />
          <div className="h-12 animate-pulse rounded-lg border border-zinc-200 bg-white" />
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-col items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-8 text-center">
          <p className="text-sm font-semibold">Could not load activity</p>
          <p className="text-sm text-zinc-500">{error}</p>
          <Button variant="secondary" onClick={() => void load(true)}>Retry</Button>
        </div>
      ) : total === 0 && !hasFilters ? (
        <EmptyState
          title="No activity yet"
          hint="Inventory saves, imports, catalog changes, and account decisions will appear here."
        />
      ) : (
        <>
          <StickyBar className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 sm:col-span-1">
              Search activity
              <span className="relative">
                <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Description or event…" className="pl-9" />
              </span>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Type
              <Select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} aria-label="Filter activity by type">
                <option value="all">All activity</option>
                <option value="inventory">Inventory</option>
                <option value="catalog">Catalog</option>
                <option value="users">User accounts</option>
                <option value="settings">Settings</option>
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Date range
              <Select value={timeRange} onChange={(event) => { setTimeRange(event.target.value); setPage(1); }} aria-label="Filter activity by date range">
                <option value="all">Any time</option>
                <option value="7">Past 7 days</option>
                <option value="30">Past 30 days</option>
              </Select>
            </label>
          </StickyBar>
          <p className="text-xs text-zinc-500" aria-live="polite">
            Showing {entries.length} of {total} {total === 1 ? "event" : "events"}
          </p>
          {entries.length > 0 ? (
            <ol
              aria-busy={loading}
              className={`flex max-h-[min(50vh,28rem)] flex-col gap-2 overflow-y-auto overscroll-contain pr-1 ${loading ? "opacity-70" : ""}`}
              role="region"
              aria-label="Activity history results"
              tabIndex={0}
            >
              {entries.map((e) => (
                <li key={e.id} className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm shadow-zinc-900/[0.02]">
                  <p className="font-medium leading-5">{e.detail}</p>
                  <p className="text-xs text-zinc-500">{new Date(e.at).toLocaleString()} · {e.action}</p>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title="No matching activity"
              hint="Try another search or adjust the type and date filters."
              action={hasFilters ? <Button variant="secondary" onClick={() => { setSearch(""); setCategory("all"); setTimeRange("all"); setPage(1); }}>Clear filters</Button> : undefined}
            />
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
      )}
    </div>
  );
}
