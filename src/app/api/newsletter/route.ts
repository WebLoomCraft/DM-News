import { count, desc, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
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
import { newsletterSchema } from "@/lib/validators";
import { getSettings } from "@/lib/settings";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (!rateLimit(`newsletter:${getClientIp(req)}`, 6, 10 * 60_000)) return tooManyRequests();

    const settings = await getSettings();
    if (!settings.newsletterEnabled) {
      return ok({ ok: false, message: "Newsletter signups are currently closed." }, 409);
    }

    const body = newsletterSchema.parse(await readJson(req));
    const email = body.email.toLowerCase().trim();
    if (!EMAIL_RE.test(email)) return ok({ ok: false, message: "Please enter a valid email address." }, 422);

    const existing = await db
      .select({ id: newsletterSubscribers.id })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email))
      .limit(1);
    if (existing.length) {
      await db
        .update(newsletterSubscribers)
        .set({ status: "subscribed", consent: true })
        .where(eq(newsletterSubscribers.id, existing[0]!.id));
      return ok({ ok: true, message: "You are already on the list — thank you." });
    }

    await db.insert(newsletterSubscribers).values({
      email,
      consent: body.consent ?? true,
      source: "website",
    });
    return ok({ ok: true, message: "Thanks for subscribing. You will receive the evening briefing." }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(req: Request) {
  try {
    await requireCapability("subscribers.manage");
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || "";
    const page = positiveInt(url.searchParams.get("page"), 1);
    const perPage = Math.min(positiveInt(url.searchParams.get("perPage"), 25), 100);
    const condition = q ? ilike(newsletterSubscribers.email, `%${q}%`) : undefined;

    const rows = await db
      .select()
      .from(newsletterSubscribers)
      .where(condition)
      .orderBy(desc(newsletterSubscribers.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage);
    const totalRows = await db.select({ value: count() }).from(newsletterSubscribers).where(condition);
    return ok({
      items: rows,
      pagination: { page, perPage, total: totalRows[0]?.value ?? 0, totalPages: Math.max(1, Math.ceil((totalRows[0]?.value ?? 0) / perPage)) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
