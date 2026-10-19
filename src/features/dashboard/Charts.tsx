"use client";

import type { CategoryStat, MonthStat } from "@/src/features/dashboard/analytics";

const W = 640;
const H = 240;
const PAD_TOP = 18;
const PAD_BOTTOM = 28;
const PAD_X = 44;

/** Diverging grouped bar chart: received vs moved per month, zero baseline. */
export function TrendChart({ months }: { months: MonthStat[] }) {
  const peak = Math.max(1, ...months.flatMap((m) => [Math.abs(m.received), Math.abs(m.moved)]));
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const midY = PAD_TOP + plotH / 2;
  const y = (v: number) => midY - (v / peak) * (plotH / 2);
  const slot = (W - PAD_X * 2) / months.length;
  const barW = Math.min(30, (slot - 18) / 2);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Monthly received versus moved. Peak magnitude ${peak}.`}
      >
        <desc>{months.map((m) => `${m.month}: received ${m.received}, moved ${m.moved}`).join("; ")}</desc>
        {/* gridlines + axis labels */}
        {[peak, 0, -peak].map((t) => (
          <g key={t}>
            <line x1={PAD_X} x2={W - 8} y1={y(t)} y2={y(t)} stroke="#d4d4d8" strokeWidth={t === 0 ? 1.5 : 1} />
            <text x={PAD_X - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill="#71717a">
              {t}
            </text>
          </g>
        ))}
        {months.map((m, i) => {
          const cx = PAD_X + slot * i + slot / 2;
          const bars = [
            { v: m.received, fill: "#315b4b", x: cx - barW - 2 },
            { v: m.moved, fill: m.moved < 0 ? "#b45309" : "#047857", x: cx + 2 },
          ];
          return (
            <g key={m.month}>
              {bars.map((b, bi) => {
                const y0 = y(0);
                const y1 = y(b.v);
                const h = Math.max(0, Math.abs(y1 - y0));
                const top = Math.min(y0, y1);
                return (
                  <g key={bi}>
                    <rect x={b.x} y={top} width={barW} height={h} rx={2} fill={b.fill} opacity={m.counted === 0 ? 0.25 : 1}>
                      <title>{`${m.month} ${bi === 0 ? "received" : "moved"}: ${b.v}`}</title>
                    </rect>
                    {m.counted > 0 && (
                      <text
                        x={b.x + barW / 2}
                        y={(b.v >= 0 ? top : top + h) + (b.v >= 0 ? -4 : 12)}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#3f3f46"
                      >
                        {b.v}
                      </text>
                    )}
                  </g>
                );
              })}
              <text x={cx} y={H - 8} textAnchor="middle" fontSize={10} fill="#52525b">
                {m.month}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-4 text-xs text-zinc-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" aria-hidden /> Rec&apos;d
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-700" aria-hidden /> Moved (amber when negative)
        </span>
      </figcaption>
    </figure>
  );
}

/** Completion progress with text (never color-alone). */
export function CompletionBar({ pct, counted, total }: { pct: number; counted: number; total: number }) {
  return (
    <div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-zinc-200"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Inventory completion ${pct} percent`}
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-zinc-600">
        {pct}% · {counted} of {total} publications counted
      </p>
    </div>
  );
}

/** Horizontal bars of net movement per category (focus month). */
export function CategoryBars({ categories }: { categories: CategoryStat[] }) {
  const ranked = [...categories].sort((a, b) => Math.abs(b.moved) - Math.abs(a.moved));
  const peak = Math.max(1, ...ranked.map((c) => Math.abs(c.moved)));
  if (ranked.every((c) => c.counted === 0)) {
    return <p className="text-sm text-zinc-500">No counted rows in this month yet.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {ranked.map((c) => (
        <li key={c.section}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium">{c.section}</span>
            <span className="text-xs text-zinc-500 tabular-nums">
              moved {c.moved} · {c.counted}/{c.total} counted
            </span>
          </div>
          <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className={`h-full rounded-full ${c.moved < 0 ? "bg-amber-600" : "bg-emerald-600"}`}
              style={{ width: `${(Math.abs(c.moved) / peak) * 100}%` }}
              role="img"
              aria-label={`${c.section} moved ${c.moved}`}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
