"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { ArticleSummary } from "@/lib/queries";
import { ArticleCard } from "./ArticleCard";

/**
 * Grid of published stories with a working "Load more" button.
 * `offset` is the number of stories already rendered by the server elsewhere on
 * the page, so pagination continues exactly where the server render stopped.
 */
export default function LatestNewsGrid({
  initial,
  total,
  perPage = 9,
  category,
  offset = 0,
}: {
  initial: ArticleSummary[];
  total: number;
  perPage?: number;
  category?: string;
  offset?: number;
}) {
  const [items, setItems] = useState<ArticleSummary[]>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rendered = offset + items.length;
  const hasMore = rendered < total;

  const loadMore = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ offset: String(rendered), perPage: String(perPage) });
      if (category) params.set("category", category);
      const res = await fetch(`/api/public/articles?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load more stories");
      const incoming = (data.items as ArticleSummary[]) || [];
      if (!incoming.length) {
        setError("No further stories to load.");
        return;
      }
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...incoming.filter((i) => !seen.has(i.id))];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load more stories");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {items.length === 0 && !hasMore ? (
        <p className="border border-dashed border-[#d5dae2] bg-white px-6 py-10 text-center text-sm text-[#5b6779]">
          No stories have been published here yet.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((article) => (
            <ArticleCard key={article.id} article={article} variant="grid" />
          ))}
        </div>
      )}

      {error ? <p className="mt-4 text-center text-sm text-red-700">{error}</p> : null}

      {hasMore ? (
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="kicker inline-flex items-center gap-2 border border-[var(--ink)] px-7 py-3 text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-white disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {loading ? "Loading…" : "Load more stories"}
          </button>
          <span className="text-[0.7rem] uppercase tracking-[0.12em] text-[#9aa4b2]">
            Showing {rendered} of {total}
          </span>
        </div>
      ) : items.length > 0 ? (
        <p className="mt-8 text-center text-[0.75rem] uppercase tracking-[0.14em] text-[#9aa4b2]">You have reached the end of the feed</p>
      ) : null}
    </div>
  );
}
