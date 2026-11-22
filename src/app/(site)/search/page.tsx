import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getBaseUrl } from "@/lib/site-url";
import { getPopularTags, searchArticles } from "@/lib/queries";
import { ArticleListItem } from "@/components/site/ArticleCard";
import { EmptyState } from "@/components/site/SectionHeading";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Search", robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = (params.q || "").trim();
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const perPage = 12;
  const [settings, tags] = await Promise.all([getSettings(), getPopularTags(16)]);
  const { results, total } = query ? await searchArticles(query, { limit: perPage, offset: (page - 1) * perPage }) : { results: [], total: 0 };
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="container-site py-10">
      <header className="border-b-2 border-[var(--ink)] pb-5">
        <p className="kicker text-[var(--accent)]">Search</p>
        <h1 className="headline mt-2 text-[clamp(1.8rem,4vw,2.6rem)]">
          {query ? `Results for “${query}”` : "Search the archive"}
        </h1>
        <p className="mt-2 text-sm text-[#5b6779]">
          {query ? `${total} ${total === 1 ? "story" : "stories"} found across headlines, summaries, body copy, sections and tags.` : "Search headlines, article text, sections and tags."}
        </p>
      </header>

      <form action="/search" method="GET" className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b95a3]" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Try “budget”, “cricket”, “parliament”…"
            aria-label="Search query"
            className="w-full border border-[#d5dae2] bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
        <button type="submit" className="kicker bg-[var(--ink)] px-8 py-3 text-white hover:bg-[var(--brand)]">
          Search
        </button>
      </form>

      {!query ? (
        <div className="mt-10">
          <h2 className="section-title mb-3 text-[0.95rem]">Popular topics</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${tag.slug}`}
                className="border border-[#dfe4ec] bg-white px-3 py-1.5 text-sm text-[#4a5563] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                #{tag.name}
              </Link>
            ))}
            {tags.length === 0 ? <p className="text-sm text-[#8b95a3]">No topics yet.</p> : null}
          </div>
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          className="mt-10"
          title={`No stories matched “${query}”`}
          hint="Check the spelling, use fewer words, or browse a section from the navigation above."
        />
      ) : (
        <div className="mt-10 flex flex-col gap-6">
          {results.map((article) => (
            <ArticleListItem key={article.id} article={article} />
          ))}

          {totalPages > 1 ? (
            <nav className="mt-4 flex flex-wrap items-center justify-center gap-2" aria-label="Search pagination">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={`/search?q=${encodeURIComponent(query)}&page=${n}`}
                  className={`grid h-9 w-9 place-items-center border text-sm ${
                    n === page ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[#dfe4ec] bg-white text-[#4a5563] hover:border-[var(--accent)]"
                  }`}
                  aria-current={n === page ? "page" : undefined}
                >
                  {n}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      )}
    </div>
  );
}
