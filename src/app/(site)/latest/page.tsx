import type { Metadata } from "next";
import { countLatestArticles, getLatestArticles, getTrendingArticles } from "@/lib/queries";
import { ArticleListItem } from "@/components/site/ArticleCard";
import { SectionHeading } from "@/components/site/SectionHeading";
import LatestNewsGrid from "@/components/site/LatestNewsGrid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Latest News",
  description: "Every story published by the DM News Network newsroom, newest first.",
};

export default async function LatestPage() {
  const [initial, total, trending] = await Promise.all([
    getLatestArticles({ limit: 12 }),
    countLatestArticles({}),
    getTrendingArticles(5),
  ]);
  const remaining = Math.max(0, total - 12);

  return (
    <div className="container-site grid gap-10 py-10 lg:grid-cols-[1.75fr_1fr]">
      <div>
        <header className="mb-8 border-b-2 border-[var(--ink)] pb-4">
          <p className="kicker text-[var(--accent)]">Live wire</p>
          <h1 className="headline mt-1 text-[clamp(2rem,5vw,2.8rem)]">Latest News</h1>
          <p className="mt-2 text-sm text-[#5b6779]">{total} published stories, newest first.</p>
        </header>

        <div className="flex flex-col gap-6">
          {initial.slice(0, 6).map((article) => (
            <ArticleListItem key={article.id} article={article} />
          ))}
        </div>

        {total > 6 ? (
          <div className="mt-12">
            <SectionHeading title="More from the archive" />
            <LatestNewsGrid initial={[]} total={total} offset={6} perPage={9} />
          </div>
        ) : null}

        {initial.length === 0 ? (
          <p className="border border-dashed border-[#d5dae2] bg-white px-6 py-10 text-center text-sm text-[#5b6779]">
            Nothing has been published yet. Publish an article from the newsroom dashboard and it appears here instantly.
          </p>
        ) : null}
      </div>

      <aside className="space-y-8">
        <div className="border-t-2 border-[var(--ink)] bg-white p-5">
          <h2 className="section-title text-[0.95rem]">Most read</h2>
          <div className="mt-3">
            {trending.map((article) => (
              <div key={article.id} className="border-b border-[#eef0f4] py-2.5 last:border-0">
                <a href={`/news/${article.slug}`} className="text-sm font-medium leading-snug hover:text-[var(--accent)]">
                  {article.title}
                </a>
              </div>
            ))}
            {trending.length === 0 ? <p className="text-sm text-[#8b95a3]">No readership data yet.</p> : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
