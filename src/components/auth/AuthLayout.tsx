import { BookOpen, ClipboardCheck, FileText, Languages } from "lucide-react";
import { Fragment, type ReactNode } from "react";

const POINTS = [
  { icon: ClipboardCheck, text: "Record monthly receipts and physical counts" },
  { icon: FileText, text: "Keep six-month reports ready from saved entries" },
  { icon: Languages, text: "English and Tagalog inventories stay separate" },
];

/**
 * Public account screens use a quiet ledger inspired frame and keep the
 * actual account task prominent. The worksheet sketch is decorative only;
 * it contains no sample quantities or fabricated inventory information.
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
    <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-[#dfe5df] bg-white shadow-[0_18px_60px_-32px_rgba(34,49,43,.32)] md:grid-cols-[.94fr_1fr]">
      <section className="relative hidden flex-col justify-between gap-8 overflow-hidden bg-[#eef3ef] p-8 md:flex lg:p-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-[#dce6dc]" aria-hidden />
        <div className="relative flex items-center gap-3">
          <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#315b4b] text-white shadow-sm">
            <BookOpen size={20} />
          </span>
          <div>
            <p className="text-[15px] font-bold tracking-tight text-[#263a32]">Literature Inventory</p>
            <p className="text-xs text-[#66796f]">Monthly movement tracker</p>
          </div>
        </div>

        <div className="relative space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#587062]">Shared congregation workspace</p>
            <h2 className="mt-3 max-w-sm text-3xl font-semibold leading-tight tracking-[-.04em] text-[#25382f]">
              Keep every month’s literature count in one place.
            </h2>
          </div>

          <div aria-hidden className="overflow-hidden rounded-xl border border-[#d8e1d9] bg-white/90 p-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#e7ece7] pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#edf3ee] text-[#315b4b]"><ClipboardCheck size={15} /></span>
              <span className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#52645a]">Six-month tracker</span>
            </div>
            <div className="mt-3 grid grid-cols-[1.25fr_repeat(3,1fr)] gap-px overflow-hidden rounded-md bg-[#dfe5df] text-[9px] text-[#637268]">
              <span className="bg-[#f4f7f4] px-2 py-2 font-semibold">PUBLICATION</span>
              <span className="bg-[#f4f7f4] px-1 py-2 text-center font-semibold">SEP / MAR</span>
              <span className="bg-[#f4f7f4] px-1 py-2 text-center font-semibold">OCT / APR</span>
              <span className="bg-[#f4f7f4] px-1 py-2 text-center font-semibold">NOV / MAY</span>
              {[0, 1, 2].map((row) => (
                <Fragment key={row}>
                  <span className="h-7 bg-white" />
                  <span className="bg-white" />
                  <span className="bg-white" />
                  <span className="bg-white" />
                </Fragment>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-[#7a887f]">Receipts · physical counts · calculated movement</p>
          </div>
        </div>

        <ul className="relative grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2.5 text-xs leading-5 text-[#51645a]">
              <Icon size={16} aria-hidden className="mt-0.5 shrink-0 text-[#587968]" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <p className="relative border-t border-[#d9e2da] pt-4 text-xs text-[#75847b]">
          For authorized literature servants and administrators.
        </p>
      </section>

      <section className="flex min-w-0 flex-col justify-center gap-6 p-5 sm:p-8 lg:px-10 lg:py-12">
        <div className="flex items-center gap-2.5 md:hidden">
          <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#315b4b] text-white">
            <BookOpen size={17} />
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight text-[#263a32]">Literature Inventory</p>
            <p className="text-[11px] text-zinc-500">Monthly movement tracker</p>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.13em] text-[#587062]">Congregation literature</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#25382f] sm:text-[1.75rem]">{title}</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-zinc-600">{hint}</p>
        </div>
        <div className="flex flex-col gap-4">{children}</div>
      </section>
    </div>
  );
}
