import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import {
  assertSameOrigin,
  getClientIp,
  handleApiError,
  ok,
  positiveInt,
  rateLimit,
  readJson,
  requireCapability,
  tooManyRequests,
} from "@/lib/api";
import { contactSchema } from "@/lib/validators";
import { sanitizePlainText } from "@/lib/sanitize";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (!rateLimit(`contact:${getClientIp(req)}`, 5, 10 * 60_000)) return tooManyRequests();
    const body = contactSchema.parse(await readJson(req));
    await db.insert(contactMessages).values({
      name: sanitizePlainText(body.name),
      email: body.email.toLowerCase().trim(),
      subject: sanitizePlainText(body.subject ?? "") || null,
      message: sanitizePlainText(body.message),
    });
    return ok({ ok: true, message: "Thank you — your message has reached the newsroom." }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(req: Request) {
  try {
    await requireCapability("messages.manage");
    const url = new URL(req.url);
    const page = positiveInt(url.searchParams.get("page"), 1);
    const perPage = Math.min(positiveInt(url.searchParams.get("perPage"), 20), 100);
    const unread = url.searchParams.get("unread") === "1";
    const rows = await db
      .select()
      .from(contactMessages)
      .where(unread ? eq(contactMessages.isRead, false) : undefined)
      .orderBy(desc(contactMessages.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage);
    const totalRows = await db.select({ value: count() }).from(contactMessages);
    const unreadRows = await db.select({ value: count() }).from(contactMessages).where(eq(contactMessages.isRead, false));
    return ok({
      items: rows,
      pagination: { page, perPage, total: totalRows[0]?.value ?? 0, totalPages: Math.max(1, Math.ceil((totalRows[0]?.value ?? 0) / perPage)) },
      unread: unreadRows[0]?.value ?? 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
