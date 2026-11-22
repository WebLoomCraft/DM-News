"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/admin-api";
import { Button, ConfirmDialog, EmptyRow, ErrorNote, Field, Input, Panel, Spinner, notify } from "@/components/admin/ui";

type Tag = { id: number; name: string; slug: string; articleCount: number };

export default function TagsPage() {
  const [items, setItems] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: Tag[] }>("/api/tags", { query: { q: query } });
      setItems(data.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tags");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api("/api/tags", { method: "POST", json: { name } });
      setName("");
      notify("Tag created", "success");
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not create the tag", "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    try {
      await api(`/api/tags/${pendingDelete.id}`, { method: "DELETE" });
      notify("Tag deleted", "success");
      setPendingDelete(null);
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not delete the tag", "error");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900">Tags</h2>
        <p className="mt-1 text-sm text-slate-500">Topics are searchable on the public site at /tag/slug.</p>
      </div>

      <Panel title="Add a tag">
        <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Tag name" className="flex-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Climate" />
          </Field>
          <Button type="submit" loading={busy}>
            <Plus className="h-4 w-4" /> Create tag
          </Button>
        </form>
      </Panel>

      {error ? <ErrorNote message={error} onRetry={load} /> : null}

      <Panel>
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tags" className="pl-9" />
        </div>
        {loading ? (
          <Spinner label="Loading tags…" />
        ) : items.length === 0 ? (
          <EmptyRow title="No tags found" hint="Tags are also created automatically when you add them in the article editor." />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((tag) => (
              <li key={tag.id} className="flex items-center justify-between gap-2 border border-slate-200 bg-white px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800">#{tag.name}</span>
                  <span className="block text-[0.68rem] text-slate-400">
                    {tag.articleCount} article{tag.articleCount === 1 ? "" : "s"} · /tag/{tag.slug}
                  </span>
                </span>
                <button type="button" aria-label={`Delete ${tag.name}`} onClick={() => setPendingDelete(tag)} className="grid h-7 w-7 shrink-0 place-items-center text-slate-400 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete #${pendingDelete?.name ?? ""}?`}
        message="The tag will be removed from every article that uses it."
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
