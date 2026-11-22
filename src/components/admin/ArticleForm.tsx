"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Eye, Image as ImageIcon, Save, Trash2, Upload } from "lucide-react";
import { api, uploadFile } from "@/lib/admin-api";
import { cn, formatDate, slugify, toDateTimeLocal } from "@/lib/utils";
import RichTextEditor from "./RichTextEditor";
import MediaPicker, { type MediaItem } from "./MediaPicker";
import { Badge, Button, ConfirmDialog, Field, Input, Select, Spinner, Textarea, Toggle, notify, statusTone } from "./ui";

type Category = { id: number; name: string; slug: string };
type Author = { id: number; name: string; slug: string };
type Tag = { id: number; name: string; slug: string };

type ArticleState = {
  title: string;
  slug: string;
  slugTouched: boolean;
  excerpt: string;
  content: string;
  featuredImageUrl: string;
  imageAlt: string;
  imageCaption: string;
  categoryId: number | "";
  authorId: number | "";
  status: string;
  isFeatured: boolean;
  featuredRank: number;
  isBreaking: boolean;
  seoTitle: string;
  seoDescription: string;
  socialImageUrl: string;
  publishedAt: string;
  tags: string[];
};

const emptyState: ArticleState = {
  title: "",
  slug: "",
  slugTouched: false,
  excerpt: "",
  content: "",
  featuredImageUrl: "",
  imageAlt: "",
  imageCaption: "",
  categoryId: "",
  authorId: "",
  status: "draft",
  isFeatured: false,
  featuredRank: 0,
  isBreaking: false,
  seoTitle: "",
  seoDescription: "",
  socialImageUrl: "",
  publishedAt: "",
  tags: [],
};

