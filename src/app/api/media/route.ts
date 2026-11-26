import { count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { media } from "@/db/schema";
import { ApiError, assertSameOrigin, handleApiError, ok, positiveInt, requireCapability } from "@/lib/api";
import { saveUpload } from "@/lib/media-storage";
import { sanitizePlainText } from "@/lib/sanitize";

export async function GET(req: Request) {
  try {
    await requireCapability("media.manage");
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || "";
    const page = positiveInt(url.searchParams.get("page"), 1);
    const perPage = Math.min(positiveInt(url.searchParams.get("perPage"), 24), 96);
    const condition = q
      ? or(ilike(media.originalName, `%${q}%`), ilike(media.filename, `%${q}%`), ilike(media.alt, `%${q}%`))
      : undefined;

    const rows = await db
      .select()
      .from(media)
      .where(condition)
      .orderBy(desc(media.createdAt), desc(media.id))
      .limit(perPage)
      .offset((page - 1) * perPage);
    const totalRows = await db.select({ value: count() }).from(media).where(condition);
    const total = totalRows[0]?.value ?? 0;

    return ok({ items: rows, pagination: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireCapability("media.manage");
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ApiError(422, "No file was provided");

    const stored = await saveUpload(file);
    const alt = sanitizePlainText(String(formData.get("alt") ?? "")) || null;
    const [row] = await db
      .insert(media)
      .values({
        filename: stored.filename,
        originalName: file.name.slice(0, 240) || stored.filename,
        url: stored.url,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        width: stored.width,
        height: stored.height,
        alt,
        uploadedById: user.id,
      })
      .returning();

    return ok({ item: row }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
