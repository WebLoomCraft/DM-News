import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { handleApiError, ok, readJson, requireCapability } from "@/lib/api";
import { settingsSchema } from "@/lib/validators";
import { sanitizeRichText, sanitizeTrustedHtml } from "@/lib/sanitize";
import { invalidateSettingsCache } from "@/lib/settings";
import { normalizeUrl } from "@/lib/validators";

const URL_FIELDS = [
  "siteUrl",
  "logoUrl",
  "faviconUrl",
  "facebookUrl",
  "tiktokUrl",
  "youtubeUrl",
  "xUrl",
  "instagramUrl",
  "liveStreamUrl",
  "defaultSocialImage",
] as const;

export async function GET() {
  try {
    await requireCapability("settings.manage");
    const rows = await db.select().from(siteSettings).orderBy(asc(siteSettings.id)).limit(1);
    return ok({ settings: rows[0] ?? null });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireCapability("settings.manage");
    const body = await readJson<Record<string, unknown>>(req);
    const input = settingsSchema.parse(body);
    const rows = await db.select().from(siteSettings).orderBy(asc(siteSettings.id)).limit(1);
    const current = rows[0];
    if (!current) return ok({ error: "Settings row missing — reload the page" }, 409);

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(input)) {
      if (value === undefined) continue;
      patch[key] = value;
    }
    for (const field of URL_FIELDS) {
      if (field in patch) patch[field] = normalizeUrl(patch[field] as string | null | undefined);
    }
    for (const field of ["aboutContent", "privacyContent", "termsContent"] as const) {
      if (field in patch) patch[field] = sanitizeRichText(patch[field] as string | null | undefined);
    }
    for (const field of ["adSlotHtml", "analyticsSnippet"] as const) {
      if (field in patch) patch[field] = sanitizeTrustedHtml(patch[field] as string | null | undefined);
    }

    const [row] = await db.update(siteSettings).set(patch).where(eq(siteSettings.id, current.id)).returning();
    invalidateSettingsCache();
    return ok({ settings: row });
  } catch (error) {
    return handleApiError(error);
  }
}
