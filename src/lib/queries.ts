import { db } from "@/db";
import {
  articleTags,
  articles,
  authors,
  categories,
  dailyStats,
  homepageSections,
  tags,
  videos,
} from "@/db/schema";
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, lt, lte, ne, notInArray, or, sql } from "drizzle-orm";

export type CategoryLite = {
  id: number;
  name: string;
  slug: string;
  color: string | null;
};

export type AuthorLite = {
  id: number;
  name: string;
  slug: string;
  photoUrl: string | null;
  designation: string | null;
};

export type TagLite = { id: number; name: string; slug: string };

export type ArticleSummary = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  imageAlt: string | null;
  status: string;
  views: number;
  isBreaking: boolean;
  isFeatured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  category: CategoryLite | null;
  author: AuthorLite | null;
  tags: TagLite[];
};

export type ArticleDetail = ArticleSummary & {
  createdById: number | null;
  authorBio: string | null;
  content: string;
  imageCaption: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  socialImageUrl: string | null;
  updatedAt: Date;
  categoryId: number | null;
};

/** Published stories, plus scheduled stories whose publication time has arrived. */
export const isVisible = and(
  or(
    eq(articles.status, "published"),
    and(eq(articles.status, "scheduled"), sql`${articles.publishedAt} is not null and ${articles.publishedAt} <= now()`),
  ),
  sql`(${articles.publishedAt} is null or ${articles.publishedAt} <= now())`,
);

const summaryColumns = {
  id: articles.id,
  authorId: authors.id,
  title: articles.title,
  slug: articles.slug,
  excerpt: articles.excerpt,
  featuredImageUrl: articles.featuredImageUrl,
  imageAlt: articles.imageAlt,
  status: articles.status,
  views: articles.views,
  isBreaking: articles.isBreaking,
  isFeatured: articles.isFeatured,
  publishedAt: articles.publishedAt,
  createdAt: articles.createdAt,
  categoryId: articles.categoryId,
  categoryName: categories.name,
  categorySlug: categories.slug,
  categoryColor: categories.color,
  authorName: authors.name,
  authorSlug: authors.slug,
  authorPhoto: authors.photoUrl,
  authorDesignation: authors.designation,
};

type SummaryRow = {
  id: number;
  authorId: number | null;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  imageAlt: string | null;
  status: string;
  views: number;
  isBreaking: boolean;
  isFeatured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  categoryColor: string | null;
  authorName: string | null;
  authorSlug: string | null;
  authorPhoto: string | null;
  authorDesignation: string | null;
};

function mapRow(row: SummaryRow): Omit<ArticleSummary, "tags"> {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    featuredImageUrl: row.featuredImageUrl,
    imageAlt: row.imageAlt,
    status: row.status,
    views: row.views,
    isBreaking: row.isBreaking,
    isFeatured: row.isFeatured,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    category: row.categoryId
      ? { id: row.categoryId, name: row.categoryName ?? "", slug: row.categorySlug ?? "", color: row.categoryColor }
      : null,
    author:
      row.authorId && row.authorSlug
        ? {
            id: row.authorId,
            name: row.authorName ?? "",
            slug: row.authorSlug,
            photoUrl: row.authorPhoto,
            designation: row.authorDesignation,
          }
        : null,
  };
}

async function attachTags(rows: Array<Omit<ArticleSummary, "tags">>): Promise<ArticleSummary[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const tagRows = await db
    .select({ articleId: articleTags.articleId, id: tags.id, name: tags.name, slug: tags.slug })
    .from(articleTags)
    .innerJoin(tags, eq(articleTags.tagId, tags.id))
    .where(inArray(articleTags.articleId, ids));
  const byArticle = new Map<number, TagLite[]>();
  for (const t of tagRows) {
    const list = byArticle.get(t.articleId) ?? [];
    list.push({ id: t.id, name: t.name, slug: t.slug });
    byArticle.set(t.articleId, list);
  }
  return rows.map((r) => ({ ...r, tags: byArticle.get(r.id) ?? [] }));
}

const baseQuery = () =>
  db
    .select(summaryColumns)
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(authors, eq(articles.authorId, authors.id));

export async function getBreakingArticles(limit = 10): Promise<ArticleSummary[]> {
  const rows = await baseQuery()
    .where(and(isVisible, eq(articles.isBreaking, true)))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
  return attachTags(rows.map(mapRow));
}

