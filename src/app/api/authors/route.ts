import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { articles, authors } from "@/db/schema";
import { ApiError, assertSameOrigin, handleApiError, ok, readJson, requireCapability, requireUser } from "@/lib/api";
import { authorSchema } from "@/lib/validators";
import { sanitizePlainText } from "@/lib/sanitize";
import { slugify } from "@/lib/utils";

export async function GET() {
  try {
    await requireUser();
    const rows = await db
      .select({ author: authors, articleCount: count(articles.id) })
      .from(authors)
      .leftJoin(articles, eq(articles.authorId, authors.id))
      .groupBy(authors.id)
      .orderBy(asc(authors.name));
    return ok({ items: rows.map((r) => ({ ...r.author, articleCount: r.articleCount })) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireCapability("authors.manage");
    const input = authorSchema.parse(await readJson(req));
    const name = sanitizePlainText(input.name);
    let slug = slugify(input.slug || name);
    if (!slug) throw new ApiError(422, "Could not build a slug from that name");
    const clash = await db.select({ id: authors.id }).from(authors).where(eq(authors.slug, slug)).limit(1);
    if (clash.length) slug = `${slug}-${Date.now().toString().slice(-4)}`;

    const [row] = await db
      .insert(authors)
      .values({
        name,
        slug,
        photoUrl: input.photoUrl?.trim() || null,
        bio: sanitizePlainText(input.bio ?? "") || null,
        email: input.email?.trim() || null,
        designation: sanitizePlainText(input.designation ?? "") || null,
        facebookUrl: input.facebookUrl?.trim() || null,
        xUrl: input.xUrl?.trim() || null,
        userId: input.userId ?? null,
      })
      .returning();
    return ok({ item: row }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
