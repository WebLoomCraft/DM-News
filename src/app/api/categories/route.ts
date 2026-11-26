import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { articles, categories } from "@/db/schema";
import { ApiError, assertSameOrigin, handleApiError, ok, readJson, requireCapability, requireUser } from "@/lib/api";
import { categorySchema } from "@/lib/validators";
import { sanitizePlainText } from "@/lib/sanitize";
import { slugify } from "@/lib/utils";

export async function GET() {
  try {
    await requireUser();
    const rows = await db
      .select({
        category: categories,
        articleCount: count(articles.id),
      })
      .from(categories)
      .leftJoin(articles, eq(articles.categoryId, categories.id))
      .groupBy(categories.id)
      .orderBy(asc(categories.orderIndex), asc(categories.name));
    return ok({ items: rows.map((r) => ({ ...r.category, articleCount: r.articleCount })) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireCapability("taxonomy.manage");
    const input = categorySchema.parse(await readJson(req));
    const name = sanitizePlainText(input.name);
    let slug = slugify(input.slug || name);
    if (!slug) throw new ApiError(422, "Could not build a slug from that name");

    const clash = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug)).limit(1);
    if (clash.length) slug = `${slug}-${Date.now().toString().slice(-4)}`;

    const maxOrder = await db.select({ value: categories.orderIndex }).from(categories).orderBy(asc(categories.orderIndex));
    const orderIndex = input.orderIndex ?? (maxOrder.length ? (maxOrder[maxOrder.length - 1]?.value ?? 0) + 1 : 0);

    const [row] = await db
      .insert(categories)
      .values({
        name,
        slug,
        description: sanitizePlainText(input.description ?? "") || null,
        imageUrl: input.imageUrl?.trim() || null,
        color: input.color?.trim() || "#D81F2A",
        orderIndex,
        showOnHomepage: input.showOnHomepage ?? true,
        isActive: input.isActive ?? true,
      })
      .returning();
    return ok({ item: row }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
