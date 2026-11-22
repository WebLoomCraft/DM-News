import { and, count, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { articles, categories } from "@/db/schema";
import { ApiError, handleApiError, ok, readJson, requireCapability } from "@/lib/api";
import { categorySchema } from "@/lib/validators";
import { sanitizePlainText } from "@/lib/sanitize";
import { slugify } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

async function find(id: number) {
  const rows = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    await requireCapability("taxonomy.manage");
    const { id } = await ctx.params;
    const categoryId = Number(id);
    if (!Number.isFinite(categoryId)) throw new ApiError(400, "Invalid category id");
    const existing = await find(categoryId);
    if (!existing) throw new ApiError(404, "Category not found");

    const input = categorySchema.partial().parse(await readJson(req));
    const name = input.name ? sanitizePlainText(input.name) : existing.name;
    let slug = existing.slug;
    if (input.slug !== undefined || input.name) {
      const candidate = slugify(input.slug || name);
      if (candidate && candidate !== existing.slug) {
        const clash = await db
          .select({ id: categories.id })
          .from(categories)
          .where(and(eq(categories.slug, candidate), ne(categories.id, categoryId)))
          .limit(1);
        if (clash.length) throw new ApiError(409, "Another category already uses that slug");
        slug = candidate;
      }
    }

    const [row] = await db
      .update(categories)
      .set({
        name,
        slug,
        description: input.description !== undefined ? sanitizePlainText(input.description) || null : existing.description,
        imageUrl: input.imageUrl !== undefined ? input.imageUrl?.trim() || null : existing.imageUrl,
        color: input.color !== undefined ? input.color?.trim() || existing.color : existing.color,
        orderIndex: input.orderIndex ?? existing.orderIndex,
        showOnHomepage: input.showOnHomepage ?? existing.showOnHomepage,
        isActive: input.isActive ?? existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, categoryId))
      .returning();
    return ok({ item: row });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    await requireCapability("taxonomy.manage");
    const { id } = await ctx.params;
    const categoryId = Number(id);
    if (!Number.isFinite(categoryId)) throw new ApiError(400, "Invalid category id");
    const existing = await find(categoryId);
    if (!existing) throw new ApiError(404, "Category not found");

    const url = new URL(req.url);
    const reassignTo = Number(url.searchParams.get("reassignTo") || 0);
    const used = await db.select({ value: count() }).from(articles).where(eq(articles.categoryId, categoryId));
    const usedCount = used[0]?.value ?? 0;

    if (usedCount > 0) {
      if (!reassignTo) {
        return ok(
          {
            ok: false,
            blocked: true,
            articleCount: usedCount,
            message: `This category still has ${usedCount} article(s). Choose a category to reassign them to.`,
          },
          409,
        );
      }
      const target = await find(reassignTo);
      if (!target) throw new ApiError(404, "Reassignment category not found");
      await db.update(articles).set({ categoryId: reassignTo }).where(eq(articles.categoryId, categoryId));
    }

    await db.delete(categories).where(eq(categories.id, categoryId));
    return ok({ ok: true, reassigned: usedCount });
  } catch (error) {
    return handleApiError(error);
  }
}
