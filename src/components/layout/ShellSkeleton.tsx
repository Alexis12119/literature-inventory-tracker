/**
 * Frame-matching loading state for the root session boundary. Mirrors the
 * application shell (sidebar + content) as skeleton blocks so reloading a
 * page shimmers in place instead of flashing the logged-out layout and then
 * popping into the sidebar.
 */
export function ShellSkeleton() {
  return (
    <div
      className="app-shell flex h-dvh overflow-hidden bg-zinc-100 text-zinc-900"
      aria-busy="true"
      aria-label="Loading application"
    >
      <aside className="hidden h-full w-60 shrink-0 flex-col gap-2 overflow-hidden border-r border-zinc-200 bg-white p-4 md:flex" aria-hidden>
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-200" />
        <div className="mt-2 flex flex-col gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-md bg-zinc-100" />
          ))}
        </div>
        <div className="mt-auto h-16 animate-pulse rounded-md bg-zinc-100" />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="h-14 shrink-0 animate-pulse border-b border-zinc-200 bg-white md:hidden" aria-hidden />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden px-3 py-4 sm:px-5 md:px-8" aria-hidden>
          <div className="h-7 w-48 animate-pulse rounded bg-zinc-200" />
          <div className="h-28 animate-pulse rounded-xl border border-zinc-200 bg-white" />
          <div className="h-64 animate-pulse rounded-xl border border-zinc-200 bg-white" />
        </div>
      </div>
    </div>
  );
}
