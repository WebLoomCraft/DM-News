import Link from "next/link";
import { ArrowUpRight, Facebook, Instagram, Youtube } from "lucide-react";
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
import { HeroMasthead } from "@/components/site/HeroMasthead";
import NewsletterForm from "@/components/site/NewsletterForm";
import { VideoCard, type VideoItem } from "@/components/site/VideoCard";
import { getBaseUrl } from "@/lib/site-url";
import { timeAgo } from "@/lib/utils";

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

function AdSlot({ settings }: { settings: SettingsRow; label: string }) {
  if (!settings.showAdSlots) return null;
  // Rendering an empty dashed box looked like a bug to readers. When no
  // creative is configured the slot collapses entirely.
  if (!settings.adSlotHtml) return null;
  return (
    <div className="my-10 border-y border-[#e3e7ee] bg-white/70 px-4 py-6 text-center">
      <p className="kicker mb-3 text-[0.6rem] text-[#9aa4b2]">Advertisement</p>
      <div dangerouslySetInnerHTML={{ __html: settings.adSlotHtml }} />
    </div>
  );
}

/**
 * BigRead — a single editorial split feature that breaks up the category
 * grids: one long-read panel plus a short "opinion & analysis" rail.
 */
function BigRead({ article, opinions }: { article: ArticleSummary; opinions: ArticleSummary[] }) {
  return (
    <section className="relative my-4 overflow-hidden bg-[var(--ink)] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(900px 420px at 12% 0%, color-mix(in srgb, var(--brand) 70%, transparent), transparent 62%), radial-gradient(700px 380px at 92% 100%, color-mix(in srgb, var(--accent) 34%, transparent), transparent 64%)",
        }}
      />
      <div className="container-site relative grid gap-8 py-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12">
        <div className="group min-w-0">
          <p className="kicker flex items-center gap-2 text-[0.6rem] text-white/55">
            <span aria-hidden className="inline-block h-[3px] w-5 bg-[var(--accent)]" />
            The big read
          </p>
          <Link href={`/news/${article.slug}`} className="mt-4 block overflow-hidden">
            {article.featuredImageUrl ? (
              <img
                src={article.featuredImageUrl}
                alt={article.imageAlt || article.title}
                width={1200}
                height={675}
                loading="lazy"
                decoding="async"
                className="img-zoom aspect-[16/9] w-full object-cover"
              />
            ) : null}
          </Link>
          <h2 className="headline mt-5 text-[clamp(1.5rem,3vw,2.4rem)] text-white">
            <Link href={`/news/${article.slug}`} className="transition-colors hover:text-[color-mix(in_srgb,var(--accent)_75%,white)]">
              {article.title}
            </Link>
          </h2>
          {article.excerpt ? (
            <p className="mt-3 max-w-2xl font-display text-[1.02rem] leading-relaxed text-white/65">{article.excerpt}</p>
          ) : null}
          <Link
            href={`/news/${article.slug}`}
            className="kicker mt-6 inline-flex items-center gap-2 border-b border-[var(--accent)] pb-1 text-[0.66rem] text-white transition-colors hover:text-[var(--accent)]"
          >
            Continue reading
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>

        <aside className="min-w-0 lg:border-l lg:border-white/12 lg:pl-10">
          <h3 className="section-title flex items-center gap-2 text-[0.95rem] text-white">
            <span aria-hidden className="inline-block h-[14px] w-[4px] bg-[var(--accent)]" />
            Analysis &amp; opinion
          </h3>
          <ol className="mt-4 divide-y divide-white/10">
            {opinions.map((item, i) => (
              <li key={item.id} className="group flex gap-4 py-4 first:pt-4">
                <span className="font-cond text-[1.5rem] font-bold leading-none text-white/20 transition-colors group-hover:text-[var(--accent)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h4 className="text-[1rem] font-semibold leading-snug text-white/90">
                    <Link href={`/news/${item.slug}`} className="hover:text-white">
                      <span className="line-clamp-2">{item.title}</span>
                    </Link>
                  </h4>
                  <p className="kicker mt-1.5 text-[0.54rem] text-white/40">
                    {item.category?.name ?? "News"}
                    {item.author?.name ? ` · ${item.author.name}` : ""}
                  </p>
                </div>
              </li>
            ))}
            {opinions.length === 0 ? <li className="py-4 text-sm text-white/45">No analysis pieces published yet.</li> : null}
          </ol>
          <Link
            href="/latest"
            className="kicker mt-2 inline-flex items-center gap-1.5 text-[0.62rem] text-white/60 hover:text-white"
          >
            All reporting <ArrowUpRight className="h-3 w-3" aria-hidden />
          </Link>
        </aside>
      </div>
    </section>
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

  // The masthead replaces the old "featured" block: it takes the lead story and
  // the next two so the top of the page is a single, confident statement.
  const featuredOnPage = enabled.some((s) => s.key === "featured");
  const mastheadLead = featuredOnPage ? featured[0] : latest[0];
  const mastheadSecondary = featuredOnPage ? featured.slice(1, 3) : latest.slice(1, 3);
  const latestGridSeed = featuredOnPage
    ? latest.filter((a) => !featured.slice(0, 3).some((f) => f.id === a.id)).slice(0, 9)
    : latest.slice(3, 12);

  const mastheadIds = new Set([mastheadLead?.id, ...mastheadSecondary.map((a) => a.id)].filter(Boolean) as number[]);
  const usedIds = new Set<number>([...mastheadIds, ...latestGridSeed.map((a) => a.id)]);
  const bigRead =
    trending.find((a) => !usedIds.has(a.id) && a.excerpt) ??
    featured.find((a) => !usedIds.has(a.id) && a.excerpt) ??
    latest.find((a) => !usedIds.has(a.id) && a.excerpt);
  if (bigRead) usedIds.add(bigRead.id);
  const opinions = trending.filter((a) => !usedIds.has(a.id)).slice(0, 3);

  const dataByKey = new Map<string, SectionData>();
  dataByKey.set("featured", { articles: featured });
  dataByKey.set("latest", { articles: latestGridSeed.length ? latestGridSeed : latest, total: latestTotal });
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
      // Rendered by the HeroMasthead at the top of the page; the "Most read"
      // rail moves into its own strip below.
      return (
        <section key={section.id} className="container-site pt-9">
          <div className="grid gap-5 border-y border-[#e3e7ee] bg-white/60 py-4 md:grid-cols-[auto_1fr] md:items-center">
            <h2 className="section-title flex items-center gap-2 px-1 text-[0.9rem] text-[var(--ink)]">
              <span aria-hidden className="inline-block h-[14px] w-[4px]" style={{ background: "var(--accent)" }} />
              Most read today
            </h2>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5">
              {trending.map((article, index) => (
                <Link
                  key={article.id}
                  href={`/news/${article.slug}`}
                  className="group flex min-w-0 items-baseline gap-2 text-[0.86rem] text-[#2c3644] hover:text-[var(--accent)]"
                >
                  <span className="font-cond text-[0.78rem] font-bold text-[var(--accent)]">{String(index + 1).padStart(2, "0")}</span>
                  <span className="line-clamp-1 max-w-[34ch] font-medium">{article.title}</span>
                </Link>
              ))}
            </div>
          </div>
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
      const heading = <SectionHeading title={section.title} href={`/category/${slug}`} />;

      if (items.length === 0) {
        return (
          <section key={section.id} className="container-site py-8">
            {heading}
            <EmptyState title={`No stories in ${section.title} yet`} hint="Assign an article to this category from the article editor and it will appear here." />
          </section>
        );
      }

      return (
        <section key={section.id} className="container-site py-9">
          {heading}
          {isLeadLayout ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <ArticleCard article={lead!} variant="overlay" className="min-h-[360px] lg:min-h-[420px]" />
              <ol className="flex flex-col divide-y divide-[#e7eaf0] border-t border-[#e7eaf0] lg:border-t-0">
                {rest.map((article, i) => (
                  <li key={article.id} className="group flex min-w-0 gap-4 py-3.5 first:pt-0">
                    <span className="font-cond text-[1.35rem] font-bold leading-none text-[#cfd6e1] transition-colors group-hover:text-[var(--accent)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h3 className="headline text-[1.02rem] leading-snug">
                        <Link href={`/news/${article.slug}`} className="line-clamp-2 hover:text-[var(--accent)]">
                          {article.title}
                        </Link>
                      </h3>
                      <p className="kicker mt-1.5 text-[0.55rem] text-[#9aa4b2]">
                        {article.publishedAt ? timeAgo(article.publishedAt) : ""}
                        {article.author?.name ? ` · ${article.author.name}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
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
      // The footer renders the newsletter block on every page, so the homepage
      // section would be a duplicate. Keep the section configurable but quiet.
      return null;
    }

    if (section.key === "newsletter-legacy") {
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
      <HeroMasthead
        settings={settings}
        lead={mastheadLead}
        secondary={mastheadSecondary}
        liveHref={settings.liveStreamUrl && settings.liveStreamEnabled ? "/live" : null}
        stats={{ published: latestTotal || latest.length + featured.length, sections: categorySections.length || 7 }}
      />
      {enabled.map((section, index) => (
        <div key={section.id}>
          {renderSection(section, index)}
          {index === 1 ? <div className="container-site"><AdSlot settings={settings} label="Homepage leaderboard" /></div> : null}
          {index === 3 && bigRead ? <BigRead article={bigRead} opinions={opinions} /> : null}
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
