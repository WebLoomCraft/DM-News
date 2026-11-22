import Link from "next/link";
import { Facebook, Instagram, Youtube } from "lucide-react";
import { getSettings } from "@/lib/settings";
import {
  countLatestArticles,
  getFeaturedArticles,
  getHomepageSections,
  getLatestArticles,
  getTrendingArticles,
  getVideoItems,
  recordDailyStat,
  type ArticleSummary,
} from "@/lib/queries";
import type { HomepageSectionRow, SettingsRow } from "@/db/schema";
import { ArticleCard, ArticleListItem } from "@/components/site/ArticleCard";
import { EmptyState, SectionHeading } from "@/components/site/SectionHeading";
import LatestNewsGrid from "@/components/site/LatestNewsGrid";
import LivePanel from "@/components/site/LivePanel";
import NewsletterForm from "@/components/site/NewsletterForm";
import { VideoCard, type VideoItem } from "@/components/site/VideoCard";
import { getBaseUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

type SectionData = {
  articles?: ArticleSummary[];
  videos?: VideoItem[];
  total?: number;
  categorySlug?: string;
  categoryName?: string;
};

function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .6.04.88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 21.54a6.34 6.34 0 0 0 10.86-4.43V9.66a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-1.09z" />
    </svg>
  );
}

function AdSlot({ settings, label }: { settings: SettingsRow; label: string }) {
  if (!settings.showAdSlots) return null;
  if (!settings.adSlotHtml) {
    return (
      <div className="my-10 border border-dashed border-[#d5dae2] bg-white/60 px-4 py-6 text-center">
        <p className="kicker text-[0.6rem] text-[#9aa4b2]">Advertisement</p>
        <p className="mt-1 text-xs text-[#9aa4b2]">{label} — add creative from Admin → Settings → Advertising.</p>
      </div>
    );
  }
  return (
    <div className="my-10 border-y border-[#e3e7ee] bg-white/70 px-4 py-6 text-center">
      <p className="kicker mb-3 text-[0.6rem] text-[#9aa4b2]">Advertisement</p>
      <div dangerouslySetInnerHTML={{ __html: settings.adSlotHtml }} />
    </div>
  );
}

