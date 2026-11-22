"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3, FileText, FolderTree, ImageIcon, Mail, MessageSquare, Plus, Users } from "lucide-react";
import { api } from "@/lib/admin-api";
import { formatDate, timeAgo } from "@/lib/utils";
import { Badge, Button, EmptyRow, ErrorNote, Panel, Spinner, statusTone } from "@/components/admin/ui";

type Stats = {
  totals: {
    articles: number;
    published: number;
    drafts: number;
    scheduled: number;
    archived: number;
    categories: number;
    media: number;
    tags: number;
    authors: number;
    subscribers: number;
    unreadMessages: number;
  };
  recent: Array<{
    id: number;
    title: string;
    slug: string;
    status: string;
    views: number;
    updatedAt: string;
    createdAt: string;
    publishedAt: string | null;
    categoryName: string | null;
  }>;
  traffic: Array<{ day: string; pageviews: number; articleViews: number }>;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setStats(await api<Stats>("/api/stats"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Spinner label="Loading newsroom data…" />;
  if (error) return <ErrorNote message={error} onRetry={load} />;
  if (!stats) return null;

  const cards = [
    { label: "Total articles", value: stats.totals.articles, icon: FileText, href: "/admin/articles" },
    { label: "Published", value: stats.totals.published, icon: FileText, href: "/admin/articles?status=published" },
    { label: "Drafts", value: stats.totals.drafts, icon: FileText, href: "/admin/articles?status=draft" },
    { label: "Scheduled", value: stats.totals.scheduled, icon: FileText, href: "/admin/articles?status=scheduled" },
    { label: "Categories", value: stats.totals.categories, icon: FolderTree, href: "/admin/categories" },
    { label: "Media files", value: stats.totals.media, icon: ImageIcon, href: "/admin/media" },
    { label: "Subscribers", value: stats.totals.subscribers, icon: Mail, href: "/admin/subscribers" },
  ];

  const maxTraffic = Math.max(1, ...stats.traffic.map((t) => t.pageviews + t.articleViews));
  const traffic = [...stats.traffic].reverse();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Newsroom overview</h2>
          <p className="mt-1 text-sm text-slate-500">Everything published here updates the public website immediately.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/articles/new">
            <Button>
              <Plus className="h-4 w-4" /> New article
            </Button>
          </Link>
          <Link href="/admin/media">
            <Button variant="outline">Upload media</Button>
          </Link>
          <Link href="/admin/settings">
            <Button variant="outline">Site settings</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="group border border-slate-200 bg-white p-4 transition-colors hover:border-[#0b1b33]">
            <div className="flex items-start justify-between">
              <span className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-slate-500">{card.label}</span>
              <card.icon className="h-4 w-4 text-slate-300 group-hover:text-[var(--accent)]" />
            </div>
            <p className="mt-2 font-display text-3xl font-bold text-slate-900">{card.value.toLocaleString()}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Panel
          title="Recent activity"
          description="Latest created and updated articles"
          action={
            <Link href="/admin/articles" className="text-xs font-semibold text-[#0b1b33] underline">
              View all
            </Link>
          }
        >
          {stats.recent.length === 0 ? (
            <EmptyRow
              title="No articles yet"
              hint="Create your first story — it appears on the homepage the moment you publish it."
              action={
                <Link href="/admin/articles/new">
                  <Button size="sm">Write an article</Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto admin-scroll">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[0.65rem] uppercase tracking-[0.1em] text-slate-400">
                    <th className="py-2 pr-3 font-semibold">Headline</th>
                    <th className="py-2 pr-3 font-semibold">Section</th>
                    <th className="py-2 pr-3 font-semibold">Status</th>
                    <th className="py-2 pr-3 font-semibold">Views</th>
                    <th className="py-2 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-0">
                      <td className="max-w-[280px] py-2.5 pr-3">
                        <Link href={`/admin/articles/${item.id}`} className="block truncate font-medium text-slate-800 hover:text-[var(--accent)]">
                          {item.title}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-500">{item.categoryName || "—"}</td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-500">{item.views.toLocaleString()}</td>
                      <td className="py-2.5 text-slate-500">{timeAgo(item.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Readership" description="First-party pageviews recorded by this site (no fake metrics)">
            {stats.traffic.length === 0 ? (
              <p className="text-sm text-slate-500">
                No traffic recorded yet. Pageviews are counted as readers visit the homepage and article pages.
              </p>
            ) : (
              <>
                <div className="flex h-28 items-end gap-1.5">
                  {traffic.map((day) => (
                    <div key={day.day} className="group flex flex-1 flex-col items-center justify-end gap-1">
                      <div
                        className="w-full bg-[#0b1b33] transition-colors group-hover:bg-[var(--accent)]"
                        style={{ height: `${Math.max(4, ((day.pageviews + day.articleViews) / maxTraffic) * 100)}%` }}
                        title={`${day.day}: ${day.pageviews} pageviews, ${day.articleViews} article views`}
                      />
                      <span className="text-[0.55rem] text-slate-400">{day.day.slice(8)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.1em] text-slate-400">Pageviews</p>
                    <p className="font-display text-xl font-bold text-slate-900">
                      {stats.traffic.reduce((sum, d) => sum + d.pageviews, 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.1em] text-slate-400">Article views</p>
                    <p className="font-display text-xl font-bold text-slate-900">
                      {stats.traffic.reduce((sum, d) => sum + d.articleViews, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[0.65rem] text-slate-400">
                  <BarChart3 className="h-3 w-3" /> Last {stats.traffic.length} days
                </p>
              </>
            )}
          </Panel>

          <Panel title="Newsroom queue">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="flex items-center gap-2 text-slate-600">
                  <MessageSquare className="h-4 w-4 text-slate-400" /> Unread contact messages
                </span>
                <Link href="/admin/messages" className="font-semibold text-[#0b1b33] hover:text-[var(--accent)]">
                  {stats.totals.unreadMessages}
                </Link>
              </li>
              <li className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="flex items-center gap-2 text-slate-600">
                  <Users className="h-4 w-4 text-slate-400" /> Author profiles
                </span>
                <Link href="/admin/authors" className="font-semibold text-[#0b1b33] hover:text-[var(--accent)]">
                  {stats.totals.authors}
                </Link>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-4 w-4 text-slate-400" /> Newsletter subscribers
                </span>
                <Link href="/admin/subscribers" className="font-semibold text-[#0b1b33] hover:text-[var(--accent)]">
                  {stats.totals.subscribers}
                </Link>
              </li>
            </ul>
          </Panel>

          <Panel title="Today">
            <p className="text-sm text-slate-600">{formatDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            <p className="mt-2 text-xs text-slate-500">
              Scheduled stories publish automatically when their timestamp passes and a reader requests the page.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
