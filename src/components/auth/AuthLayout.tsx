import { BookOpen, ClipboardCheck, FileText, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

const POINTS = [
  { icon: ClipboardCheck, text: "Monthly counts with automatic movement math" },
  { icon: FileText, text: "Faithful six-month and summary reports with custom PDF" },
  { icon: ShieldCheck, text: "Approval-gated access for servants and admins" },
];

/**
 * Modern auth frame: brand panel on desktop, compact brand row on mobile,
 * form content on the right. Restrained monochrome + single blue accent to
 * match the workspace aesthetic.
 */
export function AuthLayout({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm md:grid-cols-[1fr_1.25fr]">
      <div className="hidden flex-col justify-between gap-10 bg-zinc-900 p-8 text-white md:flex">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <BookOpen size={20} />
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight">Literature Inventory</p>
            <p className="text-xs text-zinc-400">Monthly Movement tracker</p>
          </div>
        </div>
        <ul className="flex flex-col gap-4">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2.5 text-sm text-zinc-200">
              <Icon size={17} aria-hidden className="mt-0.5 shrink-0 text-blue-400" />
              {text}
            </li>
          ))}
        </ul>
        <p className="text-xs text-zinc-500">
          Shared congregation workspace · English and Tagalog kept separate
        </p>
      </div>
      <div className="flex flex-col gap-4 p-5 sm:p-8">
        <div className="flex items-center gap-2 md:hidden">
          <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-white">
            <BookOpen size={18} />
          </span>
          <p className="text-sm font-bold tracking-tight">Literature Inventory</p>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{hint}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