export async function getFeaturedArticles(limit = 4): Promise<ArticleSummary[]> {
  const rows = await baseQuery()
    .where(and(isVisible, eq(articles.isFeatured, true)))
    .orderBy(asc(articles.featuredRank), desc(articles.publishedAt))
    .limit(limit);
  if (rows.length >= limit) return attachTags(rows.map(mapRow));
  // Fall back to the newest published stories so the hero block is never empty.
  const have = rows.map((r) => r.id);
  const extra = await baseQuery()
    .where(have.length ? and(isVisible, notInArray(articles.id, have)) : isVisible)
    .orderBy(desc(articles.publishedAt))
    .limit(Math.max(0, limit - rows.length));
  return attachTags([...rows, ...extra].map(mapRow));
}

export type LatestOptions = {
  limit?: number;
  offset?: number;
  categoryId?: number;
  excludeIds?: number[];
  authorSlug?: string;
  tagSlug?: string;
};

export async function getLatestArticles(opts: LatestOptions = {}): Promise<ArticleSummary[]> {
  const { limit = 9, offset = 0, categoryId, excludeIds = [] } = opts;
  const conditions = [isVisible];
  if (categoryId) conditions.push(eq(articles.categoryId, categoryId));
  if (excludeIds.length) conditions.push(notInArray(articles.id, excludeIds));
  if (opts.authorSlug) conditions.push(eq(authors.slug, opts.authorSlug));
  if (opts.tagSlug) {
    conditions.push(
      sql`${articles.id} in (select at.article_id from article_tags at inner join tags t on t.id = at.tag_id where t.slug = ${opts.tagSlug})`,
    );
  }
  const rows = await baseQuery()
    .where(and(...conditions))
    .orderBy(desc(articles.publishedAt), desc(articles.id))
    .limit(limit)
    .offset(offset);
  return attachTags(rows.map(mapRow));
}

export async function countLatestArticles(opts: LatestOptions = {}): Promise<number> {
  const conditions = [isVisible];
  if (opts.categoryId) conditions.push(eq(articles.categoryId, opts.categoryId));
  if (opts.authorSlug) conditions.push(eq(authors.slug, opts.authorSlug));
  if (opts.tagSlug) {
    conditions.push(
      sql`${articles.id} in (select at.article_id from article_tags at inner join tags t on t.id = at.tag_id where t.slug = ${opts.tagSlug})`,
    );
  }
  const rows = await db
    .select({ value: count() })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .where(and(...conditions));
  return rows[0]?.value ?? 0;
}

export async function getArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  const rows = await db
    .select({
      ...summaryColumns,
      content: articles.content,
      imageCaption: articles.imageCaption,
      seoTitle: articles.seoTitle,
      seoDescription: articles.seoDescription,
      socialImageUrl: articles.socialImageUrl,
      updatedAt: articles.updatedAt,
      createdById: articles.createdById,
      authorBio: authors.bio,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .where(eq(articles.slug, slug))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const [withTags] = await attachTags([mapRow(row)]);
  return {
    ...withTags!,
    createdById: row.createdById,
    authorBio: row.authorBio,
    content: row.content,
    imageCaption: row.imageCaption,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    socialImageUrl: row.socialImageUrl,
    updatedAt: row.updatedAt,
    categoryId: row.categoryId,
    author: row.authorId && row.authorSlug
      ? { id: row.authorId, name: row.authorName ?? "", slug: row.authorSlug, photoUrl: row.authorPhoto, designation: row.authorDesignation }
      : null,
  };
}

export async function getRelatedArticles(article: { id: number; categoryId: number | null }, limit = 4) {
  const conditions = [isVisible, ne(articles.id, article.id)];
  if (article.categoryId) conditions.push(eq(articles.categoryId, article.categoryId));
  const rows = await baseQuery()
    .where(and(...conditions))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
  if (rows.length >= limit) return attachTags(rows.map(mapRow));
  const have = [...rows.map((r) => r.id), article.id];
  const extra = await baseQuery()
    .where(and(isVisible, notInArray(articles.id, have)))
    .orderBy(desc(articles.publishedAt))
    .limit(limit - rows.length);
  return attachTags([...rows, ...extra].map(mapRow));
}

export async function getAdjacentArticles(article: { id: number; publishedAt: Date | null }) {
  const reference = article.publishedAt ?? new Date();
  const [previous] = await baseQuery()
    .where(and(isVisible, lt(articles.publishedAt, reference)))
    .orderBy(desc(articles.publishedAt))
    .limit(1);
  const [next] = await baseQuery()
    .where(and(isVisible, sql`${articles.publishedAt} > ${reference}`))
    .orderBy(asc(articles.publishedAt))
    .limit(1);
  return {
    previous: previous ? mapRow(previous) : null,
    next: next ? mapRow(next) : null,
  };
}

export async function searchArticles(query: string, opts: { limit?: number; offset?: number } = {}) {
  const term = `%${query.replace(/[%_]/g, "")}%`;
  const condition = and(
    isVisible,
    or(
      ilike(articles.title, term),
      ilike(articles.excerpt, term),
      ilike(articles.content, term),
      ilike(categories.name, term),
      sql`${articles.id} in (select at.article_id from article_tags at inner join tags t on t.id = at.tag_id where t.name ilike ${term})`,
    ),
  );
  const rows = await baseQuery()
    .where(condition)
    .orderBy(desc(articles.publishedAt))
    .limit(opts.limit ?? 12)
    .offset(opts.offset ?? 0);
  const totalRows = await db
    .select({ value: count() })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(condition);
  return { results: await attachTags(rows.map(mapRow)), total: totalRows[0]?.value ?? 0 };
}

export async function getTrendingArticles(limit = 5): Promise<ArticleSummary[]> {
  const rows = await baseQuery()
    .where(isVisible)
    .orderBy(desc(articles.views), desc(articles.publishedAt))
    .limit(limit);
  return attachTags(rows.map(mapRow));
}

export async function getActiveCategories() {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      imageUrl: categories.imageUrl,
      color: categories.color,
      orderIndex: categories.orderIndex,
      showOnHomepage: categories.showOnHomepage,
      articleCount: count(articles.id),
    })
    .from(categories)
    .leftJoin(articles, and(eq(articles.categoryId, categories.id), eq(articles.status, "published")))
    .where(eq(categories.isActive, true))
    .groupBy(categories.id)
    .orderBy(asc(categories.orderIndex), asc(categories.name));
  return rows;
}

