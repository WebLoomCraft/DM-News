"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/admin-api";
import { formatDateTime, timeAgo } from "@/lib/utils";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyRow,
  ErrorNote,
  Input,
  Pagination,
  Panel,
  Select,
  Spinner,
  notify,
  statusTone,
} from "@/components/admin/ui";

type ArticleRow = {
  id: number;
  title: string;
  slug: string;
  status: string;
  views: number;
  isBreaking: boolean;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  featuredImageUrl: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  authorName: string | null;
  tagList: string;
};

type Category = { id: number; name: string; slug: string };
type Author = { id: number; name: string; slug: string };

function ArticlesTable() {
  const params = useSearchParams();
  const [items, setItems] = useState<ArticleRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [filters, setFilters] = useState({
    q: "",
    status: params.get("status") || "all",
    categoryId: "all",
    authorId: "all",
    sort: "recent",
    page: 1,
  });
  const [pendingDelete, setPendingDelete] = useState<ArticleRow | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: ArticleRow[]; pagination: { page: number; totalPages: number; total: number } }>("/api/articles", {
        query: { ...filters, perPage: 15 },
      });
      setItems(data.items);
      setPagination(data.pagination);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load articles");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const [catRes, authorRes] = await Promise.all([
          api<{ items: Category[] }>("/api/categories"),
          api<{ items: Author[] }>("/api/authors"),
        ]);
        setCategories(catRes.items);
        setAuthors(authorRes.items);
      } catch {
        /* filters remain usable without reference data */
      }
    })();
  }, []);

  const changeStatus = async (row: ArticleRow, status: string) => {
    setBusyId(row.id);
    try {
      await api(`/api/articles/${row.id}`, { method: "PATCH", json: { status } });
      notify(status === "published" ? "Article is now live" : `Moved to ${status}`, "success");
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not change status", "error");
    } finally {
      setBusyId(null);
    }
  };

  const toggleFlag = async (row: ArticleRow, field: "isBreaking" | "isFeatured") => {
    setBusyId(row.id);
    try {
      await api(`/api/articles/${row.id}`, { method: "PATCH", json: { [field]: !row[field] } });
      notify(field === "isBreaking" ? "Breaking news flag updated" : "Featured flag updated", "success");
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not update the article", "error");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    try {
      await api(`/api/articles/${pendingDelete.id}`, { method: "DELETE" });
      notify("Article deleted", "success");
      setPendingDelete(null);
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not delete the article", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Articles</h2>
          <p className="mt-1 text-sm text-slate-500">{pagination.total} records · search, filter and manage every story.</p>
        </div>
        <Link href="/admin/articles/new">
          <Button>
            <Plus className="h-4 w-4" /> New article
          </Button>
        </Link>
      </div>

      <Panel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") load();
              }}
              placeholder="Search headlines and summaries…"
              className="pl-9"
            />
          </div>
          <Select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}>
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="archived">Archived</option>
          </Select>
          <Select value={filters.categoryId} onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value, page: 1 }))}>
            <option value="all">All sections</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value, page: 1 }))}>
            <option value="recent">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="views">Most viewed</option>
            <option value="title">Title A–Z</option>
          </Select>
        </div>
        <div className="mt-3">
          <Select value={filters.authorId} onChange={(e) => setFilters((f) => ({ ...f, authorId: e.target.value, page: 1 }))} className="sm:max-w-xs">
            <option value="all">All authors</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
      </Panel>

      {error ? <ErrorNote message={error} onRetry={load} /> : null}

      <Panel>
        {loading ? (
          <Spinner label="Loading articles…" />
        ) : items.length === 0 ? (
          <EmptyRow
            title="No articles match these filters"
            hint="Adjust the filters or create a new story."
            action={
              <Link href="/admin/articles/new">
                <Button size="sm">New article</Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto admin-scroll">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[0.65rem] uppercase tracking-[0.1em] text-slate-400">
                  <th className="py-2 pr-3 font-semibold">Story</th>
                  <th className="py-2 pr-3 font-semibold">Section</th>
                  <th className="py-2 pr-3 font-semibold">Author</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">Flags</th>
                  <th className="py-2 pr-3 font-semibold">Views</th>
                  <th className="py-2 pr-3 font-semibold">Updated</th>
                  <th className="py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 align-top last:border-0 hover:bg-slate-50/60">
                    <td className="max-w-[320px] py-3 pr-3">
                      <div className="flex gap-3">
                        <span className="h-12 w-16 shrink-0 overflow-hidden bg-slate-100">
                          {row.featuredImageUrl ? (
                            <img src={row.featuredImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                          ) : null}
                        </span>
                        <span className="min-w-0">
                          <Link href={`/admin/articles/${row.id}`} className="line-clamp-2 block font-medium text-slate-800 hover:text-[var(--accent)]">
                            {row.title}
                          </Link>
                          <span className="mt-0.5 block truncate text-[0.68rem] text-slate-400">/news/{row.slug}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-slate-500">{row.categoryName || "—"}</td>
                    <td className="py-3 pr-3 text-slate-500">{row.authorName || "—"}</td>
                    <td className="py-3 pr-3">
                      <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                      {row.status === "scheduled" && row.publishedAt ? (
                        <span className="mt-1 block text-[0.65rem] text-slate-400">{formatDateTime(row.publishedAt)}</span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap gap-1">
                        <button type="button" onClick={() => toggleFlag(row, "isBreaking")} className="transition-opacity hover:opacity-70" title="Toggle breaking news">
                          <Badge tone={row.isBreaking ? "red" : "slate"}>breaking</Badge>
                        </button>
                        <button type="button" onClick={() => toggleFlag(row, "isFeatured")} className="transition-opacity hover:opacity-70" title="Toggle featured story">
                          <Badge tone={row.isFeatured ? "purple" : "slate"}>featured</Badge>
                        </button>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-slate-500">{row.views.toLocaleString()}</td>
                    <td className="py-3 pr-3 text-slate-500" title={formatDateTime(row.updatedAt)}>
                      {timeAgo(row.updatedAt)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {row.status !== "published" ? (
                          <Button size="sm" variant="outline" disabled={busyId === row.id} onClick={() => changeStatus(row, "published")}>
                            Publish
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled={busyId === row.id} onClick={() => changeStatus(row, "archived")}>
                            Unpublish
                          </Button>
                        )}
                        <Link href={`/news/${row.slug}`} target="_blank" aria-label="Preview on site" className="grid h-8 w-8 place-items-center border border-slate-300 text-slate-500 hover:border-[#0b1b33] hover:text-[#0b1b33]">
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <Link href={`/admin/articles/${row.id}`} aria-label="Edit article" className="grid h-8 w-8 place-items-center border border-slate-300 text-slate-500 hover:border-[#0b1b33] hover:text-[#0b1b33]">
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button type="button" aria-label="Delete article" onClick={() => setPendingDelete(row)} className="grid h-8 w-8 place-items-center border border-slate-300 text-slate-500 hover:border-red-600 hover:text-red-600">
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
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
      </Panel>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        busy={busyId === pendingDelete?.id}
        title="Delete this article?"
        message={`“${pendingDelete?.title ?? ""}” will be permanently removed along with its URL.`}
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

export default function ArticlesPage() {
  return (
    <Suspense fallback={<Spinner label="Loading articles…" />}>
      <ArticlesTable />
    </Suspense>
  );
}
