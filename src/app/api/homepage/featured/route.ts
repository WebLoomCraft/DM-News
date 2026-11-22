import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { articles, homepageSections } from "@/db/schema";
import { ApiError, handleApiError, ok, readJson, requireCapability } from "@/lib/api";

export async function GET() {
  try {
    await requireCapability("homepage.manage");
    const featured = await db
      .select({ id: articles.id, title: articles.title, slug: articles.slug, featuredRank: articles.featuredRank, status: articles.status })
      .from(articles)
      .where(eq(articles.isFeatured, true))
      .orderBy(asc(articles.featuredRank), asc(articles.id));
    const breaking = await db
      .select({ id: articles.id, title: articles.title, slug: articles.slug, status: articles.status })
      .from(articles)
      .where(eq(articles.isBreaking, true))
      .orderBy(asc(articles.id));
    const sections = await db.select().from(homepageSections).orderBy(asc(homepageSections.orderIndex));
    return ok({ featured, breaking, sections });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireCapability("homepage.manage");
    const body = await readJson<{
      featured?: Array<{ id: number; featuredRank: number }>;
      breaking?: number[];
      clearBreaking?: number[];
      clearFeatured?: number[];
    }>(req);

    if (Array.isArray(body.clearFeatured)) {
      for (const id of body.clearFeatured) {
        await db.update(articles).set({ isFeatured: false, featuredRank: 0 }).where(eq(articles.id, Number(id)));
      }
    }
    if (Array.isArray(body.featured)) {
      for (const item of body.featured) {
        const id = Number(item.id);
        if (!Number.isFinite(id)) throw new ApiError(422, "Invalid article id");
        await db
          .update(articles)
          .set({ isFeatured: true, featuredRank: Number(item.featuredRank) || 0 })
          .where(eq(articles.id, id));
      }
    }
    if (Array.isArray(body.clearBreaking)) {
      for (const id of body.clearBreaking) {
        await db.update(articles).set({ isBreaking: false }).where(eq(articles.id, Number(id)));
      }
    }
    if (Array.isArray(body.breaking)) {
      for (const id of body.breaking) {
        await db.update(articles).set({ isBreaking: true }).where(eq(articles.id, Number(id)));
      }
    }

    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
