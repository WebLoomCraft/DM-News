import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLatestArticles, getPopularTags, getTagBySlug } from "@/lib/queries";
import { ArticleListItem } from "@/components/site/ArticleCard";
import { EmptyState, SectionHeading } from "@/components/site/SectionHeading";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) return { title: "Topic not found" };
  return { title: `#${tag.name}`, description: `All stories tagged ${tag.name} on DM News Network.` };
}

export default async function TagPage({ params }: Props) {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  const [items, topics] = await Promise.all([getLatestArticles({ tagSlug: tag!.slug, limit: 30 }), getPopularTags(20)]);

  return (
    <div className="container-site grid gap-10 py-10 lg:grid-cols-[1.75fr_1fr]">
      <div>
        <header className="mb-8 border-b-2 border-[var(--ink)] pb-4">
          <nav className="mb-3 text-[0.7rem] uppercase tracking-[0.12em] text-[#8b95a3]">
            <Link href="/" className="hover:text-[var(--accent)]">
              Home
            </Link>{" "}
            / Topics
          </nav>
          <h1 className="headline text-[clamp(1.8rem,4.5vw,2.6rem)]">#{tag!.name}</h1>
          <p className="mt-2 text-sm text-[#5b6779]">{items.length} stories tagged with this topic.</p>
        </header>

        {items.length ? (
          <div className="flex flex-col gap-6">
            {items.map((article) => (
              <ArticleListItem key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <EmptyState title={`No stories tagged “${tag!.name}” yet`} hint="Tags are added in the article editor and appear here automatically." />
        )}
      </div>

      <aside>
        <div className="border-t-2 border-[var(--ink)] bg-white p-5">
          <SectionHeading title="All topics" className="border-0 pb-0" />
          <div className="mt-3 flex flex-wrap gap-2">
            {topics.map((t) => (
              <Link
                key={t.id}
                href={`/tag/${t.slug}`}
                className={`border px-2.5 py-1 text-xs ${
                  t.slug === tag!.slug ? "border-[var(--accent)] text-[var(--accent)]" : "border-[#dfe4ec] text-[#4a5563] hover:border-[var(--accent)]"
                }`}
              >
                #{t.name} <span className="text-[#9aa4b2]">{t.articleCount}</span>
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
