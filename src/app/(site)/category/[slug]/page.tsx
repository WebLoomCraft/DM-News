import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { getBaseUrl } from "@/lib/site-url";
import {
  countLatestArticles,
  getActiveCategories,
  getCategoryBySlug,
  getLatestArticles,
  getPopularTags,
  getTrendingArticles,
} from "@/lib/queries";
import { ArticleCard, ArticleListItem } from "@/components/site/ArticleCard";
import { EmptyState, SectionHeading } from "@/components/site/SectionHeading";
import LatestNewsGrid from "@/components/site/LatestNewsGrid";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [category, baseUrl] = await Promise.all([getCategoryBySlug(slug), getBaseUrl()]);
  if (!category) return { title: "Section not found" };
  const title = `${category.name} News`;
  const description = category.description || `Latest ${category.name} coverage from DM News Network.`;
  return {
    title,
    description,
    alternates: { canonical: `${baseUrl}/category/${category.slug}` },
    openGraph: { type: "website", title, description, url: `${baseUrl}/category/${category.slug}`, images: category.imageUrl ? [{ url: category.imageUrl }] : undefined },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [category, settings, baseUrl] = await Promise.all([getCategoryBySlug(slug), getSettings(), getBaseUrl()]);
  if (!category) notFound();

  const [items, total, trending, tags, allCategories] = await Promise.all([
    getLatestArticles({ categoryId: category.id, limit: 10 }),
    countLatestArticles({ categoryId: category.id }),
    getTrendingArticles(5),
    getPopularTags(12),
    getActiveCategories(),
  ]);

  const [lead, ...rest] = items;

  const ld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} News`,
    url: `${baseUrl}/category/${category.slug}`,
    description: category.description || undefined,
    isPartOf: { "@type": "WebSite", name: settings.siteName, url: baseUrl },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="bg-[var(--ink)] text-white">
        <div className="container-site py-8">
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.12em] text-white/45">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span aria-hidden>/</span>
            <span className="text-white/80">{category.name}</span>
          </nav>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="headline text-[clamp(2rem,5vw,3rem)] text-white">{category.name}</h1>
              {category.description ? <p className="mt-2 max-w-2xl text-sm text-white/60">{category.description}</p> : null}
            </div>
            <p className="kicker text-white/45">{total} published {total === 1 ? "story" : "stories"}</p>
          </div>
        </div>
      </div>

      <div className="container-site grid gap-10 py-10 lg:grid-cols-[1.75fr_1fr]">
        <div>
          {lead ? (
            <section className="mb-10">
              <SectionHeading title={`${category.name} — lead story`} accent={category.color || undefined} />
              <ArticleCard article={lead} variant="hero" priority />
              <div className="mt-8 flex flex-col gap-6">
                {rest.map((article) => (
                  <ArticleListItem key={article.id} article={article} />
                ))}
              </div>
            </section>
          ) : (
            <EmptyState
              title={`No stories published in ${category.name} yet`}
              hint="Once an editor assigns an article to this section it appears here immediately."
              className="mb-10"
            />
          )}

          {total > items.length ? (
            <section>
              <SectionHeading title={`More ${category.name}`} accent={category.color || undefined} />
              <LatestNewsGrid initial={[]} total={total} offset={items.length} perPage={9} category={category.slug} />
            </section>
          ) : null}
        </div>

        <aside className="space-y-8">
          <div className="border-t-2 border-[var(--ink)] bg-white p-5">
            <h2 className="section-title text-[0.95rem]">Sections</h2>
            <ul className="mt-3 space-y-1.5">
              {allCategories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/category/${c.slug}`}
                    className={`flex items-center justify-between border-b border-[#eef0f4] py-2 text-sm ${
                      c.slug === category.slug ? "font-semibold text-[var(--accent)]" : "text-[#3c4655] hover:text-[var(--accent)]"
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="text-[0.7rem] text-[#9aa4b2]">{c.articleCount}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t-2 border-[var(--ink)] bg-white p-5">
            <h2 className="section-title text-[0.95rem]">Most read</h2>
            <div className="mt-3">
              {trending.map((article) => (
                <ArticleCard key={article.id} article={article} variant="compact" />
              ))}
            </div>
          </div>

          <div className="border-t-2 border-[var(--ink)] bg-white p-5">
            <h2 className="section-title text-[0.95rem]">Topics</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.slug}`}
                  className="border border-[#dfe4ec] px-2.5 py-1 text-xs text-[#4a5563] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  #{tag.name}
                </Link>
              ))}
              {tags.length === 0 ? <p className="text-sm text-[#8b95a3]">No tags yet.</p> : null}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
