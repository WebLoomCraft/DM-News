import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getBreakingArticles, getLatestArticles } from "@/lib/queries";
import LivePanel from "@/components/site/LivePanel";
import { SectionHeading } from "@/components/site/SectionHeading";
import { ArticleCard } from "@/components/site/ArticleCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Watch Live",
  description: "Watch the DM News Network live broadcast stream.",
};

export default async function LivePage() {
  const [settings, breaking, latest] = await Promise.all([
    getSettings(),
    getBreakingArticles(6),
    getLatestArticles({ limit: 4 }),
  ]);

  return (
    <div className="bg-[var(--ink)] pb-14">
      <div className="container-site py-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 bg-[var(--accent)] px-3 py-1.5">
            <span aria-hidden className="live-dot inline-block h-2 w-2 rounded-full bg-white" />
            <span className="kicker text-white">{settings.liveStreamUrl ? "Live" : "Off air"}</span>
          </span>
          <h1 className="headline text-2xl text-white sm:text-3xl">{settings.watchLiveLabel}</h1>
        </div>
      </div>

      <div className="container-site">
        <div className="border border-white/10 bg-black p-2">
          <LivePanel streamUrl={settings.liveStreamUrl} label={settings.watchLiveLabel} />
        </div>
        <p className="mt-3 text-xs text-white/45">
          {settings.liveStreamUrl
            ? "The broadcast player loads on demand to keep the page fast."
            : "The stream address can be updated at any time from Admin → Settings → Broadcast."}
        </p>
      </div>

      {breaking.length ? (
        <div className="container-site mt-12">
          <SectionHeading title="Breaking now" tone="dark" href="/latest" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {breaking.map((article) => (
              <div key={article.id} className="border border-white/10 bg-white/[0.04] p-4">
                <Link href={`/news/${article.slug}`} className="headline text-lg text-white hover:text-[var(--accent)]">
                  {article.title}
                </Link>
                <p className="mt-2 line-clamp-2 text-sm text-white/55">{article.excerpt}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="container-site mt-12">
        <SectionHeading title="Latest stories" tone="dark" href="/latest" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {latest.map((article) => (
            <ArticleCard key={article.id} article={article} variant="grid" />
          ))}
        </div>
      </div>
    </div>
  );
}
