"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2, X } from "lucide-react";
import { api } from "@/lib/admin-api";
import { Button, ErrorNote, Field, Input, Panel, Spinner, Textarea, Toggle, notify } from "@/components/admin/ui";
import RichTextEditor from "@/components/admin/RichTextEditor";
import MediaPicker, { type MediaItem } from "@/components/admin/MediaPicker";

type NavItem = { label: string; href: string; enabled?: boolean };
type FooterColumn = { title: string; links: { label: string; href: string }[] };

type Settings = Record<string, unknown> & {
  siteName: string;
  tagline: string | null;
  siteDescription: string | null;
  siteUrl: string;
  logoUrl: string | null;
  logoMarkText: string;
  logoWordmark: string;
  faviconUrl: string | null;
  colorPrimary: string;
  colorAccent: string;
  colorInk: string;
  colorPaper: string;
  navItems: NavItem[] | null;
  showSearchIcon: boolean;
  showWatchLiveButton: boolean;
  watchLiveLabel: string;
  liveStreamUrl: string | null;
  liveStreamEnabled: boolean;
  showLiveIndicator: boolean;
  showLanguageSelector: boolean;
  tickerEnabled: boolean;
  tickerLabel: string;
  tickerSpeed: number;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  xUrl: string | null;
  instagramUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  footerAbout: string | null;
  footerColumns: FooterColumn[] | null;
  copyright: string | null;
  newsletterEnabled: boolean;
  newsletterTitle: string | null;
  newsletterDescription: string | null;
  defaultSeoTitle: string | null;
  defaultSeoDescription: string | null;
  defaultSocialImage: string | null;
  adSlotHtml: string | null;
  showAdSlots: boolean;
  aboutContent: string | null;
  privacyContent: string | null;
  termsContent: string | null;
  analyticsSnippet: string | null;
};

