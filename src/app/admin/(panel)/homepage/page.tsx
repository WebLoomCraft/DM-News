"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Plus, Radio, Search, Trash2, X } from "lucide-react";
import { api } from "@/lib/admin-api";
import { formatDate } from "@/lib/utils";
import { Badge, Button, EmptyRow, ErrorNote, Field, Input, Modal, Panel, Select, Spinner, Toggle, notify } from "@/components/admin/ui";

type Section = {
  id: number;
  key: string;
  title: string;
  enabled: boolean;
  orderIndex: number;
  categoryId: number | null;
  layout: string;
  limit: number;
};

type ArticleLite = { id: number; title: string; slug: string; status: string; publishedAt: string | null; featuredImageUrl: string | null; categoryName: string | null };
type Category = { id: number; name: string; slug: string };

export default function HomepagePage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<ArticleLite[]>([]);
  const [breaking, setBreaking] = useState<ArticleLite[]>([]);
  const [originalFeatured, setOriginalFeatured] = useState<number[]>([]);
  const [originalBreaking, setOriginalBreaking] = useState<number[]>([]);
  const [liveUrl, setLiveUrl] = useState("");
  const [tickerEnabled, setTickerEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [savingSections, setSavingSections] = useState(false);
  const [savingStories, setSavingStories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState<"featured" | "breaking" | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerResults, setPickerResults] = useState<ArticleLite[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sectionsRes, featuredRes, categoriesRes, settingsRes] = await Promise.all([
        api<{ items: Section[] }>("/api/homepage/sections"),
        api<{ featured: ArticleLite[]; breaking: ArticleLite[] }>("/api/homepage/featured"),
        api<{ items: Category[] }>("/api/categories"),
        api<{ settings: { liveStreamUrl: string | null; tickerEnabled: boolean } }>("/api/settings"),
      ]);
      setSections(sectionsRes.items);
      setCategories(categoriesRes.items);
      setFeatured(featuredRes.featured);
      setBreaking(featuredRes.breaking);
      setOriginalFeatured(featuredRes.featured.map((a) => a.id));
      setOriginalBreaking(featuredRes.breaking.map((a) => a.id));
      setLiveUrl(settingsRes.settings?.liveStreamUrl || "");
      setTickerEnabled(settingsRes.settings?.tickerEnabled ?? true);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the homepage editor");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const searchArticles = async () => {
    setPickerLoading(true);
    try {
      const data = await api<{ items: ArticleLite[] }>("/api/articles", { query: { q: pickerQuery, status: "published", perPage: 12 } });
      setPickerResults(data.items);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Search failed", "error");
    } finally {
      setPickerLoading(false);
    }
  };

  useEffect(() => {
    if (pickerOpen) {
      setPickerQuery("");
      setPickerResults([]);
      searchArticles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen]);

  const updateSection = (id: number, patch: Partial<Section>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    setSections((prev) => {
      const next = [...prev];
      const [row] = next.splice(index, 1);
      next.splice(target, 0, row!);
      return next.map((s, i) => ({ ...s, orderIndex: i }));
    });
  };

  const saveSections = async () => {
    setSavingSections(true);
    try {
      await api("/api/homepage/sections", {
        method: "PATCH",
        json: {
          sections: sections.map((s, index) => ({
            id: s.id,
            title: s.title,
            enabled: s.enabled,
            orderIndex: index,
            categoryId: s.categoryId,
            limit: Number(s.limit) || 4,
            layout: s.layout,
          })),
        },
      });
      notify("Homepage layout saved — the public site is updated", "success");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not save the layout", "error");
    } finally {
      setSavingSections(false);
    }
  };

  const saveStories = async () => {
    setSavingStories(true);
    try {
      const removedFeatured = originalFeatured.filter((id) => !featured.some((a) => a.id === id));
      const removedBreaking = originalBreaking.filter((id) => !breaking.some((a) => a.id === id));
      await api("/api/homepage/featured", {
        method: "PATCH",
        json: {
          clearFeatured: removedFeatured,
          featured: featured.map((a, index) => ({ id: a.id, featuredRank: index + 1 })),
          clearBreaking: removedBreaking,
          breaking: breaking.map((a) => a.id),
        },
      });
      await api("/api/settings", { method: "PATCH", json: { liveStreamUrl: liveUrl, tickerEnabled } });
      setOriginalFeatured(featured.map((a) => a.id));
      setOriginalBreaking(breaking.map((a) => a.id));
      notify("Featured stories, breaking ticker and live URL saved", "success");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not save", "error");
    } finally {
      setSavingStories(false);
    }
  };

  const addFromPicker = (article: ArticleLite) => {
    if (pickerOpen === "featured") {
      if (featured.some((a) => a.id === article.id)) return notify("Already a featured story", "info");
      setFeatured((prev) => [...prev, article]);
    } else if (pickerOpen === "breaking") {
      if (breaking.some((a) => a.id === article.id)) return notify("Already in the ticker", "info");
      setBreaking((prev) => [...prev, article]);
    }
    notify(`“${article.title.slice(0, 40)}…” added`, "success");
  };

  if (loading) return <Spinner label="Loading homepage editor…" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Homepage editor</h2>
          <p className="mt-1 text-sm text-slate-500">Choose featured stories, control the breaking ticker, the live stream and every homepage block.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={saveSections} loading={savingSections}>
            Save layout
          </Button>
          <Button onClick={saveStories} loading={savingStories}>
            Save stories &amp; broadcast
          </Button>
        </div>
      </div>

      {error ? <ErrorNote message={error} onRetry={load} /> : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Featured stories" description="The lead story and secondary stories in the Top Stories block">
          {featured.length === 0 ? (
            <EmptyRow title="No featured stories selected" hint="The newest published stories are shown automatically until you choose them manually." />
          ) : (
            <ol className="space-y-2">
              {featured.map((article, index) => (
                <li key={article.id} className="flex items-center gap-3 border border-slate-200 bg-white p-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center bg-[#0b1b33] font-cond text-xs text-white">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 block text-sm font-medium text-slate-800">{article.title}</span>
                    <span className="block text-[0.68rem] text-slate-400">
                      {article.categoryName || "—"} · {article.publishedAt ? formatDate(article.publishedAt, { day: "numeric", month: "short" }) : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => setFeatured((prev) => { const next = [...prev]; const [row] = next.splice(index, 1); next.splice(index - 1, 0, row!); return next; })} className="grid h-7 w-7 place-items-center border border-slate-300 disabled:opacity-40">
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button type="button" aria-label="Move down" disabled={index === featured.length - 1} onClick={() => setFeatured((prev) => { const next = [...prev]; const [row] = next.splice(index, 1); next.splice(index + 1, 0, row!); return next; })} className="grid h-7 w-7 place-items-center border border-slate-300 disabled:opacity-40">
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button type="button" aria-label="Remove" onClick={() => setFeatured((prev) => prev.filter((a) => a.id !== article.id))} className="grid h-7 w-7 place-items-center border border-slate-300 text-slate-400 hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <Button variant="outline" className="mt-3" onClick={() => setPickerOpen("featured")}>
            <Plus className="h-3.5 w-3.5" /> Choose featured stories
          </Button>
        </Panel>

        <div className="space-y-5">
          <Panel title="Breaking news ticker" description="Articles that scroll beneath the header">
            <div className="mb-3">
              <Toggle checked={tickerEnabled} onChange={setTickerEnabled} label="Show the breaking news ticker" description="Disable to hide the ticker across the whole site." />
            </div>
            {breaking.length === 0 ? (
              <p className="border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                No articles are flagged as breaking. Mark any story as breaking news here or in the article editor.
              </p>
            ) : (
              <ul className="space-y-2">
                {breaking.map((article) => (
                  <li key={article.id} className="flex items-center gap-2 border border-slate-200 bg-white p-2.5">
                    <Badge tone="red">breaking</Badge>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{article.title}</span>
                    <button type="button" aria-label="Remove from ticker" onClick={() => setBreaking((prev) => prev.filter((a) => a.id !== article.id))} className="grid h-7 w-7 place-items-center text-slate-400 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" className="mt-3" onClick={() => setPickerOpen("breaking")}>
              <Plus className="h-3.5 w-3.5" /> Add breaking stories
            </Button>
          </Panel>

          <Panel title="Live broadcast" description="YouTube live URL or any embeddable stream address">
            <Field label="Live stream URL" hint="Paste a YouTube live link — the Watch Live button and player update instantly.">
              <div className="flex gap-2">
                <Input value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
                <span className="grid shrink-0 place-items-center border border-slate-200 bg-slate-50 px-3 text-slate-400">
                  <Radio className="h-4 w-4" />
                </span>
              </div>
            </Field>
            {liveUrl ? (
              <p className="mt-2 text-xs text-emerald-700">Live player enabled — <Link className="underline" href="/live" target="_blank">preview /live</Link></p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">No stream configured: the homepage shows a designed off-air placeholder.</p>
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Homepage sections" description="Enable, rename, reorder and size every block on the front page">
        <ul className="space-y-2">
          {sections.map((section, index) => (
            <li key={section.id} className="grid gap-3 border border-slate-200 bg-white p-3 lg:grid-cols-[auto_1fr_180px_90px_90px_auto] lg:items-center">
              <span className="flex gap-1">
                <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => moveSection(index, -1)} className="grid h-8 w-8 place-items-center border border-slate-300 disabled:opacity-40">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" aria-label="Move down" disabled={index === sections.length - 1} onClick={() => moveSection(index, 1)} className="grid h-8 w-8 place-items-center border border-slate-300 disabled:opacity-40">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </span>
              <span className="min-w-0">
                <Input value={section.title} onChange={(e) => updateSection(section.id, { title: e.target.value })} className="font-medium" />
                <span className="mt-1 block font-mono text-[0.65rem] text-slate-400">{section.key}</span>
              </span>
              {section.key.startsWith("category:") ? (
                <Select value={String(section.categoryId ?? "")} onChange={(e) => updateSection(section.id, { categoryId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">— No category —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <span className="text-xs text-slate-400">Static block</span>
              )}
              <Input
                type="number"
                min={1}
                max={24}
                value={section.limit}
                onChange={(e) => updateSection(section.id, { limit: Number(e.target.value) })}
                aria-label="Number of items"
              />
              <button
                type="button"
                role="switch"
                aria-checked={section.enabled}
                onClick={() => updateSection(section.id, { enabled: !section.enabled })}
                className={`inline-flex h-8 w-16 shrink-0 items-center justify-center border text-[0.62rem] font-bold uppercase tracking-[0.1em] ${
                  section.enabled ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-slate-50 text-slate-400"
                }`}
              >
                {section.enabled ? "On" : "Off"}
              </button>
              <span className="hidden text-[0.65rem] text-slate-400 lg:block">{section.layout}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={saveSections} loading={savingSections}>
            Save layout
          </Button>
          <Link href="/" target="_blank">
            <Button variant="outline">Preview homepage</Button>
          </Link>
        </div>
      </Panel>

      <Modal open={Boolean(pickerOpen)} onClose={() => setPickerOpen(null)} title={pickerOpen === "featured" ? "Choose featured stories" : "Choose breaking stories"} size="lg">
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") searchArticles();
              }}
              placeholder="Search published articles…"
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={searchArticles} loading={pickerLoading}>
            Search
          </Button>
        </div>
        {pickerResults.length === 0 ? (
          <p className="border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">No published articles match that search.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pickerResults.map((article) => (
              <li key={article.id} className="flex items-center gap-3 py-2.5">
                <span className="h-10 w-14 shrink-0 overflow-hidden bg-slate-100">
                  {article.featuredImageUrl ? <img src={article.featuredImageUrl} alt="" className="h-full w-full object-cover" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 block text-sm font-medium text-slate-800">{article.title}</span>
                  <span className="block text-[0.68rem] text-slate-400">
                    {article.categoryName || "—"} · {article.status}
                  </span>
                </span>
                <Button size="sm" variant="outline" onClick={() => addFromPicker(article)}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
