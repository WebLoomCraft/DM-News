import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { articles, authors, categories, contactMessages, dailyStats, media, newsletterSubscribers, tags, users, videos } from "@/db/schema";
import { handleApiError, ok, requireUser } from "@/lib/api";
import { can, canEditRecord } from "@/lib/permissions";
import { getRecentDailyStats } from "@/lib/queries";

export async function GET() {
  try {
    const user = await requireUser();
    const scope = can(user, "articles.editAny") ? undefined : eq(articles.createdById, user.id);

    const [totals, byStatus, scheduled, recent, traffic] = await Promise.all([
      Promise.all([
        db.select({ value: count() }).from(articles).where(scope),
        db.select({ value: count() }).from(categories),
        db.select({ value: count() }).from(media),
        db.select({ value: count() }).from(tags),
        db.select({ value: count() }).from(authors),
        db.select({ value: count() }).from(videos),
        db.select({ value: count() }).from(newsletterSubscribers),
        db.select({ value: count() }).from(contactMessages).where(eq(contactMessages.isRead, false)),
      ]),
      db
        .select({ status: articles.status, value: count() })
        .from(articles)
        .where(scope)
        .groupBy(articles.status),
      db
        .select({ value: count() })
        .from(articles)
        .where(and(eq(articles.status, "scheduled"), sql`${articles.publishedAt} > now()`)),
      db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          status: articles.status,
          views: articles.views,
          updatedAt: articles.updatedAt,
          createdAt: articles.createdAt,
          publishedAt: articles.publishedAt,
          categoryName: categories.name,
        })
        .from(articles)
        .leftJoin(categories, eq(articles.categoryId, categories.id))
        .where(scope)
        .orderBy(desc(articles.updatedAt))
        .limit(8),
      getRecentDailyStats(14),
    ]);

    const [articleCount, categoryCount, mediaCount, tagCount, authorCount, videoCount, subscriberCount, unreadMessages] = totals;

    const statusMap: Record<string, number> = { draft: 0, published: 0, scheduled: 0, archived: 0 };
    for (const row of byStatus) statusMap[row.status] = row.value;

    return ok({
      totals: {
        articles: articleCount?.[0]?.value ?? 0,
        published: statusMap.published ?? 0,
        drafts: statusMap.draft ?? 0,
        scheduled: scheduled[0]?.value ?? 0,
        archived: statusMap.archived ?? 0,
        categories: categoryCount?.[0]?.value ?? 0,
        media: mediaCount?.[0]?.value ?? 0,
        tags: tagCount?.[0]?.value ?? 0,
        authors: authorCount?.[0]?.value ?? 0,
        videos: videoCount?.[0]?.value ?? 0,
        subscribers: subscriberCount?.[0]?.value ?? 0,
        unreadMessages: unreadMessages?.[0]?.value ?? 0,
      },
      recent,
      traffic: traffic.map((t) => ({ day: t.day, pageviews: t.pageviews, articleViews: t.articleViews })),
      canSeeTraffic: true,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