const TABS = [
  { key: "brand", label: "Brand" },
  { key: "nav", label: "Header & nav" },
  { key: "ticker", label: "Ticker & live" },
  { key: "social", label: "Social & contact" },
  { key: "footer", label: "Footer" },
  { key: "seo", label: "SEO & newsletter" },
  { key: "pages", label: "Pages & scripts" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabKey>("brand");
  const [picker, setPicker] = useState<null | "logo" | "favicon" | "socialImage">(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ settings: Settings }>("/api/settings");
      setSettings(data.settings);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((s) => (s ? { ...s, [key]: value } : s));
  const str = (value: unknown) => (value == null ? "" : String(value));

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      const keys: (keyof Settings)[] = [
        "siteName", "tagline", "siteDescription", "siteUrl", "logoUrl", "logoMarkText", "logoWordmark", "faviconUrl",
        "colorPrimary", "colorAccent", "colorInk", "colorPaper", "navItems", "showSearchIcon", "showWatchLiveButton",
        "watchLiveLabel", "liveStreamUrl", "liveStreamEnabled", "showLiveIndicator", "showLanguageSelector",
        "tickerEnabled", "tickerLabel", "tickerSpeed", "facebookUrl", "tiktokUrl", "youtubeUrl", "xUrl", "instagramUrl",
        "contactEmail", "contactPhone", "contactAddress", "footerAbout", "footerColumns", "copyright",
        "newsletterEnabled", "newsletterTitle", "newsletterDescription", "defaultSeoTitle", "defaultSeoDescription",
        "defaultSocialImage", "adSlotHtml", "showAdSlots", "aboutContent", "privacyContent", "termsContent", "analyticsSnippet",
      ];
      for (const key of keys) payload[key as string] = settings[key];
      const data = await api<{ settings: Settings }>("/api/settings", { method: "PATCH", json: payload });
      setSettings(data.settings);
      notify("Settings saved — the public website is updated", "success");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const navItems: NavItem[] = Array.isArray(settings?.navItems) ? (settings!.navItems as NavItem[]) : [];
  const footerColumns: FooterColumn[] = Array.isArray(settings?.footerColumns) ? (settings!.footerColumns as FooterColumn[]) : [];

  const moveNav = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= navItems.length) return;
    const next = [...navItems];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row!);
    set("navItems", next);
  };

  if (loading) return <Spinner label="Loading settings…" />;
  if (error) return <ErrorNote message={error} onRetry={load} />;
  if (!settings) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Website settings</h2>
          <p className="mt-1 text-sm text-slate-500">Identity, colours, navigation, social links, SEO defaults and legal pages.</p>
        </div>
        <Button onClick={save} loading={saving}>
          <Save className="h-4 w-4" /> Save all settings
        </Button>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.1em] transition-colors ${
              tab === t.key ? "bg-[#0b1b33] text-white" : "text-slate-500 hover:bg-slate-200/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "brand" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Identity">
            <div className="space-y-4">
              <Field label="Website name" required>
                <Input value={str(settings.siteName)} onChange={(e) => set("siteName", e.target.value)} />
              </Field>
              <Field label="Tagline">
                <Input value={str(settings.tagline)} onChange={(e) => set("tagline", e.target.value)} />
              </Field>
              <Field label="Website description" hint="Used for metadata and search snippets.">
                <Textarea value={str(settings.siteDescription)} onChange={(e) => set("siteDescription", e.target.value)} />
              </Field>
              <Field label="Canonical site URL" hint="Used for sitemaps, canonicals and social cards.">
                <Input value={str(settings.siteUrl)} onChange={(e) => set("siteUrl", e.target.value)} placeholder="https://dmnewsnetwork.com" />
              </Field>
            </div>
          </Panel>

          <Panel title="Logo & favicon">
            <div className="space-y-4">
              <div className="flex items-center gap-4 border border-slate-200 bg-slate-50 p-3">
                {settings.logoUrl ? (
                  <img src={String(settings.logoUrl)} alt="Current logo" className="h-12 w-auto max-w-[160px] object-contain" />
                ) : (
                  <span className="grid h-12 w-12 place-items-center bg-[#0b1b33] font-cond text-lg text-white">{str(settings.logoMarkText)}</span>
                )}
                <div className="text-xs text-slate-500">
                  {settings.logoUrl ? "Uploaded logo in use" : "No logo uploaded — the wordmark below is used"}
                </div>
              </div>
              <Field label="Logo image URL">
                <div className="flex gap-2">
                  <Input value={str(settings.logoUrl)} onChange={(e) => set("logoUrl", e.target.value || null)} placeholder="/api/media/file/… or https://…" />
                  <Button variant="outline" onClick={() => setPicker("logo")}>
                    Browse
                  </Button>
                  {settings.logoUrl ? (
                    <Button variant="ghost" onClick={() => set("logoUrl", null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Logo mark text" hint="Shown inside the navy square when no image is set.">
                  <Input value={str(settings.logoMarkText)} maxLength={6} onChange={(e) => set("logoMarkText", e.target.value)} />
                </Field>
                <Field label="Wordmark">
                  <Input value={str(settings.logoWordmark)} onChange={(e) => set("logoWordmark", e.target.value)} />
                </Field>
              </div>
              <Field label="Favicon URL">
                <div className="flex gap-2">
                  <Input value={str(settings.faviconUrl)} onChange={(e) => set("faviconUrl", e.target.value || null)} />
                  <Button variant="outline" onClick={() => setPicker("favicon")}>
                    Browse
                  </Button>
                </div>
              </Field>
            </div>
          </Panel>

          <Panel title="Brand colours" className="lg:col-span-2" description="Applied instantly across the public website through CSS variables">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { key: "colorPrimary", label: "Primary (navy)" },
                { key: "colorAccent", label: "Accent (red)" },
                { key: "colorInk", label: "Ink (black)" },
                { key: "colorPaper", label: "Paper (white)" },
              ].map((colour) => (
                <Field key={colour.key} label={colour.label}>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={str(settings[colour.key as keyof Settings])}
                      onChange={(e) => set(colour.key as keyof Settings, e.target.value as never)}
                      className="h-10 w-14 shrink-0 border border-slate-300 bg-white p-1"
                    />
                    <Input value={str(settings[colour.key as keyof Settings])} onChange={(e) => set(colour.key as keyof Settings, e.target.value as never)} />
                  </div>
                </Field>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="h-10 w-24" style={{ background: str(settings.colorPrimary) }} />
              <span className="h-10 w-24" style={{ background: str(settings.colorAccent) }} />
              <span className="h-10 w-24 border border-slate-200" style={{ background: str(settings.colorPaper) }} />
              <span className="h-10 w-24" style={{ background: str(settings.colorInk) }} />
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === "nav" ? (
        <div className="space-y-5">
          <Panel title="Header options">
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle checked={settings.showSearchIcon} onChange={(v) => set("showSearchIcon", v)} label="Show search icon" description="Opens the search field in the header." />
              <Toggle checked={settings.showWatchLiveButton} onChange={(v) => set("showWatchLiveButton", v)} label="Show Watch Live button" description="Appears when a live stream URL is configured." />
              <Toggle checked={settings.showLiveIndicator} onChange={(v) => set("showLiveIndicator", v)} label="Show on-air indicator" description="Small live marker in the top information bar." />
              <Toggle checked={settings.showLanguageSelector} onChange={(v) => set("showLanguageSelector", v)} label="Show language selector" description="Switches interface language and date formatting (EN / اردو)." />
              <Field label="Watch Live button label">
                <Input value={str(settings.watchLiveLabel)} onChange={(e) => set("watchLiveLabel", e.target.value)} />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Navigation items"
            description="Add, rename, reorder, enable or remove main menu links"
            action={
              <Button size="sm" variant="outline" onClick={() => set("navItems", [...navItems, { label: "New link", href: "/", enabled: true }])}>
                <Plus className="h-3.5 w-3.5" /> Add item
              </Button>
            }
          >
            {navItems.length === 0 ? (
              <p className="text-sm text-slate-500">No navigation items — the default menu will be used.</p>
            ) : (
              <ul className="space-y-2">
                {navItems.map((item, index) => (
                  <li key={`${item.href}-${index}`} className="grid gap-2 border border-slate-200 bg-white p-2.5 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center">
                    <Input value={item.label} onChange={(e) => set("navItems", navItems.map((n, i) => (i === index ? { ...n, label: e.target.value } : n)))} aria-label="Label" />
                    <Input value={item.href} onChange={(e) => set("navItems", navItems.map((n, i) => (i === index ? { ...n, href: e.target.value } : n)))} aria-label="Link" />
                    <span className="flex gap-1">
                      <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => moveNav(index, -1)} className="grid h-8 w-8 place-items-center border border-slate-300 disabled:opacity-40">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" aria-label="Move down" disabled={index === navItems.length - 1} onClick={() => moveNav(index, 1)} className="grid h-8 w-8 place-items-center border border-slate-300 disabled:opacity-40">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </span>
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => set("navItems", navItems.map((n, i) => (i === index ? { ...n, enabled: n.enabled === false } : n)))}
                        className={`border px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.1em] ${
                          item.enabled === false ? "border-slate-300 bg-slate-50 text-slate-400" : "border-emerald-600 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {item.enabled === false ? "Hidden" : "Visible"}
                      </button>
                      <button type="button" aria-label="Remove item" onClick={() => set("navItems", navItems.filter((_, i) => i !== index))} className="grid h-8 w-8 place-items-center border border-slate-300 text-slate-400 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      ) : null}

      {tab === "ticker" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Breaking news ticker">
            <div className="space-y-4">
              <Toggle checked={settings.tickerEnabled} onChange={(v) => set("tickerEnabled", v)} label="Show the breaking news ticker" description="Displays flagged stories beneath the header on every page." />
              <Field label="Ticker label">
                <Input value={str(settings.tickerLabel)} onChange={(e) => set("tickerLabel", e.target.value)} />
              </Field>
              <Field label="Scroll speed" hint="Higher values scroll faster (10–120).">
                <Input type="number" min={10} max={120} value={Number(settings.tickerSpeed)} onChange={(e) => set("tickerSpeed", Number(e.target.value))} />
              </Field>
              <p className="text-xs text-slate-500">
                Tick which stories are breaking in <strong>Articles</strong> (breaking badge) or on the <strong>Homepage</strong> editor.
              </p>
            </div>
          </Panel>
          <Panel title="Live broadcast">
            <div className="space-y-4">
              <Toggle checked={settings.liveStreamEnabled} onChange={(v) => set("liveStreamEnabled", v)} label="Enable the Watch Live area" description="When off, the live block is hidden site-wide." />
              <Field label="Live stream URL" hint="YouTube live link or any embeddable stream URL.">
                <Input value={str(settings.liveStreamUrl)} onChange={(e) => set("liveStreamUrl", e.target.value || null)} placeholder="https://www.youtube.com/watch?v=…" />
              </Field>
              <p className="text-xs text-slate-500">Leave empty to show the designed off-air placeholder instead of an empty player.</p>
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === "social" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Social profiles" description="Exact URLs shown in the header, social block and footer">
            <div className="space-y-4">
              <Field label="Facebook">
                <Input value={str(settings.facebookUrl)} onChange={(e) => set("facebookUrl", e.target.value || null)} placeholder="https://www.facebook.com/…" />
              </Field>
              <Field label="TikTok">
                <Input value={str(settings.tiktokUrl)} onChange={(e) => set("tiktokUrl", e.target.value || null)} placeholder="https://www.tiktok.com/@…" />
              </Field>
              <Field label="YouTube">
                <Input value={str(settings.youtubeUrl)} onChange={(e) => set("youtubeUrl", e.target.value || null)} placeholder="https://www.youtube.com/@… (add when available)" />
              </Field>
              <Field label="X / Twitter">
                <Input value={str(settings.xUrl)} onChange={(e) => set("xUrl", e.target.value || null)} />
              </Field>
              <Field label="Instagram">
                <Input value={str(settings.instagramUrl)} onChange={(e) => set("instagramUrl", e.target.value || null)} />
              </Field>
            </div>
          </Panel>
          <Panel title="Contact details" description="Published on the contact page and in the footer when filled in">
            <div className="space-y-4">
              <Field label="Contact email">
                <Input value={str(settings.contactEmail)} onChange={(e) => set("contactEmail", e.target.value || null)} />
              </Field>
              <Field label="Contact phone">
                <Input value={str(settings.contactPhone)} onChange={(e) => set("contactPhone", e.target.value || null)} />
              </Field>
              <Field label="Address">
                <Textarea value={str(settings.contactAddress)} onChange={(e) => set("contactAddress", e.target.value || null)} />
              </Field>
              <p className="text-xs text-slate-500">Only publish details you are authorised to share. Empty fields are hidden from the public site.</p>
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === "footer" ? (
        <div className="space-y-5">
          <Panel title="Footer description">
            <Field label="About blurb">
              <Textarea value={str(settings.footerAbout)} onChange={(e) => set("footerAbout", e.target.value)} />
            </Field>
            <div className="mt-4">
              <Field label="Copyright notice">
                <Input value={str(settings.copyright)} onChange={(e) => set("copyright", e.target.value)} />
              </Field>
            </div>
          </Panel>
          <Panel
            title="Footer columns"
            description="Link groups shown in the footer"
            action={
              <Button size="sm" variant="outline" onClick={() => set("footerColumns", [...footerColumns, { title: "New column", links: [] }])}>
                <Plus className="h-3.5 w-3.5" /> Add column
              </Button>
            }
          >
            <div className="space-y-4">
              {footerColumns.map((column, columnIndex) => (
                <div key={column.title + columnIndex} className="border border-slate-200 bg-slate-50/60 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={column.title}
                      onChange={(e) => set("footerColumns", footerColumns.map((c, i) => (i === columnIndex ? { ...c, title: e.target.value } : c)))}
                      className="max-w-xs font-medium"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        set(
                          "footerColumns",
                          footerColumns.map((c, i) => (i === columnIndex ? { ...c, links: [...c.links, { label: "New link", href: "/" }] } : c)),
                        )
                      }
                    >
                      <Plus className="h-3 w-3" /> Link
                    </Button>
                    <button
                      type="button"
                      aria-label="Remove column"
                      onClick={() => set("footerColumns", footerColumns.filter((_, i) => i !== columnIndex))}
                      className="ml-auto grid h-8 w-8 place-items-center border border-slate-300 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {column.links.map((link, linkIndex) => (
                      <li key={linkIndex} className="flex flex-wrap gap-2 sm:flex-nowrap">
                        <Input
                          value={link.label}
                          onChange={(e) =>
                            set(
                              "footerColumns",
                              footerColumns.map((c, i) =>
                                i === columnIndex ? { ...c, links: c.links.map((l, j) => (j === linkIndex ? { ...l, label: e.target.value } : l)) } : c,
                              ),
                            )
                          }
                          aria-label="Link label"
                        />
                        <Input
                          value={link.href}
                          onChange={(e) =>
                            set(
                              "footerColumns",
                              footerColumns.map((c, i) =>
                                i === columnIndex ? { ...c, links: c.links.map((l, j) => (j === linkIndex ? { ...l, href: e.target.value } : l)) } : c,
                              ),
                            )
                          }
                          aria-label="Link URL"
                        />
                        <button
                          type="button"
                          aria-label="Remove link"
                          onClick={() =>
                            set("footerColumns", footerColumns.map((c, i) => (i === columnIndex ? { ...c, links: c.links.filter((_, j) => j !== linkIndex) } : c)))
                          }
                          className="grid h-9 w-9 shrink-0 place-items-center border border-slate-300 text-slate-400 hover:text-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {footerColumns.length === 0 ? <p className="text-sm text-slate-500">No footer columns — the defaults are used.</p> : null}
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === "seo" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="SEO defaults">
            <div className="space-y-4">
              <Field label="Default meta title">
                <Input value={str(settings.defaultSeoTitle)} onChange={(e) => set("defaultSeoTitle", e.target.value || null)} />
              </Field>
              <Field label="Default meta description">
                <Textarea value={str(settings.defaultSeoDescription)} onChange={(e) => set("defaultSeoDescription", e.target.value || null)} />
              </Field>
              <Field label="Default social share image">
                <div className="flex gap-2">
                  <Input value={str(settings.defaultSocialImage)} onChange={(e) => set("defaultSocialImage", e.target.value || null)} />
                  <Button variant="outline" onClick={() => setPicker("socialImage")}>
                    Browse
                  </Button>
                </div>
              </Field>
              <p className="text-xs text-slate-500">
                Article pages override these with their own SEO title, description and share image. Sitemap: <code>/sitemap.xml</code> · Robots: <code>/robots.txt</code>
              </p>
            </div>
          </Panel>
          <Panel title="Newsletter">
            <div className="space-y-4">
              <Toggle checked={settings.newsletterEnabled} onChange={(v) => set("newsletterEnabled", v)} label="Accept newsletter subscriptions" description="Shows the signup form in the footer and homepage." />
              <Field label="Newsletter title">
                <Input value={str(settings.newsletterTitle)} onChange={(e) => set("newsletterTitle", e.target.value || null)} />
              </Field>
              <Field label="Newsletter description">
                <Textarea value={str(settings.newsletterDescription)} onChange={(e) => set("newsletterDescription", e.target.value || null)} />
              </Field>
              <p className="text-xs text-slate-500">Subscribers are stored with consent. Export them from Admin → Subscribers before sending any campaign.</p>
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === "pages" ? (
        <div className="space-y-5">
          <Panel title="About page" description="Rich text rendered at /about">
            <RichTextEditor value={str(settings.aboutContent)} onChange={(html) => set("aboutContent", html)} placeholder="Write about the newsroom…" />
          </Panel>
          <Panel title="Privacy policy" description="Rendered at /privacy">
            <RichTextEditor value={str(settings.privacyContent)} onChange={(html) => set("privacyContent", html)} placeholder="Privacy policy…" />
          </Panel>
          <Panel title="Terms & conditions" description="Rendered at /terms">
            <RichTextEditor value={str(settings.termsContent)} onChange={(html) => set("termsContent", html)} placeholder="Terms of use…" />
          </Panel>
          <Panel title="Advertising">
            <div className="space-y-4">
              <Toggle checked={settings.showAdSlots} onChange={(v) => set("showAdSlots", v)} label="Show advertising slots" description="Clearly separated from editorial content." />
              <Field label="Ad slot HTML" hint="Paste responsive ad code. Scripts and images are sanitised; iframes are limited to trusted embed hosts.">
                <Textarea value={str(settings.adSlotHtml)} onChange={(e) => set("adSlotHtml", e.target.value || null)} className="font-mono text-xs" />
              </Field>
            </div>
          </Panel>
          <Panel title="Analytics snippet" description="Injected before </body> — e.g. a privacy-friendly analytics tag">
            <Textarea value={str(settings.analyticsSnippet)} onChange={(e) => set("analyticsSnippet", e.target.value || null)} className="font-mono text-xs" placeholder="<script defer src='https://…'></script>" />
          </Panel>
        </div>
      ) : null}

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <p className="text-xs text-slate-500">Changes apply to the live website as soon as you save.</p>
        <Button onClick={save} loading={saving}>
          <Save className="h-4 w-4" /> Save all settings
        </Button>
      </div>

      <MediaPicker
        open={Boolean(picker)}
        onClose={() => setPicker(null)}
        title="Choose an image"
        onSelect={(item: MediaItem) => {
          if (picker === "logo") set("logoUrl", item.url);
          if (picker === "favicon") set("faviconUrl", item.url);
          if (picker === "socialImage") set("defaultSocialImage", item.url);
        }}
      />
    </div>
  );
}
