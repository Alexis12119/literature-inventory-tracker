"use client";

import { Select } from "@/src/components/ui/controls";

export function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onPrefetchPage,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onPrefetchPage?: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const first = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const last = Math.min(currentPage * pageSize, total);

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm" aria-label="Pagination">
      <p className="text-xs text-zinc-500" aria-live="polite">Showing {first}–{last} of {total}</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-zinc-600">
          Rows
          <Select value={String(pageSize)} onChange={(event) => onPageSizeChange(Number(event.target.value))} aria-label="Rows per page" className="h-9">
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </Select>
          per page
        </label>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          onMouseEnter={() => { if (currentPage > 1) onPrefetchPage?.(currentPage - 1); }}
          onFocus={() => { if (currentPage > 1) onPrefetchPage?.(currentPage - 1); }}
          disabled={currentPage <= 1}
          className="min-h-9 rounded-lg border border-zinc-300 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="min-w-16 text-center text-xs tabular-nums text-zinc-600">{currentPage} / {pageCount}</span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          onMouseEnter={() => { if (currentPage < pageCount) onPrefetchPage?.(currentPage + 1); }}
          onFocus={() => { if (currentPage < pageCount) onPrefetchPage?.(currentPage + 1); }}
          disabled={currentPage >= pageCount}
          className="min-h-9 rounded-lg border border-zinc-300 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
