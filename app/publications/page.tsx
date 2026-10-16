"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Tags, X } from "lucide-react";
import { SECTIONS } from "@/src/lib/reports/template";
import { Badge, Button, EmptyState, Input, Select, StickyBar } from "@/src/components/ui/controls";
import { sectionCounts, useCatalog } from "@/src/features/catalog/store";

type EditTarget =
  | { kind: "add" }
  | { kind: "local"; index: number }
  | { kind: "catalog"; key: string };

const BLANK_FORM = { itemNo: "", name: "", code: "", section: "Books" };

export default function PublicationsPage() {
  const catalog = useCatalog();
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [dialog, setDialog] = useState<null | EditTarget>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [newSection, setNewSection] = useState("");
  const [catError, setCatError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const q = search.trim().toLowerCase();

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

  const visible = useMemo(
    () =>
      catalog.rows.filter((r) => {
        if (section !== "all" && r.section !== section) return false;
        if (q && !`${r.itemNo ?? ""} ${r.name} ${r.code ?? ""}`.toLowerCase().includes(q)) return false;
        if (!showArchived && catalog.archivedKeys.has(r.key)) return false;
        return true;
      }),
    [catalog.rows, catalog.archivedKeys, section, q, showArchived],
  );

  const counts = useMemo(() => sectionCounts(catalog.rows), [catalog.rows]);
  const sectionRows = useMemo(() => {
    const raws: string[] = [...SECTIONS];
    for (const c of catalog.customs) {
      if (!raws.some((s) => s.toLowerCase() === c.toLowerCase())) raws.push(c);
    }
    return raws.map((raw) => {
      const isCustom = !SECTIONS.some((s) => s.toLowerCase() === raw.toLowerCase());
      const display = isCustom ? raw : (catalog.renames[raw] ?? raw);
      const hidden = catalog.hidden.some((h) => h.toLowerCase() === raw.toLowerCase());
      return { raw, display, isCustom, hidden, count: counts[display] ?? 0 };
    });
  }, [catalog.customs, catalog.renames, catalog.hidden, counts]);

  const openAdd = () => {
    setForm({ ...BLANK_FORM, section: section === "all" ? "Books" : section });
    setDialog({ kind: "add" });
  };

  const closeDialog = () => {
    setDialog(null);
    setForm(BLANK_FORM);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    if (dialog?.kind === "local") {
      catalog.updateLocal(dialog.index, { ...form, name });
    } else if (dialog?.kind === "catalog") {
      catalog.saveOverride(dialog.key, { ...form, name });
    } else {
      catalog.addLocal({ ...form, name });
    }
    closeDialog();
  };

  const isEditing = dialog !== null && dialog.kind !== "add";

  return (
    <div className="flex flex-col gap-3">
      <StickyBar className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight">Publications</h1>
          <Badge tone="neutral">Frontend preview · catalog edits stay local</Badge>
          <span className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={() => { setCatError(null); setCatOpen(true); }}>
              <Tags size={15} aria-hidden /> Categories
            </Button>
            <Button onClick={openAdd}>
              <Plus size={15} aria-hidden /> Add publication
            </Button>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 bg-white p-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            Search
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, item, code…" aria-label="Catalog search" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            Category
            <Select value={section} onChange={(e) => setSection(e.target.value)} aria-label="Category filter">
              <option value="all">All categories</option>
              {catalog.sections.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-zinc-700">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="h-4 w-4 accent-blue-700" />
            Show archived
          </label>
        </div>
      </StickyBar>

      {dialog ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={isEditing ? "Edit publication" : "Add publication"}
          onClick={closeDialog}
        >
          <form
            className="flex max-h-[85vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-lg bg-white p-4"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold">{isEditing ? "Edit publication" : "Add publication"}</h2>
              <span className="text-xs text-zinc-500">local only</span>
              <button
                type="button"
                onClick={closeDialog}
                aria-label={isEditing ? "Close edit publication dialog" : "Close add publication dialog"}
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
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">Category<Select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>{catalog.sections.map((s) => (<option key={s} value={s}>{s}</option>))}</Select></label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeDialog}>Cancel</Button>
              <Button type="submit">{isEditing ? "Save changes" : "Add to list"}</Button>
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
              <h2 className="text-base font-bold">Categories</h2>
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
              Hiding keeps every quantity (restore anytime). Deleting is only for empty custom
              categories. Renames apply everywhere except the official report, which keeps the
              original wording.
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const err = catalog.addSection(newSection);
                setCatError(err);
                if (!err) setNewSection("");
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
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                {catError}
              </p>
            )}
            <ul className="flex flex-col gap-1.5">
              {sectionRows.map((s) => (
                <li key={s.raw} className="rounded-lg border border-zinc-200 px-3 py-2">
                  {renaming === s.raw ? (
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const err = catalog.renameSection(s.raw, renameValue);
                        setCatError(err);
                        if (!err) setRenaming(null);
                      }}
                    >
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        aria-label={`Rename ${s.display}`}
                        autoFocus
                        className="h-8 flex-1"
                      />
                      <Button type="submit" className="h-8">Save</Button>
                      <Button type="button" variant="secondary" className="h-8" onClick={() => setRenaming(null)}>
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {s.display}
                        {s.display !== s.raw && <span className="ml-1 text-xs font-normal text-zinc-400">was {s.raw}</span>}
                      </span>
                      <span className="text-xs text-zinc-500 tabular-nums">{s.count} items</span>
                      {s.hidden && <Badge tone="neutral">hidden</Badge>}
                      {s.isCustom && <Badge tone="info">custom</Badge>}
                      <span className="ml-auto inline-flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => { setRenaming(s.raw); setRenameValue(s.display); setCatError(null); }}
                          className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50"
                        >
                          Rename
                        </button>
                        {s.hidden ? (
                          <button
                            type="button"
                            onClick={() => catalog.restoreSection(s.raw)}
                            className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50"
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => catalog.hideSection(s.raw)}
                            className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50"
                          >
                            Hide
                          </button>
                        )}
                        {s.isCustom && (
                          <button
                            type="button"
                            onClick={() => setCatError(catalog.deleteSection(s.raw))}
                            className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        )}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState title="No publications found" hint="Adjust the search or category filter." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full min-w-xl border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-900 text-left text-white">
                <th scope="col" className="px-3 py-2 text-xs font-semibold">Item No.</th>
                <th scope="col" className="px-3 py-2 text-xs font-semibold">Name</th>
                <th scope="col" className="px-3 py-2 text-xs font-semibold">Category</th>
                <th scope="col" className="px-3 py-2 text-xs font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const isArch = catalog.archivedKeys.has(r.key);
                const edited = catalog.overrides[r.key] !== undefined;
                const isLocal = r.key.startsWith("local::");
                return (
                  <tr key={r.key} className={`border-t border-zinc-200 ${isLocal ? "border-dashed border-blue-300 bg-blue-50/40" : ""}`}>
                    <td className="px-3 py-1.5 text-zinc-600">{r.itemNo || "—"}</td>
                    <td className="px-3 py-1.5 font-medium">
                      {r.name}
                      {r.code ? <span className="ml-1 text-xs text-zinc-400">{r.code}</span> : null}
                      {isArch ? <Badge tone="neutral" className="ml-2">archived</Badge> : null}
                      {edited ? <Badge tone="info" className="ml-2">edited</Badge> : null}
                      {isLocal ? <Badge tone="info" className="ml-2">local</Badge> : null}
                    </td>
                    <td className="px-3 py-1.5 text-zinc-600">{r.section}</td>
                    <td className="px-3 py-1.5 text-right">
                      <span className="inline-flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (isLocal) {
                              const index = catalog.local.findIndex(
                                (p) => `local::${p.itemNo}::${p.name}` === r.key,
                              );
                              const p = catalog.local[index];
                              if (p) {
                                setForm({ itemNo: p.itemNo, name: p.name, code: p.code, section: p.section });
                                setDialog({ kind: "local", index });
                              }
                            } else {
                              setForm({ itemNo: r.itemNo ?? "", name: r.name, code: r.code ?? "", section: r.section });
                              setDialog({ kind: "catalog", key: r.key });
                            }
                          }}
                          aria-label={`Edit ${r.name}`}
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-50"
                        >
                          <Pencil size={12} aria-hidden /> Edit
                        </button>
                        {edited ? (
                          <button
                            type="button"
                            onClick={() => catalog.resetOverride(r.key)}
                            title="Revert to the official catalog entry"
                            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-50"
                          >
                            Reset
                          </button>
                        ) : null}
                        {isLocal ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const index = catalog.local.findIndex(
                                  (p) => `local::${p.itemNo}::${p.name}` === r.key,
                                );
                                if (index >= 0) catalog.toggleLocalArchived(index);
                              }}
                              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-50"
                            >
                              {isArch ? "Restore" : "Archive"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const index = catalog.local.findIndex(
                                  (p) => `local::${p.itemNo}::${p.name}` === r.key,
                                );
                                if (index >= 0) catalog.removeLocal(index);
                              }}
                              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-50"
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => catalog.toggleArchive(r.key)}
                            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-50"
                          >
                            {isArch ? "Restore" : "Archive"}
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
