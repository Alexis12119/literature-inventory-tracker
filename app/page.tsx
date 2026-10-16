"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  History,
  Package,
  Plus,
  TrendingUp,
} from "lucide-react";
import { Badge, Button, EmptyState, Select, StickyBar } from "@/src/components/ui/controls";
import { blankGrid, type InventoryGrid, type LanguageCode } from "@/src/features/inventory/store";
import { useCarriedOriginals } from "@/src/features/inventory/carry";
import { useCycles } from "@/src/features/inventory/cycles";
import { MONTH_GROUPS, type MonthGroup } from "@/src/lib/reports/template";
import { computeCycleStats, isGridEmpty } from "@/src/features/dashboard/analytics";
import { CategoryBars, CompletionBar, TrendChart } from "@/src/features/dashboard/Charts";
import { SuggestionsCard } from "@/src/features/ordering/SuggestionsCard";

interface ActivityEntry {
  at: string;
  action: string;
  detail: string;
}

export default function DashboardPage() {
  const { cycles, selectedId: cycle, setSelectedId: setCycle, addServiceYear, canAddMore } = useCycles();
  const [lang, setLang] = useState<LanguageCode>("tl");
  const [focusMonth, setFocusMonth] = useState<MonthGroup>(MONTH_GROUPS[5]);
  const [grid, setGrid] = useState<InventoryGrid | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const carried = useCarriedOriginals(cycle, lang);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const raw = window.localStorage.getItem(`litinv:grid:${cycle}:${lang}`);
        setGrid(raw ? (JSON.parse(raw) as InventoryGrid) : blankGrid());
        const log = window.localStorage.getItem("litinv:activity");
        setActivity(log ? (JSON.parse(log) as ActivityEntry[]).slice(0, 5) : []);
      } catch {
        setGrid(blankGrid());
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cycle, lang]);

  const stats = grid && !isGridEmpty(grid) ? computeCycleStats(grid, focusMonth, carried.values) : null;
  const activeCycle = cycles.find((c) => c.id === cycle);

  return (
    <div className="flex flex-col gap-3">
      <StickyBar className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight">Dashboard</h1>
          <Badge tone="neutral">Local preview data</Badge>
          <Link
            href="/inventory"
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-700 px-3 text-xs font-medium text-white hover:bg-blue-800"
          >
            Continue entry <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 bg-white p-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            <span id="dash-cycle-label">Reporting cycle</span>
            <div className="flex gap-1" role="group" aria-labelledby="dash-cycle-label">
              <Select
                value={cycle}
                onChange={(e) => setCycle(e.target.value)}
                aria-label="Reporting cycle"
                className="min-w-0 flex-1"
              >
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="secondary"
                onClick={addServiceYear}
                disabled={!canAddMore}
                title="Add another service year"
                aria-label="Add another service year"
                className="shrink-0 px-2.5"
              >
                <Plus size={15} aria-hidden />
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            Language
            <div className="flex overflow-hidden rounded-md border border-zinc-300" role="group" aria-label="Language">
              {(["en", "tl"] as LanguageCode[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={lang === l}
                  onClick={() => setLang(l)}
                  className={`h-9 flex-1 text-sm font-medium ${lang === l ? "bg-blue-700 text-white" : "bg-white text-zinc-700 hover:bg-zinc-50"}`}
                >
                  {l === "en" ? "English" : "Tagalog"}
                </button>
              ))}
            </div>
          </div>
          <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-zinc-700 sm:col-span-1">
            Focus month
            <Select value={focusMonth} onChange={(e) => setFocusMonth(e.target.value as MonthGroup)} aria-label="Focus month">
              {MONTH_GROUPS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </StickyBar>

      {grid === null ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading dashboard">
          <div className="h-24 animate-pulse rounded-lg border border-zinc-200 bg-white" />
          <div className="h-56 animate-pulse rounded-lg border border-zinc-200 bg-white" />
        </div>
      ) : stats === null ? (
        <EmptyState
          title="No inventory data yet"
          hint={`Nothing has been entered for ${activeCycle?.label ?? "this cycle"} (${lang === "tl" ? "Tagalog" : "English"}). Open the workspace to take your first counts — figures here always come from saved entries, never placeholders.`}
          action={
            <Link
              href="/inventory"
              className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-700 px-3.5 text-sm font-medium text-white hover:bg-blue-800"
            >
              Open inventory entry <ArrowRight size={14} aria-hidden />
            </Link>
          }
        />
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <section className="rounded-lg border border-zinc-200 bg-white p-3" aria-label="Completion">
              <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <ClipboardCheck size={14} aria-hidden /> Completion · {focusMonth}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{stats.completionPct}%</p>
              <CompletionBar pct={stats.completionPct} counted={stats.counted} total={stats.totalPublications} />
              <p className="mt-1 text-xs text-zinc-500">{stats.cycleCounted} touched this cycle</p>
            </section>
            <section className="rounded-lg border border-zinc-200 bg-white p-3" aria-label="Missing counts">
              <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <AlertTriangle size={14} aria-hidden /> Missing counts
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{stats.missing}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {stats.missing === 0 ? "All counted — ready for reporting." : `Uncounted in ${focusMonth}.`}
              </p>
              {stats.missing > 0 && (
                <Link href="/inventory" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline">
                  Fill them in <ArrowRight size={12} aria-hidden />
                </Link>
              )}
            </section>
            <section className="rounded-lg border border-zinc-200 bg-white p-3" aria-label="Moved">
              <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <TrendingUp size={14} aria-hidden /> Moved · {focusMonth}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{stats.totalMoved}</p>
              <p className="mt-1 text-xs text-zinc-500">Net change across {stats.counted} counted rows</p>
            </section>
            <section className="rounded-lg border border-zinc-200 bg-white p-3" aria-label="Received">
              <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <Package size={14} aria-hidden /> Received · {focusMonth}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{stats.totalReceived}</p>
              <p className="mt-1 text-xs text-zinc-500">Stock added across {stats.counted} counted rows</p>
            </section>
          </div>

          {/* Trend */}
          <section className="rounded-lg border border-zinc-200 bg-white p-4" aria-label="Movement trend">
            <h2 className="text-sm font-semibold">
              Movement trend · {activeCycle?.label} · {lang === "tl" ? "Tagalog" : "English"}
            </h2>
            <p className="text-xs text-zinc-500">Received vs moved per month group, from saved counts only.</p>
            <div className="mt-2">
              <TrendChart months={stats.months} />
            </div>
          </section>

          <SuggestionsCard cycleId={cycle} lang={lang} grid={grid} focusMonth={focusMonth} />

          <div className="grid gap-3 lg:grid-cols-2">
            {/* Top movers */}
            <section className="rounded-lg border border-zinc-200 bg-white p-4" aria-label="Top movers">
              <h2 className="text-sm font-semibold">Top movers · {focusMonth}</h2>
              {stats.topMovers.length === 0 ? (
                <p className="mt-1 text-sm text-zinc-500">No counted rows in this month yet.</p>
              ) : (
                <ol className="mt-2 flex flex-col gap-1.5">
                  {stats.topMovers.map((p, i) => (
                    <li key={p.key} className="flex items-baseline justify-between gap-2 border-b border-zinc-100 pb-1.5 text-sm last:border-0">
                      <span className="min-w-0">
                        <span className="mr-1.5 font-bold text-zinc-400 tabular-nums">{i + 1}</span>
                        <span className="font-medium">{p.name}</span>{" "}
                        <span className="text-xs text-zinc-500">
                          {p.itemNo ? ` ${p.itemNo} ·` : ""} {p.section}
                        </span>
                      </span>
                      <span className="shrink-0 font-bold tabular-nums">{p.moved}</span>
                    </li>
                  ))}
                </ol>
              )}
              {stats.zeroStock.length > 0 && (
                <div className="mt-3 rounded-md bg-amber-50 p-2.5 text-sm">
                  <p className="font-semibold text-amber-900">Counted at zero ({stats.zeroStock.length})</p>
                  <p className="text-xs text-amber-800">
                    {stats.zeroStock.slice(0, 4).map((p) => p.name).join(" · ")}
                    {stats.zeroStock.length > 4 ? ` · +${stats.zeroStock.length - 4} more` : ""}
                  </p>
                </div>
              )}
            </section>

            <div className="flex flex-col gap-3">
              {/* Categories */}
              <section className="rounded-lg border border-zinc-200 bg-white p-4" aria-label="Movement by category">
                <h2 className="text-sm font-semibold">Movement by category · {focusMonth}</h2>
                <div className="mt-2">
                  <CategoryBars categories={stats.categories} />
                </div>
              </section>
              {/* Activity */}
              <section className="rounded-lg border border-zinc-200 bg-white p-4" aria-label="Recent activity">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                  <History size={14} aria-hidden /> Recent activity
                </h2>
                {activity.length === 0 ? (
                  <p className="mt-1 text-sm text-zinc-500">No saves recorded yet in this browser.</p>
                ) : (
                  <ol className="mt-2 flex flex-col gap-1.5">
                    {activity.map((e, i) => (
                      <li key={`${e.at}-${i}`} className="text-sm">
                        <span className="font-medium">{e.detail}</span>{" "}
                        <span className="text-xs text-zinc-500">{new Date(e.at).toLocaleString()}</span>
                      </li>
                    ))}
                  </ol>
                )}
                <Link href="/activity" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline">
                  Full history <ArrowRight size={12} aria-hidden />
                </Link>
              </section>
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            Figures are computed from your saved local workspace for {activeCycle?.label} (
            {lang === "tl" ? "Tagalog" : "English"}). Server-side metrics arrive with the backend
            milestone.
          </p>
        </>
      )}
    </div>
  );
}
