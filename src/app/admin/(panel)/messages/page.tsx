"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Eye, Trash2 } from "lucide-react";
import { api } from "@/lib/admin-api";
import { formatDateTime } from "@/lib/utils";
import { Badge, Button, ConfirmDialog, EmptyRow, ErrorNote, Modal, Pagination, Panel, Spinner, notify } from "@/components/admin/ui";

type Message = { id: number; name: string; email: string; subject: string | null; message: string; isRead: boolean; createdAt: string };

export default function MessagesPage() {
  const [items, setItems] = useState<Message[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [openMessage, setOpenMessage] = useState<Message | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Message | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: Message[]; pagination: { page: number; totalPages: number; total: number }; unread: number }>("/api/contact", {
        query: { page, perPage: 20, unread: onlyUnread ? "1" : undefined },
      });
      setItems(data.items);
      setPagination(data.pagination);
      setUnread(data.unread);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load messages");
    } finally {
      setLoading(false);
    }
  }, [page, onlyUnread]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (message: Message, isRead: boolean) => {
    try {
      await api(`/api/contact/${message.id}`, { method: "PATCH", json: { isRead } });
      setItems((prev) => prev.map((m) => (m.id === message.id ? { ...m, isRead } : m)));
      setOpenMessage((m) => (m && m.id === message.id ? { ...m, isRead } : m));
      notify(isRead ? "Marked as read" : "Marked as unread", "info");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not update the message", "error");
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    try {
      await api(`/api/contact/${pendingDelete.id}`, { method: "DELETE" });
      notify("Message deleted", "success");
      setPendingDelete(null);
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not delete the message", "error");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Contact messages</h2>
          <p className="mt-1 text-sm text-slate-500">{pagination.total} messages · {unread} unread</p>
        </div>
        <Button variant={onlyUnread ? "primary" : "outline"} onClick={() => { setOnlyUnread((v) => !v); setPage(1); }}>
          {onlyUnread ? "Showing unread" : "Show unread only"}
        </Button>
      </div>

      {error ? <ErrorNote message={error} onRetry={load} /> : null}

      <Panel>
        {loading ? (
          <Spinner label="Loading messages…" />
        ) : items.length === 0 ? (
          <EmptyRow title="No messages" hint="Messages sent from the public contact page land here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((message) => (
              <li key={message.id} className="flex flex-wrap items-start gap-3 py-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${message.isRead ? "bg-slate-300" : "bg-[var(--accent)]"}`} />
                <button type="button" onClick={() => { setOpenMessage(message); if (!message.isRead) markRead(message, true); }} className="min-w-0 flex-1 text-left">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm ${message.isRead ? "text-slate-600" : "font-semibold text-slate-900"}`}>{message.subject || "(no subject)"}</span>
                    {!message.isRead ? <Badge tone="red">new</Badge> : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {message.name} · {message.email} · {formatDateTime(message.createdAt)}
                  </span>
                  <span className="mt-1 line-clamp-1 block text-xs text-slate-500">{message.message}</span>
                </button>
                <span className="flex shrink-0 gap-1">
                  <Button size="sm" variant="outline" onClick={() => markRead(message, !message.isRead)}>
                    <Check className="h-3 w-3" /> {message.isRead ? "Unread" : "Read"}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setPendingDelete(message)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
      </Panel>

      <Modal open={Boolean(openMessage)} onClose={() => setOpenMessage(null)} title="Message" size="md">
        {openMessage ? (
          <div className="space-y-3">
            <div className="grid gap-1 text-sm">
              <p className="font-semibold text-slate-800">{openMessage.subject || "(no subject)"}</p>
              <p className="text-xs text-slate-500">
                From {openMessage.name} · <a className="text-[var(--accent)] underline" href={`mailto:${openMessage.email}`}>{openMessage.email}</a>
              </p>
              <p className="text-xs text-slate-400">{formatDateTime(openMessage.createdAt)}</p>
            </div>
            <p className="whitespace-pre-wrap border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">{openMessage.message}</p>
            <div className="flex gap-2">
              <a href={`mailto:${openMessage.email}?subject=Re: ${encodeURIComponent(openMessage.subject || "")}`}>
                <Button size="sm">Reply by email</Button>
              </a>
              <Button size="sm" variant="outline" onClick={() => markRead(openMessage, !openMessage.isRead)}>
                <Eye className="h-3.5 w-3.5" /> Mark {openMessage.isRead ? "unread" : "read"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog open={Boolean(pendingDelete)} title="Delete this message?" message="The message will be permanently removed." onConfirm={remove} onCancel={() => setPendingDelete(null)} />
    </div>
  );
}
