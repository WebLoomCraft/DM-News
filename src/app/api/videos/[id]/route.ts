import { eq } from "drizzle-orm";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { ApiError, handleApiError, ok, readJson, requireCapability } from "@/lib/api";
import { parseDateInput, videoSchema } from "@/lib/validators";
import { sanitizePlainText } from "@/lib/sanitize";
import { parseYouTubeId } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    await requireCapability("videos.manage");
    const { id } = await ctx.params;
    const videoId = Number(id);
    if (!Number.isFinite(videoId)) throw new ApiError(400, "Invalid video id");
    const rows = await db.select().from(videos).where(eq(videos.id, videoId)).limit(1);
    const existing = rows[0];
    if (!existing) throw new ApiError(404, "Video not found");

    const input = videoSchema.partial().parse(await readJson(req));
    const source = input.youtubeUrl !== undefined ? input.youtubeUrl.trim() : existing.youtubeUrl;
    const [row] = await db
      .update(videos)
      .set({
        title: input.title ? sanitizePlainText(input.title) : existing.title,
        youtubeUrl: source,
        youtubeId: parseYouTubeId(source),
        thumbnailUrl: input.thumbnailUrl !== undefined ? input.thumbnailUrl?.trim() || null : existing.thumbnailUrl,
        description: input.description !== undefined ? sanitizePlainText(input.description) || null : existing.description,
        kind: input.kind ?? existing.kind,
        isLive: input.isLive ?? existing.isLive,
        orderIndex: input.orderIndex ?? existing.orderIndex,
        publishedAt: input.publishedAt !== undefined ? parseDateInput(input.publishedAt) : existing.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(videos.id, videoId))
      .returning();
    return ok({ item: row });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    await requireCapability("videos.manage");
    const { id } = await ctx.params;
    const videoId = Number(id);
    if (!Number.isFinite(videoId)) throw new ApiError(400, "Invalid video id");
    await db.delete(videos).where(eq(videos.id, videoId));
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
