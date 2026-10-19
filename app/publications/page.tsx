"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Tags, X } from "lucide-react";
import { Pagination } from "@/src/components/ui/Pagination";
import { Badge, Button, EmptyState, Input, Select, StickyBar } from "@/src/components/ui/controls";
import { useDebouncedValue } from "@/src/lib/use-debounced-value";
import { useIsAdmin } from "@/src/components/auth/session";
import { useConfirm } from "@/src/components/ui/confirm";
import type { LanguageCode } from "@/src/features/inventory/store";
import type { CatalogRow } from "@/src/lib/data-access/catalog";
import {
  adminCreateCategory,
  adminCreatePublication,
  adminDeleteCategory,
  adminRenameCategory,
  adminSetCategoryActive,
  adminSetPublicationActive,
  adminUpdatePublication,
  listCatalogPublic,
} from "@/src/features/publications/actions";

const BLANK_FORM = { itemNo: "", name: "", code: "", section: "Books" };

type EditTarget =
  | { kind: "add" }
  | { kind: "edit"; key: string };

interface SectionRow {
  raw: string;
  display: string;
  isCustom: boolean;
  hidden: boolean;
  count: number;
}

export default function PublicationsPage() {
  const canManage = useIsAdmin();
  const confirm = useConfirm();
  const [lang, setLang] = useState<LanguageCode>("tl");
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [section, setSection] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form, setForm] = useState(BLANK_FORM);
  const [dialog, setDialog] = useState<null | EditTarget>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [newSection, setNewSection] = useState("");
  const [catError, setCatError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listCatalogPublic(lang, showArchived);
      setRows(data.rows);
      setSections(data.sections);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load the catalog.");
    } finally {
      setLoading(false);
    }
  }, [lang, showArchived]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) void refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    if (!dialog && !catOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDialog(null);
        setCatOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, catOpen]);

  const q = debouncedSearch.trim().toLowerCase();
  const visible = useMemo(
    () =>
      rows.filter((r) => {
        // Checked = archived only; unchecked = active only.
        if (showArchived ? r.active : !r.active) return false;
        if (section !== "all" && r.section !== section) return false;
        if (q && !`${r.itemNo ?? ""} ${r.name} ${r.code ?? ""}`.toLowerCase().includes(q)) return false;
        return true;
      }),
    [rows, section, q, showArchived],
  );
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.section] = (c[r.section] ?? 0) + 1;
    return c;
  }, [rows]);

  const sectionRows: SectionRow[] = useMemo(
    () =>
      sections.map((s) => ({
        raw: s,
        display: s,
        isCustom: false,
        hidden: false,
        count: counts[s] ?? 0,
      })),
    [sections, counts],
  );

  const openAdd = () => {
    setForm({ ...BLANK_FORM, section: section === "all" ? sections[0] ?? "Books" : section });
    setFormError(null);
    setDialog({ kind: "add" });
  };

  const closeDialog = () => {
    setDialog(null);
    setForm(BLANK_FORM);
    setFormError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    const editing = dialog?.kind === "edit";
    if (
      !(await confirm({
        title: editing ? "Save changes?" : "Add publication?",
        message: editing ? `Update "${name}" in the catalog?` : `Add "${name}" to the catalog?`,
        confirmLabel: editing ? "Save changes" : "Add publication",
      }))
    ) {
      return;
    }
    const input = {
      itemNo: form.itemNo.trim() || null,
      name,
      code: form.code.trim() || null,
      category: form.section,
    };
    try {
      if (dialog?.kind === "edit") {
        const current = rows.find((r) => r.key === dialog.key);
        if (!current) throw new Error("Publication not found.");
        const parts = current.key.split("::");
        await adminUpdatePublication(
          lang,
          { itemNo: current.itemNo, name: parts.slice(2).join("::") || current.name, section: current.section },
          input,
        );
      } else {
        await adminCreatePublication(lang, input);
      }
      closeDialog();
      await refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save.");
    }
  };

  const runCategory = async (fn: () => Promise<void>) => {
    setCatError(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setCatError(err instanceof Error ? err.message : "Could not update categories.");
    }
  };

  return (
    <div className="page-content flex flex-col gap-4 pb-8">
      <StickyBar className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Publications</h1>
            <p className="mt-0.5 text-sm text-zinc-500">Browse and maintain the shared literature catalog.</p>
          </div>
          <div className="flex overflow-hidden rounded-lg border border-zinc-300" role="group" aria-label="Language">
            {(["en", "tl"] as LanguageCode[]).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lang === l}
                onClick={() => {
                  setLang(l);
                  setSection("all");
                  setPage(1);
                }}
                className={`h-10 px-4 text-sm font-semibold ${lang === l ? "bg-accent text-white" : "bg-white text-zinc-700 hover:bg-zinc-50"}`}
              >
                {l === "en" ? "English" : "Tagalog"}
              </button>
            ))}
          </div>
          {canManage && (
            <span className="ml-auto flex gap-2">
              <Button variant="secondary" onClick={() => { setCatError(null); setCatOpen(true); }}>
                <Tags size={15} aria-hidden /> Categories
              </Button>
              <Button onClick={openAdd}>
                <Plus size={15} aria-hidden /> Add publication
              </Button>
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:grid-cols-3 sm:p-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            Search
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Name, item, code…" aria-label="Catalog search" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            Category
            <Select value={section} onChange={(e) => { setSection(e.target.value); setPage(1); }} aria-label="Category filter">
              <option value="all">All categories</option>
              {sections.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            Archived
            <span className="flex h-10 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-normal text-zinc-700 shadow-sm shadow-zinc-900/[0.02]">
              <input type="checkbox" checked={showArchived} onChange={(e) => { setShowArchived(e.target.checked); setPage(1); }} className="h-4 w-4 accent-[#315b4b]" />
              Show archived
            </span>
          </label>
        </div>
      </StickyBar>

      {dialog ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={dialog.kind === "edit" ? "Edit publication" : "Add publication"}
          onClick={closeDialog}
        >
          <form
            className="flex max-h-[85vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-lg bg-white p-4"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void submit(e)}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold">{dialog.kind === "edit" ? "Edit publication" : "Add publication"}</h2>
              <button
                type="button"
                onClick={closeDialog}
                aria-label="Close dialog"
                className="ml-auto rounded-md p-1.5 hover:bg-zinc-100"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">Item No.<Input value={form.itemNo} onChange={(e) => setForm({ ...form, itemNo: e.target.value })} /></label>
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">Code<Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label>
            </div>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">Name *<Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus /></label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">Category<Select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>{sections.map((s) => (<option key={s} value={s}>{s}</option>))}</Select></label>
            {formError && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeDialog}>Cancel</Button>
              <Button type="submit">{dialog.kind === "edit" ? "Save changes" : "Add to list"}</Button>
            </div>
          </form>
        </div>
      ) : null}

      {catOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Manage categories"
          onClick={() => setCatOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-lg bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold">Categories · {lang === "tl" ? "Tagalog" : "English"}</h2>
              <button
                type="button"
                onClick={() => setCatOpen(false)}
                aria-label="Close categories dialog"
                className="ml-auto rounded-md p-1.5 hover:bg-zinc-100"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Hiding keeps every quantity (restore anytime). Deleting is only for empty
              categories. Renames never break saved inventory.
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = newSection.trim();
                if (!name) return;
                void runCategory(() => adminCreateCategory(lang, name)).then(() => setNewSection(""));
              }}
            >
              <Input
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                placeholder="New category name"
                aria-label="New category name"
                className="flex-1"
              />
              <Button type="submit">Add</Button>
            </form>
            {catError && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{catError}</p>
            )}
            <ul className="flex flex-col gap-1.5">
              {sectionRows.map((s) => (
                <li key={s.raw} className="rounded-lg border border-zinc-200 px-3 py-2">
                  {renaming === s.raw ? (
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void runCategory(() => adminRenameCategory(lang, s.raw, renameValue)).then(() => setRenaming(null));
                      }}
                    >
                      <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} aria-label={`Rename ${s.display}`} autoFocus className="h-8 flex-1" />
                      <Button type="submit" className="h-8">Save</Button>
                      <Button type="button" variant="secondary" className="h-8" onClick={() => setRenaming(null)}>Cancel</Button>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{s.display}</span>
                      <span className="text-xs text-zinc-500 tabular-nums">{s.count} items</span>
                      <span className="ml-auto inline-flex gap-1.5">
                        <button type="button" onClick={() => { setRenaming(s.raw); setRenameValue(s.display); setCatError(null); }} className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50">Rename</button>
                        <button type="button" onClick={() => void runCategory(() => adminSetCategoryActive(lang, s.raw, false))} className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50">Hide</button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              await confirm({
                                title: `Delete "${s.display}"?`,
                                message: "The category is removed permanently. Only empty categories can be deleted.",
                                confirmLabel: "Delete",
                                danger: true,
                              })
                            ) {
                              void runCategory(() => adminDeleteCategory(lang, s.raw));
                            }
                          }}
                          title="Only empty categories can be deleted"
                          className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading catalog">
          <div className="h-16 animate-pulse rounded-lg border border-zinc-200 bg-white" />
          <div className="h-64 animate-pulse rounded-lg border border-zinc-200 bg-white" />
        </div>
      ) : loadError ? (
        <div role="alert" className="flex flex-col items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-8 text-center">
          <p className="text-sm font-semibold">Could not load the catalog</p>
          <p className="text-sm text-zinc-500">{loadError}</p>
          <Button variant="secondary" onClick={() => void refresh()}>Retry</Button>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState title="No publications found" hint="Adjust the search or category filter." />
      ) : (
        <div className="max-h-[min(50vh,28rem)] overflow-auto overscroll-contain rounded-lg border border-zinc-200 bg-white" role="region" aria-label="Publication catalog" tabIndex={0}>
          <table className="w-full min-w-xl border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#314b3d] text-left text-white">
                <th scope="col" className="border-b border-[#47604f] bg-[#314b3d] px-3 py-2 text-xs font-semibold">Item No.</th>
                <th scope="col" className="border-b border-[#47604f] bg-[#314b3d] px-3 py-2 text-xs font-semibold">Name</th>
                <th scope="col" className="border-b border-[#47604f] bg-[#314b3d] px-3 py-2 text-xs font-semibold">Category</th>
                {canManage && <th scope="col" className="border-b border-[#47604f] bg-[#314b3d] px-3 py-2 text-xs font-semibold"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.key} className="bg-white">
                  <td className="border-b border-zinc-200 px-3 py-1.5 text-zinc-600">{r.itemNo || "—"}</td>
                  <td className="border-b border-zinc-200 px-3 py-1.5 font-medium">
                    {r.name}
                    {r.code ? <span className="ml-1 text-xs text-zinc-400">{r.code}</span> : null}
                    {!r.active ? <Badge tone="neutral" className="ml-2">archived</Badge> : null}
                  </td>
                  <td className="border-b border-zinc-200 px-3 py-1.5 text-zinc-600">{r.section}</td>
                  {canManage && (
                    <td className="border-b border-zinc-200 px-3 py-1.5 text-right">
                      <span className="inline-flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setForm({ itemNo: r.itemNo ?? "", name: r.name, code: r.code ?? "", section: r.section });
                            setFormError(null);
                            setDialog({ kind: "edit", key: r.key });
                          }}
                          aria-label={`Edit ${r.name}`}
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-50"
                        >
                          <Pencil size={12} aria-hidden /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const parts = r.key.split("::");
                            void adminSetPublicationActive(lang, {
                              itemNo: r.itemNo,
                              name: parts.slice(2).join("::") || r.name,
                              section: r.section,
                            }, !r.active).then(() => void refresh());
                          }}
                          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-50"
                        >
                          {r.active ? "Archive" : "Restore"}
                        </button>
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !loadError && visible.length > 0 && (
        <Pagination
          total={visible.length}
          page={currentPage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      )}
    </div>
  );
}
