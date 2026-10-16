"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/src/components/ui/controls";

interface Entry {
  at: string;
  action: string;
  detail: string;
}

export default function ActivityPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const raw = window.localStorage.getItem("litinv:activity");
        setEntries(raw ? (JSON.parse(raw) as Entry[]) : []);
      } catch {
        setEntries([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-lg font-bold tracking-tight">Activity History</h1>
      {entries.length === 0 ? (
        <EmptyState
          title="No activity yet"
          hint="Local saves from the Inventory workspace will appear here. Server-side audit history arrives with the backend milestone."
        />
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((e, i) => (
            <li key={`${e.at}-${i}`} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
              <p className="font-medium">{e.detail}</p>
              <p className="text-xs text-zinc-500">{new Date(e.at).toLocaleString()} · {e.action}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
