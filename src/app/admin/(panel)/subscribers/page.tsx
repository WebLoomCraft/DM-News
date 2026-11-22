"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Mail, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/admin-api";
import { formatDate } from "@/lib/utils";
import { Badge, Button, ConfirmDialog, EmptyRow, ErrorNote, Input, Pagination, Panel, Spinner, notify } from "@/components/admin/ui";

type Subscriber = { id: number; email: string; status: string; source: string | null; consent: boolean; createdAt: string };

export default function SubscribersPage() {
  const [items, setItems] = useState<Subscriber[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Subscriber | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: Subscriber[]; pagination: { page: number; totalPages: number; total: number } }>("/api/newsletter", {
        query: { q: query, page, perPage: 25 },
      });
      setItems(data.items);
      setPagination(data.pagination);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load subscribers");
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = async () => {
    try {
      const all: Subscriber[] = [];
      let currentPage = 1;
      let totalPages = 1;
      do {
        const data = await api<{ items: Subscriber[]; pagination: { totalPages: number } }>("/api/newsletter", {
          query: { page: currentPage, perPage: 100 },
        });
        all.push(...data.items);
        totalPages = data.pagination.totalPages;
        currentPage += 1;
      } while (currentPage <= totalPages);

      const csv = ["email,status,consent,subscribed_at", ...all.map((s) => `${s.email},${s.status},${s.consent},${s.createdAt}`)].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dm-news-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      notify(`Exported ${all.length} subscribers`, "success");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Export failed", "error");
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    try {
      await api(`/api/newsletter/${pendingDelete.id}`, { method: "DELETE" });
      notify("Subscriber removed", "success");
      setPendingDelete(null);
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not remove the subscriber", "error");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Newsletter subscribers</h2>
          <p className="mt-1 text-sm text-slate-500">{pagination.total} people subscribed with consent from the public website.</p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Panel>
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search by email address" className="pl-9" />
        </div>
      </Panel>

      {error ? <ErrorNote message={error} onRetry={load} /> : null}

      <Panel>
        {loading ? (
          <Spinner label="Loading subscribers…" />
        ) : items.length === 0 ? (
          <EmptyRow title="No subscribers yet" hint="The newsletter form appears in the footer and on the homepage when enabled in Settings." />
        ) : (
          <div className="overflow-x-auto admin-scroll">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[0.65rem] uppercase tracking-[0.1em] text-slate-400">
                  <th className="py-2 pr-3 font-semibold">Email</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">Consent</th>
                  <th className="py-2 pr-3 font-semibold">Source</th>
                  <th className="py-2 pr-3 font-semibold">Subscribed</th>
                  <th className="py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((sub) => (
                  <tr key={sub.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2 font-medium text-slate-800">
                        <Mail className="h-3.5 w-3.5 text-slate-300" /> {sub.email}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={sub.status === "subscribed" ? "green" : "slate"}>{sub.status}</Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-500">{sub.consent ? "Yes" : "No"}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{sub.source || "website"}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{formatDate(sub.createdAt, { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="py-2.5 text-right">
                      <button type="button" aria-label="Remove subscriber" onClick={() => setPendingDelete(sub)} className="grid h-7 w-7 place-items-center text-slate-400 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
      </Panel>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Remove subscriber?"
        message={`${pendingDelete?.email ?? ""} will no longer receive the briefing.`}
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
