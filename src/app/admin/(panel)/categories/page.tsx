"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/admin-api";
import { Badge, Button, ConfirmDialog, EmptyRow, ErrorNote, Field, Input, Modal, Panel, Select, Spinner, Textarea, Toggle, notify } from "@/components/admin/ui";
import MediaPicker, { type MediaItem } from "@/components/admin/MediaPicker";

type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  color: string | null;
  orderIndex: number;
  showOnHomepage: boolean;
  isActive: boolean;
  articleCount: number;
};

const blank = { name: "", slug: "", description: "", imageUrl: "", color: "#D81F2A", showOnHomepage: true, isActive: true, orderIndex: 0 };

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: Category[] }>("/api/categories");
      setItems(data.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...blank, orderIndex: items.length });
    setModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      imageUrl: category.imageUrl || "",
      color: category.color || "#D81F2A",
      showOnHomepage: category.showOnHomepage,
      isActive: category.isActive,
      orderIndex: category.orderIndex,
    });
    setModalOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug || undefined,
        description: form.description,
        imageUrl: form.imageUrl,
        color: form.color,
        showOnHomepage: form.showOnHomepage,
        isActive: form.isActive,
        orderIndex: Number(form.orderIndex) || 0,
      };
      if (editing) {
        await api(`/api/categories/${editing.id}`, { method: "PATCH", json: payload });
        notify("Category updated", "success");
      } else {
        await api("/api/categories", { method: "POST", json: payload });
        notify("Category created", "success");
      }
      setModalOpen(false);
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not save the category", "error");
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row!);
    setItems(next);
    try {
      await Promise.all(next.map((c, i) => api(`/api/categories/${c.id}`, { method: "PATCH", json: { orderIndex: i } })));
      notify("Section order updated", "success");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not reorder", "error");
      load();
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    setDeleteError(null);
    try {
      const url = reassignTo ? `/api/categories/${pendingDelete.id}?reassignTo=${reassignTo}` : `/api/categories/${pendingDelete.id}`;
      const data = await api<{ ok?: boolean; blocked?: boolean; message?: string }>(url, { method: "DELETE" });
      if (data.blocked) {
        setDeleteError(data.message || "This category still contains articles.");
        return;
      }
      notify("Category deleted", "success");
      setPendingDelete(null);
      setReassignTo("");
      load();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete the category");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Categories</h2>
          <p className="mt-1 text-sm text-slate-500">Sections power the navigation, category pages and homepage blocks.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New category
        </Button>
      </div>

      {error ? <ErrorNote message={error} onRetry={load} /> : null}

      <Panel>
        {loading ? (
          <Spinner label="Loading categories…" />
        ) : items.length === 0 ? (
          <EmptyRow title="No categories yet" hint="Create Pakistan, World, Politics, Business, Technology, Sports and Entertainment." action={<Button size="sm" onClick={openCreate}>New category</Button>} />
        ) : (
          <div className="overflow-x-auto admin-scroll">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[0.65rem] uppercase tracking-[0.1em] text-slate-400">
                  <th className="py-2 pr-3 font-semibold">Order</th>
                  <th className="py-2 pr-3 font-semibold">Section</th>
                  <th className="py-2 pr-3 font-semibold">Slug</th>
                  <th className="py-2 pr-3 font-semibold">Articles</th>
                  <th className="py-2 pr-3 font-semibold">Visibility</th>
                  <th className="py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((category, index) => (
                  <tr key={category.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-3">
                      <div className="flex gap-1">
                        <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)} className="grid h-7 w-7 place-items-center border border-slate-300 text-slate-500 disabled:opacity-40">
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" aria-label="Move down" disabled={index === items.length - 1} onClick={() => move(index, 1)} className="grid h-7 w-7 place-items-center border border-slate-300 text-slate-500 disabled:opacity-40">
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2.5">
                        <span className="h-6 w-6 shrink-0" style={{ background: category.color || "#D81F2A" }} />
                        <span>
                          <span className="block font-medium text-slate-800">{category.name}</span>
                          <span className="block max-w-[280px] truncate text-xs text-slate-400">{category.description || "No description"}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-3 font-mono text-xs text-slate-500">/category/{category.slug}</td>
                    <td className="py-3 pr-3 text-slate-600">{category.articleCount}</td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={category.isActive ? "green" : "slate"}>{category.isActive ? "active" : "hidden"}</Badge>
                        {category.showOnHomepage ? <Badge tone="blue">homepage</Badge> : null}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" aria-label="Edit" onClick={() => openEdit(category)} className="grid h-8 w-8 place-items-center border border-slate-300 text-slate-500 hover:border-[#0b1b33]">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete"
                          onClick={() => {
                            setPendingDelete(category);
                            setReassignTo("");
                            setDeleteError(null);
                          }}
                          className="grid h-8 w-8 place-items-center border border-slate-300 text-slate-500 hover:border-red-600 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit category" : "New category"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={save} loading={busy}>
              {editing ? "Save changes" : "Create category"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || "" }))} placeholder="Pakistan" />
            </Field>
            <Field label="Slug" hint="Leave blank to generate from the name.">
              <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="pakistan" />
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Shown at the top of the category page." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Accent colour">
              <div className="flex gap-2">
                <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="h-10 w-14 border border-slate-300 bg-white p-1" />
                <Input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
              </div>
            </Field>
            <Field label="Display order">
              <Input type="number" min={0} value={form.orderIndex} onChange={(e) => setForm((f) => ({ ...f, orderIndex: Number(e.target.value) }))} />
            </Field>
          </div>
          <Field label="Section image URL">
            <div className="flex gap-2">
              <Input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://… or /api/media/file/…" />
              <Button variant="outline" onClick={() => setPickerOpen(true)}>
                Browse
              </Button>
            </div>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle checked={form.showOnHomepage} onChange={(v) => setForm((f) => ({ ...f, showOnHomepage: v }))} label="Show on homepage" description="Eligible for a homepage section block." />
            <Toggle checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} label="Active" description="Inactive sections are hidden from navigation." />
          </div>
        </div>
      </Modal>

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose a section image" onSelect={(item: MediaItem) => setForm((f) => ({ ...f, imageUrl: item.url }))} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        busy={busy}
        title={`Delete “${pendingDelete?.name ?? ""}”?`}
        message={
          pendingDelete && pendingDelete.articleCount > 0
            ? `This section contains ${pendingDelete.articleCount} article(s). Choose where to move them before deleting.`
            : "This permanently removes the category."
        }
        confirmLabel="Delete category"
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      >
        {pendingDelete && pendingDelete.articleCount > 0 ? (
          <Field label="Reassign articles to">
            <Select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
              <option value="">— Select a category —</option>
              {items
                .filter((c) => c.id !== pendingDelete.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </Field>
        ) : null}
        {deleteError ? <p className="mt-3 text-xs font-medium text-red-600">{deleteError}</p> : null}
      </ConfirmDialog>
    </div>
  );
}
