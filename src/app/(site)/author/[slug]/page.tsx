import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthorBySlug, getLatestArticles } from "@/lib/queries";
import { ArticleListItem } from "@/components/site/ArticleCard";
import { EmptyState } from "@/components/site/SectionHeading";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) return { title: "Author not found" };
  return { title: author.name, description: author.bio || `Stories by ${author.name} on DM News Network.` };
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();

  const items = await getLatestArticles({ authorSlug: author!.slug, limit: 30 });

  return (
    <div className="container-site py-10">
      <header className="mb-10 flex flex-col gap-5 border-b-2 border-[var(--ink)] pb-8 sm:flex-row sm:items-center">
        {author!.photoUrl ? (
          <img src={author!.photoUrl} alt={author!.name} className="h-24 w-24 shrink-0 rounded-full object-cover" width={96} height={96} />
        ) : (
          <span className="grid h-24 w-24 shrink-0 place-items-center bg-[var(--brand)] font-cond text-2xl text-white">DM</span>
        )}
        <div>
          <p className="kicker text-[var(--accent)]">{author!.designation || "Newsroom desk"}</p>
          <h1 className="headline mt-1 text-[clamp(1.9rem,4.5vw,2.7rem)]">{author!.name}</h1>
          {author!.bio ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4a5563]">{author!.bio}</p> : null}
          <p className="mt-3 text-[0.75rem] uppercase tracking-[0.1em] text-[#8b95a3]">{items.length} published stories</p>
        </div>
      </header>

      {items.length ? (
        <div className="flex flex-col gap-6">
          {items.map((article) => (
            <ArticleListItem key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <EmptyState title="No published stories from this desk yet" hint="Articles assigned to this author appear here as soon as they are published." />
      )}
    </div>
  );
}
