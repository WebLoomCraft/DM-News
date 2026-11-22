import type { MetadataRoute } from "next";
import { db } from "@/db";
import { articles, categories } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getBaseUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getBaseUrl();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/latest`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/live`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const [articleRows, categoryRows] = await Promise.all([
      db
        .select({ slug: articles.slug, updatedAt: articles.updatedAt, publishedAt: articles.publishedAt })
        .from(articles)
        .where(and(eq(articles.status, "published")))
        .orderBy(desc(articles.publishedAt))
        .limit(20000),
      db.select({ slug: categories.slug, updatedAt: categories.updatedAt }).from(categories).where(eq(categories.isActive, true)),
    ]);

    return [
      ...staticPages,
      ...categoryRows.map((c) => ({
        url: `${base}/category/${c.slug}`,
        lastModified: c.updatedAt ?? now,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...articleRows.map((a) => ({
        url: `${base}/news/${a.slug}`,
        lastModified: a.updatedAt ?? a.publishedAt ?? now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticPages;
  }
}
