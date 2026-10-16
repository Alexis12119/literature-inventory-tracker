"use client";

import { useEffect, useState } from "react";
import { Button, EmptyState } from "@/src/components/ui/controls";
import { listRecentActivity } from "@/src/features/settings/actions";

interface Entry {
  id: number;
  actor: string | null;
  action: string;
  detail: string;
  at: string;
}

export default function ActivityPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await listRecentActivity(100));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load activity.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const log = await listRecentActivity(100);
        if (!cancelled) setEntries(log);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load activity.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-3 py-4">
      <h1 className="text-lg font-bold tracking-tight">Activity History</h1>
      {loading ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading activity">
          <div className="h-12 animate-pulse rounded-lg border border-zinc-200 bg-white" />
          <div className="h-12 animate-pulse rounded-lg border border-zinc-200 bg-white" />
          <div className="h-12 animate-pulse rounded-lg border border-zinc-200 bg-white" />
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-col items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-8 text-center">
          <p className="text-sm font-semibold">Could not load activity</p>
          <p className="text-sm text-zinc-500">{error}</p>
          <Button variant="secondary" onClick={() => void load()}>Retry</Button>
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          title="No activity yet"
          hint="Inventory saves, imports, catalog changes, and account decisions will appear here."
        />
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((e) => (
            <li key={e.id} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
              <p className="font-medium">{e.detail}</p>
              <p className="text-xs text-zinc-500">{new Date(e.at).toLocaleString()} · {e.action}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
