import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { articleTags, articles, categories, tags } from "@/db/schema";
import { ApiError } from "./api";
import { can, canPublish, canEditRecord, type Capability } from "./permissions";
import type { SessionUser } from "./session";
import { sanitizePlainText, sanitizeRichText } from "./sanitize";
import { uniqueArticleSlug } from "./queries";
import { parseDateInput, type ArticleInput } from "./validators";
import { slugify } from "./utils";

export async function resolveTagIds(names: string[]): Promise<number[]> {
  const cleaned = Array.from(
    new Set(
      names
        .flatMap((raw) => raw.split(","))
        .map((n) => sanitizePlainText(n).slice(0, 60))
        .filter(Boolean),
    ),
  ).slice(0, 30);
  if (!cleaned.length) return [];

  const existing = await db.select().from(tags).where(inArray(tags.name, cleaned));
  const found = new Map(existing.map((t) => [t.name.toLowerCase(), t.id]));
  const ids: number[] = [];
  for (const name of cleaned) {
    const key = name.toLowerCase();
    const known = found.get(key);
    if (known) {
      ids.push(known);
      continue;
    }
    const slug = slugify(name);
    const [created] = await db
      .insert(tags)
      .values({ name, slug })
      .onConflictDoNothing({ target: tags.slug })
      .returning();
    if (created) {
      ids.push(created.id);
      found.set(key, created.id);
    } else {
      const [bySlug] = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);
      if (bySlug) ids.push(bySlug.id);
    }
  }
  return Array.from(new Set(ids));
}

export async function syncArticleTags(articleId: number, names: string[]) {
  const ids = await resolveTagIds(names);
  await db.delete(articleTags).where(eq(articleTags.articleId, articleId));
  if (ids.length) {
    await db.insert(articleTags).values(ids.map((tagId) => ({ articleId, tagId })));
  }
  return ids;
}

function normalizeStatus(user: SessionUser, input: ArticleInput, publishedAt: Date | null, current?: string) {
  const requested = input.status ?? current ?? "draft";
  if (requested === "published" || requested === "scheduled") {
    if (!canPublish(user)) {
      throw new ApiError(403, "Your role cannot publish. Save as draft and ask an editor to review.");
    }
  }
  if (requested === "published") {
    return { status: "published" as const, publishedAt: publishedAt ?? new Date() };
  }
  if (requested === "scheduled") {
    if (!publishedAt || publishedAt.getTime() <= Date.now()) {
      throw new ApiError(422, "Scheduled articles need a future publication date and time");
    }
    return { status: "scheduled" as const, publishedAt };
  }
  return { status: requested as "draft" | "archived", publishedAt };
}

export type SaveArticleArgs = {
  user: SessionUser;
  input: ArticleInput;
  articleId?: number;
};

export async function saveArticle({ user, input, articleId }: SaveArticleArgs) {
  const title = sanitizePlainText(input.title);
  if (title.length < 6) throw new ApiError(422, "Headline must be at least 6 characters");

  let existing: typeof articles.$inferSelect | undefined;
  if (articleId) {
    const rows = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
    existing = rows[0];
    if (!existing) throw new ApiError(404, "Article not found");
    if (!canEditRecord(user, existing.createdById)) {
      throw new ApiError(403, "You can only edit articles you created");
    }
  }

  if (input.categoryId) {
    const [category] = await db.select().from(categories).where(eq(categories.id, input.categoryId)).limit(1);
    if (!category) throw new ApiError(422, "Selected category does not exist");
  }

  const publishedAtInput = parseDateInput(input.publishedAt);
  const { status, publishedAt } = normalizeStatus(user, input, publishedAtInput, existing?.status);

  const slugBase = slugify(input.slug || title) || "article";
  const slug = await uniqueArticleSlug(slugBase, articleId);

  const values = {
    title,
    slug,
    excerpt: sanitizePlainText(input.excerpt ?? "") || null,
    content: sanitizeRichText(input.content ?? ""),
    featuredImageUrl: input.featuredImageUrl?.trim() || null,
    imageAlt: sanitizePlainText(input.imageAlt ?? "") || title,
    imageCaption: sanitizePlainText(input.imageCaption ?? "") || null,
    categoryId: input.categoryId ?? null,
    authorId: input.authorId ?? null,
    status,
    isFeatured: Boolean(input.isFeatured),
    featuredRank: input.featuredRank ?? 0,
    isBreaking: Boolean(input.isBreaking),
    seoTitle: sanitizePlainText(input.seoTitle ?? "") || title,
    seoDescription: sanitizePlainText(input.seoDescription ?? input.excerpt ?? "") || null,
    socialImageUrl: input.socialImageUrl?.trim() || input.featuredImageUrl?.trim() || null,
    publishedAt,
    updatedAt: new Date(),
  };

  let saved: typeof articles.$inferSelect;
  if (existing) {
    const [row] = await db.update(articles).set(values).where(eq(articles.id, existing.id)).returning();
    saved = row!;
  } else {
    const [row] = await db
      .insert(articles)
      .values({ ...values, createdById: user.id, createdAt: new Date() })
      .returning();
    saved = row!;
  }

  if (Array.isArray(input.tags)) await syncArticleTags(saved.id, input.tags);

  return saved;
}

export async function deleteArticle(user: SessionUser, articleId: number) {
  const rows = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  const article = rows[0];
  if (!article) throw new ApiError(404, "Article not found");
  if (!canEditRecord(user, article.createdById)) {
    throw new ApiError(403, "You can only delete articles you created");
  }
  await db.delete(articleTags).where(eq(articleTags.articleId, articleId));
  await db.delete(articles).where(eq(articles.id, articleId));
  return { ok: true };
}

export function assertCapability(user: SessionUser, capability: Capability) {
  if (!can(user, capability)) {
    throw new ApiError(403, "You do not have permission to perform this action");
  }
}
