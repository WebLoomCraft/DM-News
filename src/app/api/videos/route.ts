import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { handleApiError, ok, readJson, requireCapability } from "@/lib/api";
import { videoSchema } from "@/lib/validators";
import { sanitizePlainText } from "@/lib/sanitize";
import { parseDateInput } from "@/lib/validators";
import { parseYouTubeId } from "@/lib/utils";

export async function GET() {
  try {
    const rows = await db.select().from(videos).orderBy(asc(videos.orderIndex), desc(videos.publishedAt));
    return ok({ items: rows });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireCapability("videos.manage");
    const input = videoSchema.parse(await readJson(req));
    const source = input.youtubeUrl.trim();
    const [row] = await db
      .insert(videos)
      .values({
        title: sanitizePlainText(input.title),
        youtubeUrl: source,
        youtubeId: parseYouTubeId(source),
        thumbnailUrl: input.thumbnailUrl?.trim() || null,
        description: sanitizePlainText(input.description ?? "") || null,
        kind: input.kind ?? "report",
        isLive: input.isLive ?? false,
        orderIndex: input.orderIndex ?? 0,
        publishedAt: parseDateInput(input.publishedAt) ?? new Date(),
      })
      .returning();
    return ok({ item: row }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireCapability("videos.manage");
    const body = await readJson<{ id?: number; order?: number[] }>(req);
    if (Array.isArray(body.order)) {
      for (const [index, id] of body.order.entries()) {
        await db.update(videos).set({ orderIndex: index }).where(eq(videos.id, Number(id)));
      }
      return ok({ ok: true });
    }
    return ok({ ok: false, error: "Provide an order array" }, 422);
  } catch (error) {
    return handleApiError(error);
  }
}
