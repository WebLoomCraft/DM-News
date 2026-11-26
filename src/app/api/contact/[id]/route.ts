import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { ApiError, assertSameOrigin, handleApiError, ok, readJson, requireCapability } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    await requireCapability("messages.manage");
    const { id } = await ctx.params;
    const messageId = Number(id);
    if (!Number.isFinite(messageId)) throw new ApiError(400, "Invalid message id");
    const body = await readJson<{ isRead?: boolean }>(req);
    const [row] = await db
      .update(contactMessages)
      .set({ isRead: Boolean(body.isRead) })
      .where(eq(contactMessages.id, messageId))
      .returning();
    if (!row) throw new ApiError(404, "Message not found");
    return ok({ item: row });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    await requireCapability("messages.manage");
    const { id } = await ctx.params;
    const messageId = Number(id);
    if (!Number.isFinite(messageId)) throw new ApiError(400, "Invalid message id");
    await db.delete(contactMessages).where(eq(contactMessages.id, messageId));
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
