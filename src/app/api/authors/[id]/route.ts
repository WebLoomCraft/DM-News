import { eq } from "drizzle-orm";
import { db } from "@/db";
import { authors } from "@/db/schema";
import { ApiError, assertSameOrigin, handleApiError, ok, readJson, requireCapability } from "@/lib/api";
import { authorSchema } from "@/lib/validators";
import { sanitizePlainText } from "@/lib/sanitize";
import { slugify } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    await requireCapability("authors.manage");
    const { id } = await ctx.params;
    const authorId = Number(id);
    if (!Number.isFinite(authorId)) throw new ApiError(400, "Invalid author id");
    const rows = await db.select().from(authors).where(eq(authors.id, authorId)).limit(1);
    const existing = rows[0];
    if (!existing) throw new ApiError(404, "Author not found");

    const input = authorSchema.partial().parse(await readJson(req));
    const name = input.name ? sanitizePlainText(input.name) : existing.name;
    const slug = input.slug || input.name ? slugify(input.slug || name) || existing.slug : existing.slug;

    const [row] = await db
      .update(authors)
      .set({
        name,
        slug,
        photoUrl: input.photoUrl !== undefined ? input.photoUrl?.trim() || null : existing.photoUrl,
        bio: input.bio !== undefined ? sanitizePlainText(input.bio) || null : existing.bio,
        email: input.email !== undefined ? input.email?.trim() || null : existing.email,
        designation: input.designation !== undefined ? sanitizePlainText(input.designation) || null : existing.designation,
        facebookUrl: input.facebookUrl !== undefined ? input.facebookUrl?.trim() || null : existing.facebookUrl,
        xUrl: input.xUrl !== undefined ? input.xUrl?.trim() || null : existing.xUrl,
        userId: input.userId !== undefined ? input.userId : existing.userId,
        updatedAt: new Date(),
      })
      .where(eq(authors.id, authorId))
      .returning();
    return ok({ item: row });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    await requireCapability("authors.manage");
    const { id } = await ctx.params;
    const authorId = Number(id);
    if (!Number.isFinite(authorId)) throw new ApiError(400, "Invalid author id");
    await db.delete(authors).where(eq(authors.id, authorId));
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
