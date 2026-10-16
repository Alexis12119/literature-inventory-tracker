"use client";

import { useEffect, useMemo, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Badge, Select } from "@/src/components/ui/controls";
import { MONTH_GROUPS, type MonthGroup } from "@/src/lib/reports/template";
import type { GridRow, InventoryGrid } from "@/src/features/inventory/store";
import type { Quantity } from "@/src/lib/domain/movement";
import { isSeptember, orderFromId } from "@/src/features/inventory/cycles";
import {
  CAMPAIGN_CODE,
  DEFAULT_CAMPAIGN_QTY,
  DEFAULT_LEAD_TIME_MONTHS,
  suggestOrders,
} from "@/src/features/ordering/suggest";

const SETTINGS_KEY = "litinv:order-settings";

function nextGroup(m: MonthGroup): MonthGroup {
  return MONTH_GROUPS[(MONTH_GROUPS.indexOf(m) + 1) % MONTH_GROUPS.length];
}

/**
 * "What should I order now?" — trailing average movement × lead time minus
 * current stock, with the September campaign top-up for the campaign item.
 * Lead time and campaign quantity are adjustable and remembered locally.
 */
export function SuggestionsCard({
  cycleId,
  grid,
  rows,
  carried,
  focusMonth,
}: {
  cycleId: string;
  grid: InventoryGrid;
  rows: GridRow[];
  carried: Record<string, Quantity>;
  focusMonth: MonthGroup;
}) {
  const [target, setTarget] = useState<MonthGroup>(() => nextGroup(focusMonth));
  const [lead, setLead] = useState(DEFAULT_LEAD_TIME_MONTHS);
  const [campaignQty, setCampaignQty] = useState(DEFAULT_CAMPAIGN_QTY);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = window.localStorage.getItem(SETTINGS_KEY);
        if (!raw) return;
        const s = JSON.parse(raw) as { lead?: number; campaignQty?: number };
        if (Number.isInteger(s.lead) && (s.lead as number) >= 1 && (s.lead as number) <= 6) {
          setLead(s.lead as number);
        }
        if (Number.isInteger(s.campaignQty) && (s.campaignQty as number) >= 0) {
          setCampaignQty(s.campaignQty as number);
        }
      } catch {
        /* local preview cache only */
      }
    });
  }, []);

  const persist = (nextLead: number, nextQty: number) => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ lead: nextLead, campaignQty: nextQty }));
    } catch {
      /* local preview cache only */
    }
  };

  // Campaign = the September slot: first group of a Sep–Feb cycle.
  // (Sep/Mar in a Mar–Aug cycle is March — no campaign.)
  const order = orderFromId(cycleId);
  const isCampaignMonth =
    order !== null && isSeptember(order, MONTH_GROUPS.indexOf(target));
  const suggestions = useMemo(
    () => suggestOrders(grid, { leadTimeMonths: lead, isCampaignMonth, campaignQty }, carried, rows),
    [grid, lead, isCampaignMonth, campaignQty, carried, rows],
  );
  const actionable = suggestions.filter((s) => s.suggested > 0);
  const covered = suggestions.length - actionable.length;
  const units = actionable.reduce((a, s) => a + s.suggested, 0);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4" aria-label="Suggested orders">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <ShoppingCart size={14} aria-hidden /> What to order · for {target}
        {isCampaignMonth && <Badge tone="warning">campaign month</Badge>}
      </h2>
      <p className="text-xs text-zinc-500">
        Trailing {3}-month average movement × {lead}-month lead time, minus stock on hand. Delivery
        usually takes 2–3 months — adjust the lead time to match your actual experience.
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
          Order for
          <Select value={target} onChange={(e) => setTarget(e.target.value as MonthGroup)} aria-label="Order for month">
            {MONTH_GROUPS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
          Lead time (months)
          <Select
            value={lead}
            onChange={(e) => {
              const v = Number(e.target.value);
              setLead(v);
              persist(v, campaignQty);
            }}
            aria-label="Delivery lead time in months"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </Select>
        </label>
        <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-zinc-700 sm:col-span-1">
          Sept. {CAMPAIGN_CODE} target
          <input
            type="number"
            min={0}
            max={99999}
            value={campaignQty}
            onChange={(e) => {
              const v = Math.max(0, Math.min(99999, Math.floor(Number(e.target.value) || 0)));
              setCampaignQty(v);
              persist(lead, v);
            }}
            aria-label="September campaign target quantity"
            className="h-9 rounded-md border border-zinc-300 bg-white px-2.5 text-sm tabular-nums focus:border-blue-700 focus:outline-2 focus:outline-blue-700"
          />
        </label>
      </div>

      {suggestions.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">No counted history yet — suggestions appear after counts are saved.</p>
      ) : (
        <>
          <p className="mt-2 text-sm">
            <strong className="tabular-nums">{actionable.length}</strong> items to order ·{" "}
            <strong className="tabular-nums">{units}</strong> units total
            {covered > 0 && <span className="text-zinc-500"> · {covered} covered</span>}
          </p>
          <div className="mt-1 max-h-80 overflow-auto overscroll-contain rounded-md border border-zinc-200" role="region" aria-label="Suggested orders" tabIndex={0}>
            <table className="w-full min-w-lg border-collapse bg-white text-sm">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                  <th scope="col" className="py-1.5 pr-2 font-medium">Publication</th>
                  <th scope="col" className="px-2 py-1.5 text-right font-medium">Avg/mo</th>
                  <th scope="col" className="px-2 py-1.5 text-right font-medium">On hand</th>
                  <th scope="col" className="px-2 py-1.5 text-right font-medium">Cover</th>
                  <th scope="col" className="py-1.5 pl-2 text-right font-medium">Order</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s) => (
                  <tr key={s.key} className="border-b border-zinc-100 last:border-0">
                    <td className="py-1.5 pr-2">
                      <span className="font-medium">{s.name}</span>{" "}
                      <span className="text-xs text-zinc-500">
                        {s.itemNo ? `${s.itemNo} · ` : ""}{s.section}
                      </span>{" "}
                      {s.reasons.includes("campaign") && <Badge tone="warning">campaign</Badge>}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-zinc-600">{s.avgMoved}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-zinc-600">{s.latestOnHand}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-zinc-600">
                      {s.monthsOfCover === null ? "—" : `${s.monthsOfCover} mo`}
                    </td>
                    <td className="py-1.5 pl-2 text-right font-bold tabular-nums">
                      {s.suggested === 0 ? <span className="font-medium text-zinc-400">—</span> : s.suggested}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
