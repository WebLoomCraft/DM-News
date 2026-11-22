"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Search, Trash2, Upload } from "lucide-react";
import { api, uploadFile } from "@/lib/admin-api";
import { formatBytes } from "@/lib/utils";
import { Button, Field, Input, Modal, notify } from "./ui";

export type MediaItem = {
  id: number;
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  createdAt: string;
};

export default function MediaPicker({
  open,
  onClose,
  onSelect,
  title = "Media library",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (item: MediaItem) => void;
  title?: string;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [altDraft, setAltDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (search = "") => {
    setLoading(true);
    try {
      const data = await api<{ items: MediaItem[] }>("/api/media", { query: { q: search, perPage: 48 } });
      setItems(data.items);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not load media", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSelected(null);
      load("");
    }
  }, [open, load]);

  const doUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const uploaded: MediaItem[] = [];
      for (const file of Array.from(files).slice(0, 6)) {
        const res = await uploadFile(file);
        uploaded.push(res.item as unknown as MediaItem);
      }
      setItems((prev) => [...uploaded, ...prev]);
      notify(`${uploaded.length} file${uploaded.length > 1 ? "s" : ""} uploaded`, "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveAlt = async () => {
    if (!selected) return;
    try {
      const data = await api<{ item: MediaItem }>(`/api/media/${selected.id}`, { method: "PATCH", json: { alt: altDraft } });
      setItems((prev) => prev.map((m) => (m.id === data.item.id ? data.item : m)));
      notify("Alt text saved", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save alt text", "error");
    }
  };

  const remove = async () => {
    if (!selected) return;
    try {
      await api(`/api/media/${selected.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((m) => m.id !== selected.id));
      setSelected(null);
      notify("Media deleted", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not delete media", "error");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!selected}
            onClick={() => {
              if (selected) onSelect(selected);
              onClose();
            }}
          >
            Use this file
          </Button>
        </>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                load(query);
              }
            }}
            placeholder="Search by filename or alt text"
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => load(query)}>
          Search
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple
          className="hidden"
          onChange={(e) => doUpload(e.target.files)}
        />
        <Button onClick={() => fileRef.current?.click()} loading={uploading}>
          <Upload className="h-3.5 w-3.5" /> Upload
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading media…
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
          <ImagePlus className="mx-auto h-6 w-6 text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No media yet</p>
          <p className="mt-1 text-xs text-slate-500">Upload images (JPG, PNG, WebP, GIF) up to 8MB each.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => {
            const active = selected?.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelected(item);
                  setAltDraft(item.alt || "");
                }}
                className={`group relative overflow-hidden border bg-slate-100 text-left ${active ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/25" : "border-slate-200 hover:border-slate-400"}`}
              >
                <span className="block aspect-[4/3] w-full overflow-hidden">
                  <img src={item.url} alt={item.alt || item.originalName} loading="lazy" className="h-full w-full object-cover" />
                </span>
                <span className="block truncate px-2 py-1.5 text-[0.68rem] text-slate-600">{item.originalName}</span>
              </button>
            );
          })}
        </div>
      )}

      {selected ? (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <div className="overflow-hidden border border-slate-200 bg-slate-100">
              <img src={selected.url} alt={selected.alt || selected.originalName} className="aspect-[4/3] w-full object-cover" />
            </div>
            <div className="space-y-3">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                <dt className="text-slate-400">File</dt>
                <dd className="truncate">{selected.originalName}</dd>
                <dt className="text-slate-400">Type</dt>
                <dd>{selected.mimeType}</dd>
                <dt className="text-slate-400">Size</dt>
                <dd>{formatBytes(selected.sizeBytes)}</dd>
                <dt className="text-slate-400">Dimensions</dt>
                <dd>{selected.width && selected.height ? `${selected.width} × ${selected.height}px` : "Unknown"}</dd>
                <dt className="text-slate-400">URL</dt>
                <dd className="truncate">{selected.url}</dd>
              </dl>
              <Field label="Alt text (accessibility & SEO)">
                <Input value={altDraft} onChange={(e) => setAltDraft(e.target.value)} placeholder="Describe the image for screen readers" />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={saveAlt}>
                  Save alt text
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(selected.url).then(() => notify("URL copied", "info"))}>
                  Copy URL
                </Button>
                <Button size="sm" variant="danger" onClick={remove}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete file
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