export async function getCategoryBySlug(slug: string) {
  const rows = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getAuthorBySlug(slug: string) {
  const rows = await db.select().from(authors).where(eq(authors.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getTagBySlug(slug: string) {
  const rows = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getPopularTags(limit = 14) {
  const rows = await db
    .select({ id: tags.id, name: tags.name, slug: tags.slug, articleCount: count(articleTags.articleId) })
    .from(tags)
    .leftJoin(articleTags, eq(articleTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(desc(count(articleTags.articleId)), asc(tags.name))
    .limit(limit);
  return rows;
}

export async function getVideoItems(limit = 8) {
  return db
    .select()
    .from(videos)
    .orderBy(asc(videos.orderIndex), desc(videos.publishedAt))
    .limit(limit);
}

export async function getHomepageSections() {
  return db.select().from(homepageSections).orderBy(asc(homepageSections.orderIndex), asc(homepageSections.id));
}

export async function recordArticleView(articleId: number) {
  try {
    await db.update(articles).set({ views: sql`${articles.views} + 1` }).where(eq(articles.id, articleId));
    await recordDailyStat("articleViews");
  } catch (error) {
    console.error("[stats] failed to record article view", error);
  }
}

export async function recordDailyStat(kind: "pageviews" | "articleViews" = "pageviews") {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const column = kind === "articleViews" ? dailyStats.articleViews : dailyStats.pageviews;
    await db
      .insert(dailyStats)
      .values({ day, pageviews: kind === "pageviews" ? 1 : 0, articleViews: kind === "articleViews" ? 1 : 0 })
      .onConflictDoUpdate({
        target: dailyStats.day,
        set: { [kind]: sql`${column} + 1` } as Record<string, unknown>,
      });
  } catch (error) {
    console.error("[stats] failed to record pageview", error);
  }
}

export async function getRecentDailyStats(days = 14) {
  return db
    .select()
    .from(dailyStats)
    .orderBy(desc(dailyStats.day))
    .limit(days);
}

export async function isSlugTaken(slug: string, ignoreId?: number) {
  const rows = await db
    .select({ id: articles.id })
    .from(articles)
    .where(and(eq(articles.slug, slug), ignoreId ? ne(articles.id, ignoreId) : isNotNull(articles.id)))
    .limit(1);
  return rows.length > 0;
}

export async function uniqueArticleSlug(base: string, ignoreId?: number) {
  const root = base || "article";
  let candidate = root;
  let i = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const taken = await isSlugTaken(candidate, ignoreId);
    if (!taken) return candidate;
    candidate = `${root}-${i++}`;
    if (i > 500) return `${root}-${Date.now()}`;
  }
}
