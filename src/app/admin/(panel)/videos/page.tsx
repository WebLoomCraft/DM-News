"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/admin-api";
import { formatDateTime, parseYouTubeId } from "@/lib/utils";
import { Badge, Button, ConfirmDialog, EmptyRow, ErrorNote, Field, Input, Modal, Panel, Select, Spinner, Textarea, Toggle, notify } from "@/components/admin/ui";
import MediaPicker, { type MediaItem } from "@/components/admin/MediaPicker";

type Video = {
  id: number;
  title: string;
  youtubeUrl: string;
  youtubeId: string | null;
  thumbnailUrl: string | null;
  description: string | null;
  kind: string;
  isLive: boolean;
  orderIndex: number;
  publishedAt: string | null;
};

const blank = { title: "", youtubeUrl: "", thumbnailUrl: "", description: "", kind: "report", isLive: false, orderIndex: 0, publishedAt: "" };

export default function VideosPage() {
  const [items, setItems] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Video | null>(null);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Video | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: Video[] }>("/api/videos");
      setItems(data.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load videos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      const payload = { ...form, orderIndex: Number(form.orderIndex) || 0 };
      if (editing) {
        await api(`/api/videos/${editing.id}`, { method: "PATCH", json: payload });
        notify("Video updated", "success");
      } else {
        await api("/api/videos", { method: "POST", json: payload });
        notify("Video added", "success");
      }
      setModalOpen(false);
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not save the video", "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    try {
      await api(`/api/videos/${pendingDelete.id}`, { method: "DELETE" });
      notify("Video removed", "success");
      setPendingDelete(null);
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not remove the video", "error");
    }
  };

  const ytId = parseYouTubeId(form.youtubeUrl);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Videos</h2>
          <p className="mt-1 text-sm text-slate-500">Paste a YouTube link or a direct MP4/WebM URL. Long programmes are best hosted on YouTube.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setForm({ ...blank, orderIndex: items.length });
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add video
        </Button>
      </div>

      {error ? <ErrorNote message={error} onRetry={load} /> : null}

      <Panel>
        {loading ? (
          <Spinner label="Loading videos…" />
        ) : items.length === 0 ? (
          <EmptyRow title="No videos published" hint="Add your first video report — it appears in the homepage video block and on /videos." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((video) => (
              <div key={video.id} className="border border-slate-200 bg-white">
                <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
                  {video.thumbnailUrl || video.youtubeId ? (
                    <img
                      src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
                      alt={video.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : video.youtubeUrl.match(/\.(mp4|webm|mov)/i) ? (
                    <video src={video.youtubeUrl} className="h-full w-full object-cover" muted preload="metadata" />
                  ) : null}
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <Badge tone="blue">{video.kind}</Badge>
                    {video.isLive ? <Badge tone="red">live</Badge> : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-800">{video.title}</p>
                  <p className="mt-1 text-[0.68rem] text-slate-400">{video.publishedAt ? formatDateTime(video.publishedAt) : ""}</p>
                  <div className="mt-2 flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(video);
                        setForm({
                          title: video.title,
                          youtubeUrl: video.youtubeUrl,
                          thumbnailUrl: video.thumbnailUrl || "",
                          description: video.description || "",
                          kind: video.kind,
                          isLive: video.isLive,
                          orderIndex: video.orderIndex,
                          publishedAt: "",
                        });
                        setModalOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setPendingDelete(video)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit video" : "Add video"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={save} loading={busy}>
              {editing ? "Save changes" : "Add video"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title" required>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Evening bulletin — full report" />
          </Field>
          <Field label="Video URL" required hint="YouTube watch/share/embed link, or a direct MP4/WebM file.">
            <Input value={form.youtubeUrl} onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))} placeholder="https://www.youtube.com/watch?v=…" />
          </Field>
          {ytId ? <p className="text-xs text-emerald-700">Detected YouTube ID: {ytId} — a privacy-friendly embed will be used.</p> : null}
          <Field label="Thumbnail URL" hint="Optional for YouTube links (the platform thumbnail is used automatically).">
            <div className="flex gap-2">
              <Input value={form.thumbnailUrl} onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))} />
              <Button variant="outline" onClick={() => setPickerOpen(true)}>
                Browse
              </Button>
            </div>
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <Select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
                <option value="report">News report</option>
                <option value="interview">Interview</option>
                <option value="clip">Short clip</option>
                <option value="live">Live programme</option>
              </Select>
            </Field>
            <Field label="Display order">
              <Input type="number" min={0} value={form.orderIndex} onChange={(e) => setForm((f) => ({ ...f, orderIndex: Number(e.target.value) }))} />
            </Field>
          </div>
          <Toggle checked={form.isLive} onChange={(v) => setForm((f) => ({ ...f, isLive: v }))} label="This is the live broadcast" description="Highlighted at the top of the /videos page." />
        </div>
      </Modal>

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose a thumbnail" onSelect={(item: MediaItem) => setForm((f) => ({ ...f, thumbnailUrl: item.url }))} />

      <ConfirmDialog open={Boolean(pendingDelete)} title="Remove this video?" message={`“${pendingDelete?.title ?? ""}” will disappear from the website.`} onConfirm={remove} onCancel={() => setPendingDelete(null)} />
    </div>
  );
}
