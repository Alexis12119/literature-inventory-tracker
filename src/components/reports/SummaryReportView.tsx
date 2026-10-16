"use client";

import { Fragment } from "react";
import { formatQty, type SummarySection } from "@/src/lib/reports/summary";
import type { LanguageCode } from "@/src/features/inventory/store";

export function SummaryReportView({
  lang,
  monthYear,
  congregation,
  sections,
}: {
  lang: LanguageCode;
  monthYear: string;
  congregation: string;
  sections: SummarySection[];
}) {
  return (
    <section className="rounded-lg border border-zinc-300 bg-white p-4 text-zinc-900" aria-label="Congregation literature summary report">
      <p className="text-xs text-zinc-500">Congregation Literature</p>
      <h2 className="mt-0.5 text-center text-base font-bold uppercase tracking-wide">
        Monthly Movement of Literature
      </h2>
      {congregation ? (
        <p className="mt-1 text-sm font-semibold">{congregation}</p>
      ) : (
        <p className="mt-1 text-sm text-zinc-400">Set the congregation name in Settings</p>
      )}
      <p className="mt-0.5 text-sm">
        {monthYear} | {lang === "tl" ? "Tagalog" : "English"}
      </p>

      <table className="mt-3 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-zinc-100">
            <th scope="col" className="border border-zinc-400 px-2 py-1.5 text-left text-xs font-bold">
              Item
            </th>
            <th scope="col" className="w-28 border border-zinc-400 px-2 py-1.5 text-center text-xs font-bold">
              Current Quantity on Hand
            </th>
            <th scope="col" className="w-28 border border-zinc-400 px-2 py-1.5 text-center text-xs font-bold">
              Average Monthly Movement
            </th>
          </tr>
        </thead>
        <tbody>
          {sections.map((sec) => (
            <Fragment key={sec.section}>
              <tr key={`sec-${sec.section}`}>
                <td colSpan={3} className="border border-zinc-400 bg-zinc-50 px-2 py-1 text-xs font-bold">
                  {sec.section}
                </td>
              </tr>
              {sec.items.map((item) => (
                <tr key={item.key}>
                  <td className="border border-zinc-300 px-2 py-1">
                    {item.code ? `(${item.code}) ` : ""}{item.name}
                  </td>
                  <td className="border border-zinc-300 px-2 py-1 text-center tabular-nums">
                    {formatQty(item.onHand)}
                  </td>
                  <td className="border border-zinc-300 px-2 py-1 text-center tabular-nums">
                    {formatQty(item.avgMoved)}
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </section>
  );
}
