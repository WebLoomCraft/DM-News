"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Search, Trash2, Upload } from "lucide-react";
import { api, uploadFile } from "@/lib/admin-api";
import { formatBytes, formatDate } from "@/lib/utils";
import { Button, ConfirmDialog, EmptyRow, ErrorNote, Field, Input, Modal, Pagination, Panel, Spinner, notify } from "@/components/admin/ui";
import type { MediaItem } from "@/components/admin/MediaPicker";

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [altDraft, setAltDraft] = useState("");
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: MediaItem[]; pagination: { page: number; totalPages: number; total: number } }>("/api/media", {
        query: { q: query, page, perPage: 24 },
      });
      setItems(data.items);
      setPagination(data.pagination);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the media library");
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      let okCount = 0;
      for (const file of Array.from(files).slice(0, 10)) {
        await uploadFile(file);
        okCount += 1;
      }
      notify(`${okCount} file${okCount > 1 ? "s" : ""} uploaded to the library`, "success");
      setPage(1);
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveAlt = async () => {
    if (!editing) return;
    try {
      const data = await api<{ item: MediaItem }>(`/api/media/${editing.id}`, { method: "PATCH", json: { alt: altDraft } });
      setItems((prev) => prev.map((m) => (m.id === data.item.id ? data.item : m)));
      setEditing(null);
      notify("Alt text saved", "success");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not save alt text", "error");
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    try {
      await api(`/api/media/${pendingDelete.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((m) => m.id !== pendingDelete.id));
      notify("Media file deleted", "success");
      setPendingDelete(null);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not delete the file", "error");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Media library</h2>
          <p className="mt-1 text-sm text-slate-500">{pagination.total} files · images up to 8MB, short clips up to 48MB.</p>
        </div>
        <input ref={fileRef} type="file" multiple accept="image/*,video/mp4,video/webm" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <Button onClick={() => fileRef.current?.click()} loading={uploading}>
          <Upload className="h-4 w-4" /> Upload files
        </Button>
      </div>

      <Panel>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center border-2 border-dashed px-6 py-8 text-center transition-colors ${
            dragging ? "border-[var(--accent)] bg-red-50/40" : "border-slate-300 bg-slate-50"
          }`}
        >
          <ImagePlus className="h-6 w-6 text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-slate-700">Drag &amp; drop files here</p>
          <p className="mt-1 text-xs text-slate-500">JPG, PNG, WebP, GIF, AVIF · MP4 and WebM clips · prefer YouTube embeds for long video</p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by filename or alt text" className="pl-9" />
          </div>
          <Button variant="outline" onClick={() => setPage(1)}>
            Search
          </Button>
        </div>
      </Panel>

      {error ? <ErrorNote message={error} onRetry={load} /> : null}

      {loading ? (
        <Spinner label="Loading media…" />
      ) : items.length === 0 ? (
        <EmptyRow title="No media files yet" hint="Upload your first image — it becomes available to every article instantly." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {items.map((item) => (
            <div key={item.id} className="group border border-slate-200 bg-white">
              <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                {item.mimeType.startsWith("video") ? (
                  <video src={item.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                ) : (
                  <img src={item.url} alt={item.alt || item.originalName} loading="lazy" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="p-2.5">
                <p className="truncate text-xs font-medium text-slate-700">{item.originalName}</p>
                <p className="mt-0.5 text-[0.65rem] text-slate-400">
                  {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
                  {formatBytes(item.sizeBytes)} · {formatDate(item.createdAt, { day: "numeric", month: "short" })}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(item);
                      setAltDraft(item.alt || "");
                    }}
                  >
                    Alt text
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(item.url).then(() => notify("URL copied", "info"))}>
                    Copy URL
                  </Button>
                  <button type="button" aria-label="Delete file" onClick={() => setPendingDelete(item)} className="ml-auto grid h-7 w-7 place-items-center text-slate-400 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Image details"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveAlt}>Save</Button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-4">
            <img src={editing.url} alt={editing.alt || editing.originalName} className="max-h-48 w-full border border-slate-200 object-contain" />
            <Field label="Alt text" hint="Used by screen readers and search engines.">
              <Input value={altDraft} onChange={(e) => setAltDraft(e.target.value)} />
            </Field>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
              <dt className="text-slate-400">File</dt>
              <dd className="truncate">{editing.originalName}</dd>
              <dt className="text-slate-400">Dimensions</dt>
              <dd>{editing.width && editing.height ? `${editing.width} × ${editing.height}px` : "Unknown"}</dd>
              <dt className="text-slate-400">Size</dt>
              <dd>{formatBytes(editing.sizeBytes)}</dd>
              <dt className="text-slate-400">URL</dt>
              <dd className="break-all">{editing.url}</dd>
            </dl>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this file?"
        message={`“${pendingDelete?.originalName ?? ""}” will be removed from storage. Articles referencing it will show a placeholder.`}
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
