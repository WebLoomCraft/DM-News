import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { homepageSections } from "@/db/schema";
import { handleApiError, ok, readJson, requireCapability } from "@/lib/api";
import { sectionsUpdateSchema } from "@/lib/validators";
import { sanitizePlainText } from "@/lib/sanitize";

export async function GET() {
  try {
    await requireCapability("homepage.manage");
    const rows = await db.select().from(homepageSections).orderBy(asc(homepageSections.orderIndex), asc(homepageSections.id));
    return ok({ items: rows });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireCapability("homepage.manage");
    const body = sectionsUpdateSchema.parse(await readJson(req));
    for (const section of body.sections) {
      await db
        .update(homepageSections)
        .set({
          title: section.title ? sanitizePlainText(section.title) : undefined,
          enabled: section.enabled,
          orderIndex: section.orderIndex,
          categoryId: section.categoryId === undefined ? undefined : section.categoryId,
          limit: section.limit,
          layout: section.layout,
          updatedAt: new Date(),
        })
        .where(eq(homepageSections.id, section.id));
    }
    const rows = await db.select().from(homepageSections).orderBy(asc(homepageSections.orderIndex), asc(homepageSections.id));
    return ok({ items: rows });
  } catch (error) {
    return handleApiError(error);
  }
}
