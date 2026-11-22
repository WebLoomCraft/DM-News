"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/admin-api";
import { Button, ConfirmDialog, EmptyRow, ErrorNote, Field, Input, Modal, Panel, Spinner, Textarea, notify } from "@/components/admin/ui";
import MediaPicker, { type MediaItem } from "@/components/admin/MediaPicker";

type Author = {
  id: number;
  name: string;
  slug: string;
  photoUrl: string | null;
  bio: string | null;
  email: string | null;
  designation: string | null;
  facebookUrl: string | null;
  xUrl: string | null;
  articleCount: number;
};

const blank = { name: "", slug: "", photoUrl: "", bio: "", email: "", designation: "", facebookUrl: "", xUrl: "" };

export default function AuthorsPage() {
  const [items, setItems] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Author | null>(null);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Author | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: Author[] }>("/api/authors");
      setItems(data.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load authors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (author: Author) => {
    setEditing(author);
    setForm({
      name: author.name,
      slug: author.slug,
      photoUrl: author.photoUrl || "",
      bio: author.bio || "",
      email: author.email || "",
      designation: author.designation || "",
      facebookUrl: author.facebookUrl || "",
      xUrl: author.xUrl || "",
    });
    setModalOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      if (editing) {
        await api(`/api/authors/${editing.id}`, { method: "PATCH", json: form });
        notify("Author updated", "success");
      } else {
        await api("/api/authors", { method: "POST", json: form });
        notify("Author created", "success");
      }
      setModalOpen(false);
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not save the author", "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    try {
      await api(`/api/authors/${pendingDelete.id}`, { method: "DELETE" });
      notify("Author removed", "success");
      setPendingDelete(null);
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not remove the author", "error");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Authors &amp; desks</h2>
          <p className="mt-1 text-sm text-slate-500">Bylines shown on articles and public author pages.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setForm(blank);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New author
        </Button>
      </div>

      {error ? <ErrorNote message={error} onRetry={load} /> : null}

      <Panel>
        {loading ? (
          <Spinner label="Loading authors…" />
        ) : items.length === 0 ? (
          <EmptyRow title="No authors yet" hint="Create desk profiles such as “DM News Desk” or individual bylines." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((author) => (
              <li key={author.id} className="flex gap-3 border border-slate-200 bg-white p-3">
                {author.photoUrl ? (
                  <img src={author.photoUrl} alt={author.name} className="h-14 w-14 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#0b1b33] font-cond text-sm text-white">DM</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{author.name}</p>
                  <p className="truncate text-[0.7rem] uppercase tracking-[0.08em] text-slate-400">{author.designation || "Reporter"}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{author.bio || "No biography added."}</p>
                  <p className="mt-1 text-[0.68rem] text-slate-400">{author.articleCount} articles · /author/{author.slug}</p>
                  <div className="mt-2 flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(author)}>
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setPendingDelete(author)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit author" : "New author"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={save} loading={busy}>
              {editing ? "Save changes" : "Create author"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="DM News Desk" />
            </Field>
            <Field label="Designation">
              <Input value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} placeholder="National Desk" />
            </Field>
          </div>
          <Field label="Slug" hint="Used for the public author page.">
            <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="dm-news-desk" />
          </Field>
          <Field label="Photo">
            <div className="flex gap-2">
              <Input value={form.photoUrl} onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))} placeholder="/api/media/file/… or https://…" />
              <Button variant="outline" onClick={() => setPickerOpen(true)}>
                Browse
              </Button>
            </div>
          </Field>
          <Field label="Biography">
            <Textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Short biography shown under articles." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email (internal)">
              <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="desk@dmnewsnetwork.com" />
            </Field>
            <Field label="Facebook profile">
              <Input value={form.facebookUrl} onChange={(e) => setForm((f) => ({ ...f, facebookUrl: e.target.value }))} />
            </Field>
          </div>
          <Field label="X / Twitter profile">
            <Input value={form.xUrl} onChange={(e) => setForm((f) => ({ ...f, xUrl: e.target.value }))} />
          </Field>
        </div>
      </Modal>

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose author photo" onSelect={(item: MediaItem) => setForm((f) => ({ ...f, photoUrl: item.url }))} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Remove “${pendingDelete?.name ?? ""}”?`}
        message="Articles by this author stay published but lose their byline."
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
