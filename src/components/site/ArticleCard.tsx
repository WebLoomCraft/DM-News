import Link from "next/link";
import type { ArticleSummary } from "@/lib/queries";
import { cn, formatDate, timeAgo } from "@/lib/utils";

export type CardVariant = "hero" | "grid" | "row" | "compact" | "overlay";

export function CategoryBadge({
  name,
  slug,
  color,
  className,
}: {
  name?: string | null;
  slug?: string | null;
  color?: string | null;
  className?: string;
}) {
  if (!name || !slug) return null;
  return (
    <Link
      href={`/category/${slug}`}
      className={cn("kicker inline-flex items-center gap-1 font-semibold hover:opacity-75", className)}
      style={{ color: color || "var(--accent)" }}
    >
      <span aria-hidden className="inline-block h-[3px] w-4" style={{ background: color || "var(--accent)" }} />
      {name}
    </Link>
  );
}

export function Thumb({
  src,
  alt,
  className,
  ratio = "aspect-[16/10]",
  sizes,
  priority,
}: {
  src?: string | null;
  alt?: string | null;
  className?: string;
  ratio?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-[#0d1a2d]", ratio, className)}>
      {src ? (
        <img
          src={src}
          alt={alt || ""}
          width={1200}
          height={750}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="img-zoom h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#0b1b33,#12294a)]">
          <span className="font-cond text-3xl font-bold tracking-[0.3em] text-white/35">DM</span>
        </div>
      )}
    </div>
  );
}

function Meta({ article, className }: { article: ArticleSummary; className?: string }) {
  return (
    <p className={cn("mt-2 text-[0.72rem] uppercase tracking-[0.08em] text-[#6b7686]", className)}>
      {article.publishedAt ? timeAgo(article.publishedAt) : ""}
      {article.author?.name ? <span className="text-[#9aa4b2]"> · {article.author.name}</span> : null}
    </p>
  );
}

export function ArticleCard({
  article,
  variant = "grid",
  priority,
  className,
}: {
  article: ArticleSummary;
  variant?: CardVariant;
  priority?: boolean;
  className?: string;
}) {
  const href = `/news/${article.slug}`;

  if (variant === "hero") {
    return (
      <article className={cn("group", className)}>
        <Link href={href} className="block overflow-hidden">
          <Thumb src={article.featuredImageUrl} alt={article.imageAlt || article.title} ratio="aspect-[16/9]" priority={priority} sizes="(max-width: 1024px) 100vw, 640px" />
        </Link>
        <div className="pt-4">
          <div className="flex items-center gap-3">
            <CategoryBadge name={article.category?.name} slug={article.category?.slug} color={article.category?.color} />
            {article.isBreaking ? (
              <span className="kicker bg-[var(--accent)] px-1.5 py-0.5 text-white">Breaking</span>
            ) : null}
          </div>
          <h2 className="headline mt-2 text-[clamp(1.6rem,3.4vw,2.5rem)]">
            <Link href={href} className="hover:text-[var(--accent)]">
              {article.title}
            </Link>
          </h2>
          {article.excerpt ? <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-[#4a5563]">{article.excerpt}</p> : null}
          <Meta article={article} />
        </div>
      </article>
    );
  }

  if (variant === "overlay") {
    return (
      <article className={cn("group relative min-h-[280px] overflow-hidden bg-[#0d1a2d]", className)}>
        <Link href={href} className="absolute inset-0">
          <Thumb src={article.featuredImageUrl} alt={article.imageAlt || article.title} ratio="h-full w-full" className="absolute inset-0" priority={priority} />
          <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(4,10,20,0.92)_8%,rgba(4,10,20,0.35)_55%,rgba(4,10,20,0.1))]" />
        </Link>
        <div className="relative flex h-full flex-col justify-end p-5">
          <CategoryBadge name={article.category?.name} slug={article.category?.slug} color="#ff7a80" className="text-white" />
          <h3 className="headline mt-2 text-xl text-white">
            <Link href={href}>{article.title}</Link>
          </h3>
          <p className="mt-2 text-[0.72rem] uppercase tracking-[0.08em] text-white/65">
            {article.publishedAt ? formatDate(article.publishedAt, { day: "numeric", month: "short", year: "numeric" }) : ""}
          </p>
        </div>
      </article>
    );
  }

  if (variant === "row") {
    return (
      <article className={cn("group flex gap-4 border-b border-[#e7eaf0] pb-4 last:border-0", className)}>
        <Link href={href} className="shrink-0">
          <Thumb src={article.featuredImageUrl} alt={article.imageAlt || article.title} ratio="aspect-[4/3] w-28 sm:w-36" />
        </Link>
        <div className="min-w-0">
          <CategoryBadge name={article.category?.name} slug={article.category?.slug} color={article.category?.color} className="text-[0.66rem]" />
          <h3 className="headline mt-1 text-[1.05rem] leading-snug">
            <Link href={href} className="line-clamp-3 hover:text-[var(--accent)]">
              {article.title}
            </Link>
          </h3>
          <Meta article={article} />
        </div>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className={cn("group flex items-baseline gap-3 border-b border-[#eef0f4] py-2.5 last:border-0", className)}>
        <span className="font-cond text-sm font-bold text-[var(--accent)]">{String(article.id).padStart(2, "0")}</span>
        <h3 className="text-[0.95rem] font-semibold leading-snug">
          <Link href={href} className="hover:text-[var(--accent)]">
            {article.title}
          </Link>
        </h3>
      </article>
    );
  }

  return (
    <article className={cn("group flex h-full flex-col border border-[#e7eaf0] bg-white card-hover", className)}>
      <Link href={href} className="block overflow-hidden">
        <Thumb src={article.featuredImageUrl} alt={article.imageAlt || article.title} sizes="(max-width: 768px) 100vw, 33vw" />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          <CategoryBadge name={article.category?.name} slug={article.category?.slug} color={article.category?.color} className="text-[0.66rem]" />
          {article.isBreaking ? <span className="kicker bg-[var(--accent)] px-1 py-0.5 text-[0.6rem] text-white">Breaking</span> : null}
        </div>
        <h3 className="headline mt-2 text-[1.15rem]">
          <Link href={href} className="line-clamp-3 hover:text-[var(--accent)]">
            {article.title}
          </Link>
        </h3>
        {article.excerpt ? <p className="mt-2 line-clamp-2 text-[0.88rem] leading-relaxed text-[#5b6779]">{article.excerpt}</p> : null}
        <div className="mt-auto pt-3">
          <Meta article={article} className="mt-0" />
        </div>
      </div>
    </article>
  );
}

export function ArticleListItem({ article }: { article: ArticleSummary }) {
  return (
    <article className="group flex flex-col gap-4 border-b border-[#e7eaf0] pb-6 sm:flex-row">
      <Link href={`/news/${article.slug}`} className="sm:w-64 sm:shrink-0">
        <Thumb src={article.featuredImageUrl} alt={article.imageAlt || article.title} ratio="aspect-[16/10] sm:aspect-[4/3]" sizes="(max-width: 640px) 100vw, 256px" />
      </Link>
      <div className="min-w-0 flex-1">
        <CategoryBadge name={article.category?.name} slug={article.category?.slug} color={article.category?.color} />
        <h2 className="headline mt-1.5 text-[1.4rem]">
          <Link href={`/news/${article.slug}`} className="hover:text-[var(--accent)]">
            {article.title}
          </Link>
        </h2>
        {article.excerpt ? <p className="mt-2 line-clamp-3 max-w-2xl text-[0.95rem] leading-relaxed text-[#4a5563]">{article.excerpt}</p> : null}
        <Meta article={article} />
      </div>
    </article>
  );
}