export default function ArticleForm({ articleId, canPublishArticles }: { articleId?: number; canPublishArticles: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<ArticleState>(emptyState);
  const [loading, setLoading] = useState(Boolean(articleId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState<"content" | "media" | "publish" | "seo">("content");
  const [mediaOpen, setMediaOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [knownTags, setKnownTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [currentId, setCurrentId] = useState<number | undefined>(articleId);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingImage, setUploadingImage] = useState(false);

  const load = useCallback(async () => {
    if (!articleId) return;
    setLoading(true);
    try {
      const data = await api<{ article: Record<string, unknown> & { tags?: Tag[] } }>(`/api/articles/${articleId}`);
      const a = data.article as unknown as Record<string, string | number | boolean | null>;
      setForm({
        title: String(a.title ?? ""),
        slug: String(a.slug ?? ""),
        slugTouched: true,
        excerpt: String(a.excerpt ?? ""),
        content: String(a.content ?? ""),
        featuredImageUrl: String(a.featuredImageUrl ?? ""),
        imageAlt: String(a.imageAlt ?? ""),
        imageCaption: String(a.imageCaption ?? ""),
        categoryId: (a.categoryId as number) ?? "",
        authorId: (a.authorId as number) ?? "",
        status: String(a.status ?? "draft"),
        isFeatured: Boolean(a.isFeatured),
        featuredRank: Number(a.featuredRank ?? 0),
        isBreaking: Boolean(a.isBreaking),
        seoTitle: String(a.seoTitle ?? ""),
        seoDescription: String(a.seoDescription ?? ""),
        socialImageUrl: String(a.socialImageUrl ?? ""),
        publishedAt: a.publishedAt ? toDateTimeLocal(String(a.publishedAt)) : "",
        tags: (data.article.tags || []).map((t) => t.name),
      });
      setExistingStatus(String(a.status ?? "draft"));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load this article");
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const [catRes, authorRes, tagRes] = await Promise.all([
          api<{ items: Category[] }>("/api/categories"),
          api<{ items: Author[] }>("/api/authors"),
          api<{ items: Tag[] }>("/api/tags"),
        ]);
        setCategories(catRes.items);
        setAuthors(authorRes.items);
        setKnownTags(tagRes.items);
      } catch (error) {
        notify(error instanceof Error ? error.message : "Could not load reference data", "error");
      }
    })();
  }, []);

  const set = <K extends keyof ArticleState>(key: K, value: ArticleState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const effectiveSlug = useMemo(() => (form.slugTouched && form.slug ? form.slug : slugify(form.title)), [form.slug, form.slugTouched, form.title]);

  const payload = (status: string) => ({
    title: form.title.trim(),
    slug: effectiveSlug,
    excerpt: form.excerpt.trim() || null,
    content: form.content,
    featuredImageUrl: form.featuredImageUrl.trim() || null,
    imageAlt: form.imageAlt.trim() || null,
    imageCaption: form.imageCaption.trim() || null,
    categoryId: form.categoryId === "" ? null : Number(form.categoryId),
    authorId: form.authorId === "" ? null : Number(form.authorId),
    status,
    isFeatured: form.isFeatured,
    featuredRank: Number(form.featuredRank) || 0,
    isBreaking: form.isBreaking,
    seoTitle: form.seoTitle.trim() || null,
    seoDescription: form.seoDescription.trim() || null,
    socialImageUrl: form.socialImageUrl.trim() || null,
    publishedAt: form.publishedAt ? new Date(`${form.publishedAt}:00Z`).toISOString() : null,
    tags: form.tags,
  });

  const validate = (status: string) => {
    const next: Record<string, string> = {};
    if (form.title.trim().length < 6) next.title = "Headline must be at least 6 characters";
    if (!effectiveSlug) next.title = next.title || "Add a headline so a URL can be generated";
    if ((status === "published" || status === "scheduled") && !form.categoryId) next.categoryId = "Choose a section before publishing";
    if (status === "scheduled" && !form.publishedAt) next.publishedAt = "Pick a future publication date and time";
    if (status === "scheduled" && form.publishedAt && new Date(`${form.publishedAt}:00Z`).getTime() <= Date.now()) {
      next.publishedAt = "Scheduled time must be in the future";
    }
    setErrors(next);
    if (Object.keys(next).length) {
      setTab(next.content ? "content" : next.categoryId || next.publishedAt ? "publish" : "content");
      notify("Please fix the highlighted fields", "error");
      return false;
    }
    return true;
  };

  const save = async (status: string) => {
    if (!validate(status)) return;
    setSaving(true);
    try {
      const body = payload(status);
      if (currentId) {
        await api(`/api/articles/${currentId}`, { method: "PATCH", json: body });
        setExistingStatus(status);
        notify(status === "published" ? "Article published — it is live on the site" : `Saved as ${status}`, "success");
      } else {
        const data = await api<{ article: { id: number; slug: string } }>("/api/articles", { method: "POST", json: body });
        setCurrentId(data.article.id);
        setForm((f) => ({ ...f, slug: data.article.slug, slugTouched: true }));
        setExistingStatus(status);
        router.replace(`/admin/articles/${data.article.id}`);
        notify(status === "published" ? "Article published" : "Draft created", "success");
      }
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save the article", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!currentId) return;
    setDeleting(true);
    try {
      await api(`/api/articles/${currentId}`, { method: "DELETE" });
      notify("Article deleted", "success");
      router.push("/admin/articles");
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not delete the article", "error");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const uploadFeatured = async (file: File | null) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await uploadFile(file, form.title.slice(0, 160));
      set("featuredImageUrl", res.item.url);
      if (!form.imageAlt) set("imageAlt", form.title.slice(0, 160));
      notify("Featured image uploaded", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Upload failed", "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const addTag = (raw: string) => {
    const name = raw.trim().replace(/^#/, "");
    if (!name) return;
    if (form.tags.some((t) => t.toLowerCase() === name.toLowerCase())) return;
    set("tags", [...form.tags, name].slice(0, 30));
    setTagInput("");
  };

  if (loading) return <Spinner label="Loading article…" />;
  if (loadError) {
    return (
      <div className="border border-red-200 bg-red-50 px-5 py-8 text-center text-sm text-red-700">
        <AlertTriangle className="mx-auto mb-2 h-5 w-5" />
        {loadError}
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" onClick={load}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "content", label: "Content" },
    { key: "media", label: "Media" },
    { key: "publish", label: "Publishing" },
    { key: "seo", label: "SEO & social" },
  ] as const;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-5">
        <div className="border border-slate-200 bg-white p-4 sm:p-5">
          <Field label="Headline" required error={errors.title}>
            <Input
              value={form.title}
              onChange={(e) => {
                const next = e.target.value;
                setForm((f) => ({
                  ...f,
                  title: next,
                  slug: f.slugTouched ? f.slug : slugify(next),
                }));
              }}
              placeholder="Write a clear, factual headline"
              className="font-display text-lg font-semibold"
            />
          </Field>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-[0.1em]">URL</span>
            <code className="border border-slate-200 bg-slate-50 px-2 py-1 text-[0.7rem] text-slate-600">/news/{effectiveSlug || "your-headline-slug"}</code>
            <button type="button" className="underline hover:text-[#0b1b33]" onClick={() => setForm((f) => ({ ...f, slugTouched: false, slug: slugify(f.title) }))}>
              Regenerate from headline
            </button>
          </div>
          <div className="mt-3">
            <Field label="Custom slug (optional)" hint="Only change this if you need a shorter or keyword-rich URL.">
              <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value), slugTouched: true }))} placeholder={slugify(form.title) || "article-slug"} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Short description / standfirst" hint={`${form.excerpt.length}/600 characters — used in cards, search results and meta descriptions.`}>
              <Textarea value={form.excerpt} maxLength={600} onChange={(e) => set("excerpt", e.target.value)} placeholder="Summarise the story in two sentences" />
            </Field>
          </div>
        </div>

        <div className="border border-slate-200 bg-white">
          <div className="flex flex-wrap gap-1 border-b border-slate-200 px-3 py-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.1em] transition-colors",
                  tab === t.key ? "bg-[#0b1b33] text-white" : "text-slate-500 hover:bg-slate-100",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-5">
            {tab === "content" ? (
              <Field label="Article body" required hint="Use the toolbar for headings, lists, quotes, links, images and YouTube embeds. Everything is sanitised before publishing.">
                <RichTextEditor value={form.content} onChange={(html) => set("content", html)} />
              </Field>
            ) : null}

            {tab === "media" ? (
              <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-[220px_1fr]">
                  <div>
                    <div className="aspect-[16/10] w-full overflow-hidden border border-slate-200 bg-slate-100">
                      {form.featuredImageUrl ? (
                        <img src={form.featuredImageUrl} alt={form.imageAlt || "Featured image preview"} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-slate-400">
                          <ImageIcon className="h-7 w-7" />
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setMediaOpen(true)}>
                        Media library
                      </Button>
                      <label className="inline-flex cursor-pointer items-center gap-2 border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#0b1b33]">
                        <Upload className="h-3.5 w-3.5" />
                        {uploadingImage ? "Uploading…" : "Upload"}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadFeatured(e.target.files?.[0] ?? null)} />
                      </label>
                      {form.featuredImageUrl ? (
                        <Button size="sm" variant="ghost" onClick={() => set("featuredImageUrl", "")}>
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Field label="Featured image URL">
                      <Input value={form.featuredImageUrl} onChange={(e) => set("featuredImageUrl", e.target.value)} placeholder="/api/media/file/… or https://…" />
                    </Field>
                    <Field label="Image alt text" hint="Describes the image for screen readers and search engines.">
                      <Input value={form.imageAlt} onChange={(e) => set("imageAlt", e.target.value)} placeholder={form.title} />
                    </Field>
                    <Field label="Image caption" hint="Shown under the image on the article page.">
                      <Input value={form.imageCaption} onChange={(e) => set("imageCaption", e.target.value)} placeholder="Photograph: DM News Network" />
                    </Field>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "publish" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Section / category" required error={errors.categoryId}>
                  <Select value={String(form.categoryId)} onChange={(e) => set("categoryId", e.target.value ? Number(e.target.value) : "")}>
                    <option value="">— Select a section —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Author / desk">
                  <Select value={String(form.authorId)} onChange={(e) => set("authorId", e.target.value ? Number(e.target.value) : "")}>
                    <option value="">— Select an author —</option>
                    {authors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Publication status">
                  <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                    <option value="draft">Draft</option>
                    {canPublishArticles ? <option value="published">Published</option> : null}
                    {canPublishArticles ? <option value="scheduled">Scheduled</option> : null}
                    <option value="archived">Archived (unpublished)</option>
                  </Select>
                </Field>
                <Field label="Publication date & time (UTC)" error={errors.publishedAt} hint="Used for scheduling and shown on the article page.">
                  <Input type="datetime-local" value={form.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Tags" hint="Press Enter or comma to add. New tags are created automatically.">
                    <div className="border border-slate-300 bg-white p-2">
                      <div className="flex flex-wrap gap-1.5">
                        {form.tags.map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 text-xs text-slate-700">
                            #{tag}
                            <button type="button" aria-label={`Remove ${tag}`} onClick={() => set("tags", form.tags.filter((t) => t !== tag))} className="text-slate-400 hover:text-red-600">
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          value={tagInput}
                          list="admin-tag-suggestions"
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              addTag(tagInput);
                            } else if (e.key === "Backspace" && !tagInput && form.tags.length) {
                              set("tags", form.tags.slice(0, -1));
                            }
                          }}
                          onBlur={() => addTag(tagInput)}
                          placeholder={form.tags.length ? "" : "Add a tag…"}
                          className="min-w-[120px] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none"
                        />
                      </div>
                      <datalist id="admin-tag-suggestions">
                        {knownTags.map((t) => (
                          <option key={t.id} value={t.name} />
                        ))}
                      </datalist>
                    </div>
                  </Field>
                </div>
              </div>
            ) : null}

            {tab === "seo" ? (
              <div className="space-y-4">
                <Field label="SEO title" hint={`${form.seoTitle.length}/200 — falls back to the headline.`}>
                  <Input value={form.seoTitle} maxLength={200} onChange={(e) => set("seoTitle", e.target.value)} placeholder={form.title} />
                </Field>
                <Field label="Meta description" hint={`${form.seoDescription.length}/400 — used for search snippets and social cards.`}>
                  <Textarea value={form.seoDescription} maxLength={400} onChange={(e) => set("seoDescription", e.target.value)} placeholder={form.excerpt} />
                </Field>
                <Field label="Social sharing image URL" hint="Defaults to the featured image when empty.">
                  <Input value={form.socialImageUrl} onChange={(e) => set("socialImageUrl", e.target.value)} placeholder={form.featuredImageUrl} />
                </Field>
                <div className="border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-400">Search preview</p>
                  <p className="mt-2 truncate text-sm text-emerald-800">dmnewsnetwork.com › news › {effectiveSlug || "…"}</p>
                  <p className="truncate font-display text-lg text-[#1a0dab]">{form.seoTitle || form.title || "Headline preview"}</p>
                  <p className="line-clamp-2 text-xs text-slate-600">{form.seoDescription || form.excerpt || "Meta description preview"}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------- side rail */}
      <aside className="space-y-4">
        <div className="border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-500">Status</p>
            <Badge tone={statusTone(form.status)}>{form.status}</Badge>
          </div>
          <div className="mt-4 space-y-2">
            <Button className="w-full" onClick={() => save(form.status === "draft" ? "draft" : form.status)} loading={saving} disabled={saving}>
              <Save className="h-3.5 w-3.5" /> Save {form.status === "draft" ? "draft" : form.status}
            </Button>
            {canPublishArticles ? (
              <Button variant="accent" className="w-full" onClick={() => save("published")} loading={saving} disabled={saving}>
                {existingStatus === "published" ? "Update live article" : "Publish now"}
              </Button>
            ) : (
              <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Your role saves drafts only. An editor or admin publishes the story.
              </p>
            )}
            {canPublishArticles ? (
              <Button variant="outline" className="w-full" onClick={() => save("scheduled")} loading={saving} disabled={saving}>
                Schedule
              </Button>
            ) : null}
            {existingStatus === "published" ? (
              <Button variant="outline" className="w-full" onClick={() => save("archived")} loading={saving} disabled={saving}>
                Unpublish (archive)
              </Button>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200 pt-4">
            <Button variant="ghost" size="sm" onClick={() => { const slug = effectiveSlug || slugify(form.title); window.open(`/news/${slug}`, "_blank"); }}>
              <Eye className="h-3.5 w-3.5" /> Preview
            </Button>
            {currentId ? (
              <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            ) : (
              <Link href="/admin/articles" className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">
                Cancel
              </Link>
            )}
          </div>
        </div>

        <div className="space-y-3 border border-slate-200 bg-white p-4">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-500">Homepage placement</p>
          <Toggle
            checked={form.isFeatured}
            onChange={(v) => set("isFeatured", v)}
            label="Featured story"
            description="Shows in the Top Stories block on the homepage."
          />
          {form.isFeatured ? (
            <Field label="Featured position (1 = lead story)">
              <Input type="number" min={0} max={99} value={form.featuredRank} onChange={(e) => set("featuredRank", Number(e.target.value))} />
            </Field>
          ) : null}
          <Toggle
            checked={form.isBreaking}
            onChange={(v) => set("isBreaking", v)}
            label="Breaking news"
            description="Adds this story to the scrolling breaking news ticker."
          />
        </div>

        <div className="border border-slate-200 bg-white p-4 text-xs text-slate-500">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-500">Checklist</p>
          <ul className="mt-2 space-y-1.5">
            <li className={form.title.trim().length >= 6 ? "text-emerald-700" : ""}>{form.title.trim().length >= 6 ? "✓" : "○"} Headline</li>
            <li className={form.content.trim().length > 40 ? "text-emerald-700" : ""}>{form.content.trim().length > 40 ? "✓" : "○"} Body copy</li>
            <li className={form.featuredImageUrl ? "text-emerald-700" : ""}>{form.featuredImageUrl ? "✓" : "○"} Featured image</li>
            <li className={form.categoryId ? "text-emerald-700" : ""}>{form.categoryId ? "✓" : "○"} Section assigned</li>
            <li className={form.excerpt.trim() ? "text-emerald-700" : ""}>{form.excerpt.trim() ? "✓" : "○"} Short description</li>
          </ul>
        </div>
      </aside>

      <MediaPicker
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        title="Choose featured image"
        onSelect={(item: MediaItem) => {
          set("featuredImageUrl", item.url);
          if (!form.imageAlt) set("imageAlt", item.alt || item.originalName);
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        busy={deleting}
        title="Delete this article?"
        message="This permanently removes the article, its tag links and its URL. This cannot be undone."
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

export function ArticleDateNote({ date }: { date: string | Date | null }) {
  return <span className="text-xs text-slate-500">{formatDate(date, { day: "numeric", month: "short", year: "numeric" })}</span>;
}
