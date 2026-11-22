import { asc, count, desc, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { articleTags, tags } from "@/db/schema";
import { ApiError, handleApiError, ok, readJson, requireCapability, requireUser } from "@/lib/api";
import { tagSchema } from "@/lib/validators";
import { sanitizePlainText } from "@/lib/sanitize";
import { slugify } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    await requireUser();
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || "";
    const rows = await db
      .select({ tag: tags, articleCount: count(articleTags.articleId) })
      .from(tags)
      .leftJoin(articleTags, eq(articleTags.tagId, tags.id))
      .where(q ? ilike(tags.name, `%${q}%`) : undefined)
      .groupBy(tags.id)
      .orderBy(desc(count(articleTags.articleId)), asc(tags.name))
      .limit(300);
    return ok({ items: rows.map((r) => ({ ...r.tag, articleCount: r.articleCount })) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireCapability("taxonomy.manage");
    const input = tagSchema.parse(await readJson(req));
    const name = sanitizePlainText(input.name);
    const slug = slugify(input.slug || name);
    if (!slug) throw new ApiError(422, "Could not build a slug from that tag name");
    const clash = await db.select({ id: tags.id }).from(tags).where(eq(tags.slug, slug)).limit(1);
    if (clash.length) throw new ApiError(409, "That tag already exists");
    const [row] = await db.insert(tags).values({ name, slug }).returning();
    return ok({ item: row }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
