import { eq } from "drizzle-orm";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { ApiError, assertSameOrigin, handleApiError, ok, requireCapability } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    await requireCapability("subscribers.manage");
    const { id } = await ctx.params;
    const subId = Number(id);
    if (!Number.isFinite(subId)) throw new ApiError(400, "Invalid subscriber id");
    await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, subId));
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
