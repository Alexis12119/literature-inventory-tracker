"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { CATALOG } from "@/src/lib/reports/template";
import { Badge, Button, EmptyState, Input, Select, StickyBar } from "@/src/components/ui/controls";

interface LocalPub {
  itemNo: string;
  name: string;
  code: string;
  section: string;
  archived: boolean;
}

interface CatalogOverride {
  itemNo: string;
  name: string;
  code: string;
  section: string;
}

type EditTarget =
  | { kind: "add" }
  | { kind: "local"; index: number }
  | { kind: "catalog"; key: string };

const BLANK_FORM = { itemNo: "", name: "", code: "", section: "Books" };

export default function PublicationsPage() {
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [local, setLocal] = useState<LocalPub[]>([]);
  const [archived, setArchived] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, CatalogOverride>>({});
  const [form, setForm] = useState(BLANK_FORM);
  const [dialog, setDialog] = useState<null | EditTarget>(null);

  const sections = useMemo(() => ["all", ...Array.from(new Set(CATALOG.map((r) => r.section)))], []);
  const q = search.trim().toLowerCase();

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDialog(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog]);

  const displayed = (r: { section: string; itemNo: string | null; name: string; code: string | null }) => {
    const key = `${r.section}:${r.itemNo ?? ""}:${r.name}`;
    return { key, ...(overrides[key] ?? { itemNo: r.itemNo ?? "", name: r.name, code: r.code ?? "", section: r.section }) };
  };

  const base = CATALOG.map(displayed).filter((r) => {
    if (section !== "all" && r.section !== section) return false;
    if (q && !`${r.itemNo} ${r.name} ${r.code}`.toLowerCase().includes(q)) return false;
    if (!showArchived && archived.has(r.key)) return false;
    return true;
  });

  const extras = local.filter((p) => {
    if (section !== "all" && p.section !== section) return false;
    if (q && !`${p.itemNo} ${p.name} ${p.code}`.toLowerCase().includes(q)) return false;
    if (!showArchived && p.archived) return false;
    return true;
  });

  const openAdd = () => {
    setForm({ ...BLANK_FORM, section: section === "all" ? "Books" : section });
    setDialog({ kind: "add" });
  };

  const openEditLocal = (index: number) => {
    const p = local[index];
    if (!p) return;
    setForm({ itemNo: p.itemNo, name: p.name, code: p.code, section: p.section });
    setDialog({ kind: "local", index });
  };

  const openEditCatalog = (key: string, current: CatalogOverride) => {
    setForm({ ...current });
    setDialog({ kind: "catalog", key });
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
      const index = dialog.index;
      setLocal((l) => l.map((p, j) => (j === index ? { ...p, ...form, name } : p)));
    } else if (dialog?.kind === "catalog") {
      const key = dialog.key;
      setOverrides((o) => ({ ...o, [key]: { ...form, name } }));
    } else {
      setLocal((l) => [...l, { ...form, name, archived: false }]);
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
          <Button className="ml-auto" onClick={openAdd}>
            <Plus size={15} aria-hidden /> Add publication
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 bg-white p-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            Search
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, item, code…" aria-label="Catalog search" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            Category
            <Select value={section} onChange={(e) => setSection(e.target.value)} aria-label="Category filter">
              {sections.map((s) => (
                <option key={s} value={s}>{s === "all" ? "All categories" : s}</option>
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
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">Category<Select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>{sections.filter((s) => s !== "all").map((s) => (<option key={s} value={s}>{s}</option>))}</Select></label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeDialog}>Cancel</Button>
              <Button type="submit">{isEditing ? "Save changes" : "Add to list"}</Button>
            </div>
          </form>
        </div>
      ) : null}

      {base.length + extras.length === 0 ? (
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
              {base.map((r) => {
                const isArch = archived.has(r.key);
                const edited = overrides[r.key] !== undefined;
                return (
                  <tr key={r.key} className="border-t border-zinc-200">
                    <td className="px-3 py-1.5 text-zinc-600">{r.itemNo || "—"}</td>
                    <td className="px-3 py-1.5 font-medium">
                      {r.name}
                      {r.code ? <span className="ml-1 text-xs text-zinc-400">{r.code}</span> : null}
                      {isArch ? <Badge tone="neutral" className="ml-2">archived</Badge> : null}
                      {edited ? <Badge tone="info" className="ml-2">edited</Badge> : null}
                    </td>
                    <td className="px-3 py-1.5 text-zinc-600">{r.section}</td>
                    <td className="px-3 py-1.5 text-right">
                      <span className="inline-flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditCatalog(r.key, { itemNo: r.itemNo, name: r.name, code: r.code, section: r.section })}
                          aria-label={`Edit ${r.name}`}
                          title={`Edit ${r.name}`}
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50"
                        >
                          <Pencil size={12} aria-hidden /> Edit
                        </button>
                        {edited ? (
                          <button
                            type="button"
                            onClick={() => setOverrides((o) => { const n = { ...o }; delete n[r.key]; return n; })}
                            title="Revert to the official catalog entry"
                            className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50"
                          >
                            Reset
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setArchived((s) => { const n = new Set(s); if (n.has(r.key)) n.delete(r.key); else n.add(r.key); return n; })}
                          className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50"
                        >
                          {isArch ? "Restore" : "Archive"}
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {extras.map((p) => {
                const index = local.indexOf(p);
                return (
                  <tr key={`local-${index}`} className="border-t border-dashed border-blue-300 bg-blue-50/40">
                    <td className="px-3 py-1.5 text-zinc-600">{p.itemNo || "—"}</td>
                    <td className="px-3 py-1.5 font-medium">{p.name}<Badge tone="info" className="ml-2">local</Badge></td>
                    <td className="px-3 py-1.5 text-zinc-600">{p.section}</td>
                    <td className="px-3 py-1.5 text-right">
                      <span className="inline-flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditLocal(index)}
                          aria-label={`Edit ${p.name}`}
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-50"
                        >
                          <Pencil size={12} aria-hidden /> Edit
                        </button>
                        <button type="button" onClick={() => setLocal((l) => l.filter((_, j) => j !== index))} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-50">Remove</button>
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
