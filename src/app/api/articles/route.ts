import { and, desc, eq, ilike, inArray, isNull, or, sql, asc } from "drizzle-orm";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { articles, authors, categories, tags, articleTags } from "@/db/schema";
import { ApiError, assertSameOrigin, handleApiError, ok, positiveInt, readJson, requireUser } from "@/lib/api";
import { can, canEditRecord } from "@/lib/permissions";
import { saveArticle } from "@/lib/articles-service";
import { articleSchema } from "@/lib/validators";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || "";
    const status = url.searchParams.get("status") || "";
    const categoryId = url.searchParams.get("categoryId");
    const authorId = url.searchParams.get("authorId");
    const page = positiveInt(url.searchParams.get("page"), 1);
    const perPage = Math.min(positiveInt(url.searchParams.get("perPage"), 15), 100);
    const sort = url.searchParams.get("sort") || "recent";

    const conditions: ReturnType<typeof eq>[] = [];
    if (status && status !== "all") conditions.push(eq(articles.status, status));
    if (categoryId && categoryId !== "all") conditions.push(eq(articles.categoryId, Number(categoryId)));
    if (authorId && authorId !== "all") conditions.push(eq(articles.authorId, Number(authorId)));
    if (q) {
      const term = `%${q.replace(/[%_]/g, "")}%`;
      conditions.push(or(ilike(articles.title, term), ilike(articles.excerpt, term))!);
    }
    // Authors only ever see their own records.
    if (!can(user, "articles.editAny")) conditions.push(eq(articles.createdById, user.id));

    const where = conditions.length ? and(...conditions) : undefined;
    const order =
      sort === "views"
        ? desc(articles.views)
        : sort === "title"
          ? asc(articles.title)
          : sort === "oldest"
            ? asc(articles.createdAt)
            : desc(articles.createdAt);

    const rows = await db
      .select({
        article: articles,
        categoryName: categories.name,
        categorySlug: categories.slug,
        categoryColor: categories.color,
        authorName: authors.name,
        tagList: sql<string>`coalesce((select string_agg(t.name, ', ' order by t.name) from article_tags at join tags t on t.id = at.tag_id where at.article_id = ${articles.id}), '')`,
      })
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .leftJoin(authors, eq(articles.authorId, authors.id))
      .where(where)
      .orderBy(order)
      .limit(perPage)
      .offset((page - 1) * perPage);

    const totalRows = await db.select({ value: count() }).from(articles).where(where);
    const total = totalRows[0]?.value ?? 0;

    return ok({
      items: rows.map((r) => ({
        ...r.article,
        categoryName: r.categoryName,
        categorySlug: r.categorySlug,
        categoryColor: r.categoryColor,
        authorName: r.authorName,
        tagList: r.tagList,
      })),
      pagination: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    if (!can(user, "articles.create")) throw new ApiError(403, "You cannot create articles");
    const input = articleSchema.parse(await readJson(req));
    const article = await saveArticle({ user, input });
    return ok({ article }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
