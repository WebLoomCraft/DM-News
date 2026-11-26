import { eq } from "drizzle-orm";
import { db } from "@/db";
import { media } from "@/db/schema";
import { ApiError, assertSameOrigin, handleApiError, ok, readJson, requireCapability } from "@/lib/api";
import { deleteStoredFile } from "@/lib/media-storage";
import { sanitizePlainText } from "@/lib/sanitize";
import { mediaPatchSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    await requireCapability("media.manage");
    const { id } = await ctx.params;
    const mediaId = Number(id);
    if (!Number.isFinite(mediaId)) throw new ApiError(400, "Invalid media id");
    const body = mediaPatchSchema.parse(await readJson(req));
    const [row] = await db
      .update(media)
      .set({ alt: body.alt ? sanitizePlainText(body.alt) : null })
      .where(eq(media.id, mediaId))
      .returning();
    if (!row) throw new ApiError(404, "Media item not found");
    return ok({ item: row });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    await requireCapability("media.delete");
    const { id } = await ctx.params;
    const mediaId = Number(id);
    if (!Number.isFinite(mediaId)) throw new ApiError(400, "Invalid media id");
    const rows = await db.select().from(media).where(eq(media.id, mediaId)).limit(1);
    const item = rows[0];
    if (!item) throw new ApiError(404, "Media item not found");
    await deleteStoredFile(item.filename);
    await db.delete(media).where(eq(media.id, mediaId));
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
