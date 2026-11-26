import { eq } from "drizzle-orm";
import { db } from "@/db";
import { articleTags, tags } from "@/db/schema";
import { ApiError, assertSameOrigin, handleApiError, ok, requireCapability } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    await requireCapability("taxonomy.manage");
    const { id } = await ctx.params;
    const tagId = Number(id);
    if (!Number.isFinite(tagId)) throw new ApiError(400, "Invalid tag id");
    await db.delete(articleTags).where(eq(articleTags.tagId, tagId));
    await db.delete(tags).where(eq(tags.id, tagId));
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