export default async function HomePage() {
  const [settings, sections, featured, latest, latestTotal, trending, videos, baseUrl] = await Promise.all([
    getSettings(),
    getHomepageSections(),
    getFeaturedArticles(4),
    getLatestArticles({ limit: 9 }),
    countLatestArticles({}),
    getTrendingArticles(5),
    getVideoItems(8),
    getBaseUrl(),
  ]);

  recordDailyStat("pageviews").catch(() => undefined);

  const enabled = sections.filter((s) => s.enabled).sort((a, b) => a.orderIndex - b.orderIndex);
  const categorySections = enabled.filter((s) => s.key.startsWith("category:"));

  const categoryData = await Promise.all(
    categorySections.map(async (section) => {
      const items = section.categoryId
        ? await getLatestArticles({ categoryId: section.categoryId, limit: section.limit || 4 })
        : [];
      return { section, items };
    }),
  );

  const dataByKey = new Map<string, SectionData>();
  dataByKey.set("featured", { articles: featured });
  dataByKey.set("latest", { articles: latest, total: latestTotal });
  dataByKey.set("videos", { videos: videos.slice(0, 4) as VideoItem[] });
  for (const { section, items } of categoryData) {
    const slug = section.key.replace("category:", "");
    dataByKey.set(section.key, { articles: items, categorySlug: slug });
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsMediaOrganization",
        name: settings.siteName,
        url: baseUrl,
        logo: settings.logoUrl || `${baseUrl}/icon.svg`,
        description: settings.siteDescription,
        sameAs: [settings.facebookUrl, settings.tiktokUrl, settings.youtubeUrl].filter(Boolean),
      },
      {
        "@type": "WebSite",
        name: settings.siteName,
        url: baseUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${baseUrl}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  const renderSection = (section: HomepageSectionRow, index: number) => {
    const data = dataByKey.get(section.key);

    if (section.key === "featured") {
      const [lead, ...rest] = data?.articles ?? [];
      return (
        <section key={section.id} className="container-site pt-8">
          <SectionHeading title={section.title} href="/latest" linkLabel="Latest news" />
          {lead ? (
            <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
              <ArticleCard article={lead} variant="hero" priority />
              <div className="flex flex-col">
                <div className="flex flex-col divide-y divide-[#e7eaf0]">
                  {rest.slice(0, 3).map((article) => (
                    <ArticleCard key={article.id} article={article} variant="row" className="border-0 py-4 first:pt-0" />
                  ))}
                </div>
                <div className="mt-6 border-t-2 border-[var(--ink)] pt-4">
                  <h3 className="section-title mb-2 text-[0.95rem] text-[var(--ink)]">Most read</h3>
                  <div>
                    {trending.map((article) => (
                      <ArticleCard key={article.id} article={article} variant="compact" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No featured stories yet"
              hint="Publish an article and toggle “Featured story” in the article editor — it appears here instantly."
            />
          )}
        </section>
      );
    }

    if (section.key === "latest") {
      return (
        <section key={section.id} className="container-site py-12">
          <SectionHeading title={section.title} href="/latest" />
          <LatestNewsGrid initial={data?.articles ?? []} total={data?.total ?? 0} perPage={9} />
        </section>
      );
    }

    if (section.key.startsWith("category:")) {
      const items = data?.articles ?? [];
      const slug = section.key.replace("category:", "");
      const [lead, ...rest] = items;
      const isLeadLayout = (section.limit || 4) >= 4 && index % 2 === 0;
      return (
        <section key={section.id} className="container-site py-8">
          <SectionHeading title={section.title} href={`/category/${slug}`} />
          {items.length === 0 ? (
            <EmptyState title={`No stories in ${section.title} yet`} hint="Assign an article to this category from the article editor and it will appear here." />
          ) : isLeadLayout ? (
            <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
              <ArticleCard article={lead!} variant="overlay" className="min-h-[340px]" />
              <div className="flex flex-col divide-y divide-[#e7eaf0]">
                {rest.map((article) => (
                  <ArticleCard key={article.id} article={article} variant="row" className="border-0 py-4 first:pt-0" />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((article) => (
                <ArticleCard key={article.id} article={article} variant="grid" />
              ))}
            </div>
          )}
        </section>
      );
    }

    if (section.key === "videos") {
      const items = data?.videos ?? [];
      return (
        <section key={section.id} className="bg-[var(--ink)] py-12">
          <div className="container-site">
            <SectionHeading title={section.title} href="/videos" tone="dark" />
            {items.length === 0 ? (
              <p className="border border-dashed border-white/20 px-6 py-10 text-center text-sm text-white/55">
                No video reports published yet. Add YouTube videos or clips from Admin → Videos.
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((video) => (
                  <VideoCard key={video.id} video={video} className="border-white/10 bg-white/[0.04] text-white" />
                ))}
              </div>
            )}
          </div>
        </section>
      );
    }

    if (section.key === "live") {
      if (!settings.liveStreamEnabled) return null;
      return (
        <section key={section.id} className="container-site py-12">
          <SectionHeading title={section.title} href="/live" linkLabel="Open broadcast page" />
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="border border-[#e3e7ee] bg-white p-2">
              <LivePanel streamUrl={settings.liveStreamUrl} label={settings.watchLiveLabel} />
            </div>
            <div className="border border-[#e3e7ee] bg-white p-5">
              <h3 className="section-title text-[0.95rem] text-[var(--ink)]">Latest video reports</h3>
              <div className="mt-4 flex flex-col divide-y divide-[#eef0f4]">
                {videos.slice(0, 4).map((video) => (
                  <div key={video.id} className="py-3 first:pt-0">
                    <Link href="/videos" className="group flex gap-3">
                      <span className="relative h-16 w-24 shrink-0 overflow-hidden bg-[#0d1a2d]">
                        {video.thumbnailUrl ? (
                          <img src={video.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-2 block text-[0.9rem] font-semibold leading-snug group-hover:text-[var(--accent)]">
                          {video.title}
                        </span>
                        <span className="kicker mt-1 block text-[0.6rem] text-[#8b95a3]">{video.kind}</span>
                      </span>
                    </Link>
                  </div>
                ))}
                {videos.length === 0 ? (
                  <p className="py-3 text-sm text-[#5b6779]">No video reports published yet.</p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (section.key === "social") {
      const cards = [
        { name: "Facebook", handle: "DM News Network", href: settings.facebookUrl, Icon: Facebook, tint: "#1877F2" },
        { name: "TikTok", handle: "@dmnewsnetwork", href: settings.tiktokUrl, Icon: TikTokGlyph, tint: "#010101" },
        { name: "YouTube", handle: "Official channel", href: settings.youtubeUrl, Icon: Youtube, tint: "#FF0000" },
        { name: "Instagram", handle: "DM News Network", href: settings.instagramUrl, Icon: Instagram, tint: "#C13584" },
      ].filter((c) => Boolean(c.href));

      if (!cards.length) return null;
      return (
        <section key={section.id} className="container-site py-10">
          <SectionHeading title={section.title} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map(({ name, handle, href, Icon, tint }) => (
              <a
                key={name}
                href={href!}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="group flex items-center gap-4 border border-[#e3e7ee] bg-white p-5 card-hover"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center text-white" style={{ background: tint }}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-cond text-lg font-semibold uppercase tracking-wide text-[var(--ink)]">{name}</span>
                  <span className="block truncate text-sm text-[#5b6779]">{handle}</span>
                </span>
                <span className="kicker ml-auto shrink-0 text-[0.62rem] text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100">
                  Follow
                </span>
              </a>
            ))}
          </div>
        </section>
      );
    }

    if (section.key === "newsletter") {
      if (!settings.newsletterEnabled) return null;
      return (
        <section key={section.id} className="container-site py-10">
          <div className="grid gap-6 border border-[#e3e7ee] bg-white p-6 sm:p-8 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <p className="kicker text-[var(--accent)]">Newsletter</p>
              <h2 className="headline mt-2 text-2xl sm:text-3xl">{settings.newsletterTitle}</h2>
              <p className="mt-2 max-w-lg text-sm text-[#5b6779]">{settings.newsletterDescription}</p>
            </div>
            <NewsletterForm variant="light" />
          </div>
        </section>
      );
    }

    return null;
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {enabled.map((section, index) => (
        <div key={section.id}>
          {renderSection(section, index)}
          {index === 1 ? <div className="container-site"><AdSlot settings={settings} label="Homepage leaderboard" /></div> : null}
        </div>
      ))}
      {enabled.length === 0 ? (
        <section className="container-site py-16">
          <EmptyState
            title="The homepage is empty"
            hint="Enable sections in Admin → Homepage to build your front page, then publish your first article."
          />
        </section>
      ) : null}
    </>
  );
}
