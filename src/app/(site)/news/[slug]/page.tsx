import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, Eye } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getBaseUrl } from "@/lib/site-url";
import {
  getAdjacentArticles,
  getArticleBySlug,
  getLatestArticles,
  getRelatedArticles,
  recordArticleView,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { canEditRecord } from "@/lib/permissions";
import { sanitizeRichText } from "@/lib/sanitize";
import { formatDate, formatDateTime, readingTime } from "@/lib/utils";
import { ArticleCard, CategoryBadge } from "@/components/site/ArticleCard";
import { SectionHeading } from "@/components/site/SectionHeading";
import ShareButtons from "@/components/site/ShareButtons";
import NewsletterForm from "@/components/site/NewsletterForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [article, settings, baseUrl] = await Promise.all([getArticleBySlug(slug), getSettings(), getBaseUrl()]);
  if (!article) return { title: "Story not found" };

  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.excerpt || settings.siteDescription || "";
  const url = `${baseUrl}/news/${article.slug}`;
  const image = article.socialImageUrl || article.featuredImageUrl || settings.defaultSocialImage || undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: settings.siteName,
      publishedTime: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
      modifiedTime: new Date(article.updatedAt).toISOString(),
      authors: article.author?.name ? [article.author.name] : undefined,
      images: image ? [{ url: image, width: 1200, height: 675, alt: article.imageAlt || article.title }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const [article, settings, user, baseUrl] = await Promise.all([
    getArticleBySlug(slug),
    getSettings(),
    getCurrentUser(),
    getBaseUrl(),
  ]);

  if (!article) notFound();

  const isLive = article.status === "published" && (!article.publishedAt || article.publishedAt <= new Date());
  if (!isLive) {
    // Unpublished stories are only reachable by newsroom staff who may edit them.
    if (!user || !canEditRecord(user, article.createdById)) notFound();
  }

  recordArticleView(article.id).catch(() => undefined);

  const [related, adjacent, moreFromDesk] = await Promise.all([
    getRelatedArticles({ id: article.id, categoryId: article.categoryId }, 4),
    getAdjacentArticles({ id: article.id, publishedAt: article.publishedAt }),
    getLatestArticles({ limit: 4, excludeIds: [article.id, ...([] as number[])] }),
  ]);

  const canonical = `${baseUrl}/news/${article.slug}`;
  const bodyHtml = sanitizeRichText(article.content);
  const minutes = readingTime(article.content);

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      ...(article.category
        ? [{ "@type": "ListItem", position: 2, name: article.category.name, item: `${baseUrl}/category/${article.category.slug}` }]
        : []),
      { "@type": "ListItem", position: article.category ? 3 : 2, name: article.title, item: canonical },
    ],
  };

  const newsArticleLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.seoDescription || article.excerpt || undefined,
    image: article.socialImageUrl || article.featuredImageUrl || undefined,
    datePublished: article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date(article.createdAt).toISOString(),
    dateModified: new Date(article.updatedAt).toISOString(),
    articleSection: article.category?.name,
    keywords: article.tags.map((t) => t.name).join(", ") || undefined,
    wordCount: article.content.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    author: article.author
      ? { "@type": "Organization", name: article.author.name, url: `${baseUrl}/author/${article.author.slug}` }
      : { "@type": "Organization", name: settings.siteName },
    publisher: {
      "@type": "NewsMediaOrganization",
      name: settings.siteName,
      logo: { "@type": "ImageObject", url: settings.logoUrl || `${baseUrl}/icon.svg` },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleLd) }} />

      {!isLive ? (
        <div className="bg-[#fff4e5] text-[#8a5300]">
          <div className="container-site flex flex-wrap items-center justify-between gap-3 border-b border-[#f0d9b5] py-2.5 text-xs">
            <span className="kicker">Preview mode — this story is {article.status} and not visible to the public</span>
            <Link href="/admin/articles" className="underline hover:no-underline">
              Back to newsroom
            </Link>
          </div>
        </div>
      ) : null}

      <div className="container-site py-5">
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-[0.72rem] uppercase tracking-[0.1em] text-[#8b95a3]">
          <Link href="/" className="hover:text-[var(--accent)]">
            Home
          </Link>
          {article.category ? (
            <>
              <span aria-hidden>/</span>
              <Link href={`/category/${article.category.slug}`} className="hover:text-[var(--accent)]">
                {article.category.name}
              </Link>
            </>
          ) : null}
          <span aria-hidden>/</span>
          <span className="truncate text-[#5b6779] normal-case tracking-normal">Article</span>
        </nav>

        <article className="mx-auto max-w-3xl">
          <header className="border-b border-[#e3e7ee] pb-6">
            <div className="flex flex-wrap items-center gap-3">
              <CategoryBadge
                name={article.category?.name}
                slug={article.category?.slug}
                color={article.category?.color}
                className="text-[0.72rem]"
              />
              {article.isBreaking ? <span className="kicker bg-[var(--accent)] px-2 py-1 text-white">Breaking news</span> : null}
            </div>
            <h1 className="headline mt-3 text-[clamp(1.9rem,4.6vw,3rem)]">{article.title}</h1>
            {article.excerpt ? (
              <p className="mt-4 font-display text-[1.15rem] leading-relaxed text-[#414c5b]">{article.excerpt}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.78rem] text-[#5b6779]">
              {article.author ? (
                <Link href={`/author/${article.author.slug}`} className="flex items-center gap-2 font-semibold text-[var(--ink)] hover:text-[var(--accent)]">
                  {article.author.photoUrl ? (
                    <img src={article.author.photoUrl} alt={article.author.name} className="h-8 w-8 rounded-full object-cover" width={32} height={32} />
                  ) : (
                    <span className="grid h-8 w-8 place-items-center bg-[var(--brand)] font-cond text-xs text-white">DM</span>
                  )}
                  <span>
                    {article.author.name}
                    {article.author.designation ? (
                      <span className="block text-[0.68rem] font-normal uppercase tracking-[0.1em] text-[#8b95a3]">{article.author.designation}</span>
                    ) : null}
                  </span>
                </Link>
              ) : null}
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden /> {minutes} min read
              </span>
              <time dateTime={article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined}>
                {formatDateTime(article.publishedAt || article.createdAt)}
              </time>
              {article.updatedAt && article.publishedAt && article.updatedAt.getTime() - article.publishedAt.getTime() > 60_000 ? (
                <span className="text-[#8b95a3]">Updated {formatDateTime(article.updatedAt)}</span>
              ) : null}
              <span className="flex items-center gap-1.5 text-[#8b95a3]">
                <Eye className="h-3.5 w-3.5" aria-hidden /> {article.views.toLocaleString()} views
              </span>
            </div>
          </header>

          {article.featuredImageUrl ? (
            <figure className="mt-7">
              <img
                src={article.featuredImageUrl}
                alt={article.imageAlt || article.title}
                width={1200}
                height={675}
                className="w-full bg-[#e9ecf1] object-cover"
                fetchPriority="high"
                decoding="async"
              />
              {article.imageCaption ? (
                <figcaption className="mt-2 border-l-2 border-[var(--accent)] pl-3 text-[0.8rem] text-[#6b7686]">
                  {article.imageCaption}
                </figcaption>
              ) : null}
            </figure>
          ) : null}

          <div className="mt-6">
            <ShareButtons url={canonical} title={article.title} />
          </div>

          <div className="article-body mt-8" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

          {article.tags.length ? (
            <div className="mt-9 flex flex-wrap items-center gap-2 border-t border-[#e3e7ee] pt-6">
              <span className="kicker text-[#8b95a3]">Tags</span>
              {article.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.slug}`}
                  className="border border-[#dfe4ec] bg-white px-3 py-1 text-xs text-[#4a5563] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          ) : null}

          {settings.showAdSlots ? (
            <div className="my-9 border-y border-[#e3e7ee] py-5 text-center">
              <p className="kicker mb-2 text-[0.6rem] text-[#9aa4b2]">Advertisement</p>
              {settings.adSlotHtml ? (
                <div dangerouslySetInnerHTML={{ __html: settings.adSlotHtml }} />
              ) : (
                <p className="text-xs text-[#9aa4b2]">In-article ad slot — configure creative in Admin → Settings.</p>
              )}
            </div>
          ) : null}

          <div className="mt-9 border border-[#e3e7ee] bg-white p-5">
            <ShareButtons url={canonical} title={article.title} />
          </div>

          {article.author ? (
            <aside className="mt-9 flex gap-4 border border-[#e3e7ee] bg-white p-5">
              {article.author.photoUrl ? (
                <img src={article.author.photoUrl} alt={article.author.name} className="h-16 w-16 shrink-0 rounded-full object-cover" width={64} height={64} />
              ) : (
                <span className="grid h-16 w-16 shrink-0 place-items-center bg-[var(--brand)] font-cond text-lg text-white">DM</span>
              )}
              <div>
                <p className="kicker text-[var(--accent)]">Written by</p>
                <Link href={`/author/${article.author.slug}`} className="headline mt-1 block text-lg hover:text-[var(--accent)]">
                  {article.author.name}
                </Link>
                {article.author.designation ? <p className="text-xs uppercase tracking-[0.1em] text-[#8b95a3]">{article.author.designation}</p> : null}
                {article.authorBio ? <p className="mt-2 text-sm text-[#4a5563]">{article.authorBio}</p> : null}
              </div>
            </aside>
          ) : null}

          <nav className="mt-9 grid gap-4 border-t border-[#e3e7ee] pt-6 sm:grid-cols-2" aria-label="More stories">
            {adjacent.previous ? (
              <Link href={`/news/${adjacent.previous.slug}`} className="group border border-[#e3e7ee] bg-white p-4 hover:border-[var(--accent)]">
                <span className="kicker flex items-center gap-1 text-[#8b95a3]">
                  <ChevronLeft className="h-3 w-3" /> Previous story
                </span>
                <span className="mt-2 block text-[0.95rem] font-semibold leading-snug group-hover:text-[var(--accent)]">
                  {adjacent.previous.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {adjacent.next ? (
              <Link href={`/news/${adjacent.next.slug}`} className="group border border-[#e3e7ee] bg-white p-4 text-right hover:border-[var(--accent)]">
                <span className="kicker flex items-center justify-end gap-1 text-[#8b95a3]">
                  Next story <ChevronRight className="h-3 w-3" />
                </span>
                <span className="mt-2 block text-[0.95rem] font-semibold leading-snug group-hover:text-[var(--accent)]">
                  {adjacent.next.title}
                </span>
              </Link>
            ) : null}
          </nav>
        </article>
      </div>

      <section className="container-site py-10">
        <SectionHeading
          title={article.category ? `More in ${article.category.name}` : "Related coverage"}
          href={article.category ? `/category/${article.category.slug}` : "/latest"}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((item) => (
            <ArticleCard key={item.id} article={item} variant="grid" />
          ))}
        </div>
      </section>

      <section className="container-site pb-14">
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <SectionHeading title="Latest from the desk" href="/latest" />
            <div className="grid gap-5 sm:grid-cols-2">
              {moreFromDesk.slice(0, 4).map((item) => (
                <ArticleCard key={item.id} article={item} variant="grid" />
              ))}
            </div>
          </div>
          <aside className="space-y-6">
            <div className="border border-[#e3e7ee] bg-white p-5">
              <p className="kicker text-[var(--accent)]">Newsletter</p>
              <h3 className="headline mt-2 text-xl">{settings.newsletterTitle}</h3>
              <p className="mt-2 text-sm text-[#5b6779]">{settings.newsletterDescription}</p>
              <div className="mt-4">
                <NewsletterForm variant="light" />
              </div>
            </div>
            <div className="border-t-2 border-[var(--ink)] bg-white p-5">
              <h3 className="section-title text-[0.95rem]">Sections</h3>
              <ul className="mt-3 divide-y divide-[#eef0f4]">
                {moreFromDesk.slice(0, 5).map((item) => (
                  <li key={item.id} className="py-2.5">
                    <Link href={`/news/${item.slug}`} className="text-sm font-medium leading-snug hover:text-[var(--accent)]">
                      {item.title}
                    </Link>
                    <span className="mt-1 block text-[0.68rem] uppercase tracking-[0.08em] text-[#9aa4b2]">
                      {item.category?.name} · {item.publishedAt ? formatDate(item.publishedAt, { day: "numeric", month: "short" }) : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
