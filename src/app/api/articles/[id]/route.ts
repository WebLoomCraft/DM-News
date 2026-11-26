import { eq } from "drizzle-orm";
import { db } from "@/db";
import { articleTags, articles, authors, categories, tags } from "@/db/schema";
import { ApiError, assertSameOrigin, handleApiError, ok, readJson, requireUser } from "@/lib/api";
import { canEditRecord } from "@/lib/permissions";
import { deleteArticle, saveArticle } from "@/lib/articles-service";
import { articleSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

async function loadArticle(id: number) {
  const rows = await db
    .select({
      article: articles,
      category: categories,
      author: authors,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .where(eq(articles.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const articleId = Number(id);
    if (!Number.isFinite(articleId)) throw new ApiError(400, "Invalid article id");

    const found = await loadArticle(articleId);
    if (!found) throw new ApiError(404, "Article not found");
    if (!canEditRecord(user, found.article.createdById)) {
      throw new ApiError(403, "You can only open articles you created");
    }

    const tagRows = await db
      .select({ id: tags.id, name: tags.name, slug: tags.slug })
      .from(articleTags)
      .innerJoin(tags, eq(articleTags.tagId, tags.id))
      .where(eq(articleTags.articleId, articleId));

    return ok({ article: { ...found.article, tags: tagRows }, category: found.category, author: found.author });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await ctx.params;
    const articleId = Number(id);
    if (!Number.isFinite(articleId)) throw new ApiError(400, "Invalid article id");
    const body = await readJson<Record<string, unknown>>(req);

    const existing = await loadArticle(articleId);
    if (!existing) throw new ApiError(404, "Article not found");
    if (!canEditRecord(user, existing.article.createdById)) {
      throw new ApiError(403, "You can only edit articles you created");
    }

    const quickStatus = typeof body.status === "string" && Object.keys(body).length <= 3;
    const input = articleSchema.parse(
      quickStatus
        ? {
            title: existing.article.title,
            slug: existing.article.slug,
            excerpt: existing.article.excerpt,
            content: existing.article.content,
            featuredImageUrl: existing.article.featuredImageUrl,
            imageAlt: existing.article.imageAlt,
            imageCaption: existing.article.imageCaption,
            categoryId: existing.article.categoryId,
            authorId: existing.article.authorId,
            seoTitle: existing.article.seoTitle,
            seoDescription: existing.article.seoDescription,
            socialImageUrl: existing.article.socialImageUrl,
            publishedAt: existing.article.publishedAt ? existing.article.publishedAt.toISOString() : null,
            isFeatured: existing.article.isFeatured,
            featuredRank: existing.article.featuredRank,
            ...(body as Partial<Record<string, unknown>>),
          }
        : body,
    );

    const saved = await saveArticle({ user, input, articleId });
    return ok({ article: saved });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await ctx.params;
    const articleId = Number(id);
    if (!Number.isFinite(articleId)) throw new ApiError(400, "Invalid article id");
    await deleteArticle(user, articleId);
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
