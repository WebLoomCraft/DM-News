import crypto from "node:crypto";
import { eq, isNotNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ApiError, assertSameOrigin, handleApiError, rateLimit, readJson, tooManyRequests, getClientIp } from "@/lib/api";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { passwordResetConfirmSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (!rateLimit(`reset-confirm:${getClientIp(req)}`, 10, 60_000)) return tooManyRequests();

    const body = passwordResetConfirmSchema.parse(await readJson(req));
    const tokenHash = crypto.createHash("sha256").update(body.token).digest("hex");

    const rows = await db.select().from(users).where(isNotNull(users.resetTokenHash));
    let match: (typeof rows)[number] | undefined;
    for (const row of rows) {
      if (!row.resetTokenHash) continue;
      if (await bcrypt.compare(tokenHash, row.resetTokenHash)) {
        match = row;
        break;
      }
    }
    if (!match) throw new ApiError(400, "This reset link is invalid.");
    if (!match.resetTokenExpiresAt || match.resetTokenExpiresAt.getTime() < Date.now()) {
      throw new ApiError(400, "This reset link has expired. Request a new one.");
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    await db
      .update(users)
      .set({ passwordHash, resetTokenHash: null, resetTokenExpiresAt: null, updatedAt: new Date() })
      .where(eq(users.id, match.id));

    const token = await createSessionToken({
      id: match.id,
      name: match.name,
      email: match.email,
      role: match.role,
      avatarUrl: match.avatarUrl,
      status: match.status,
      canPublish: match.canPublish,
    });
    await setSessionCookie(token);

    return Response.json({ ok: true, message: "Password updated. You are now signed in." });
  } catch (error) {
    return handleApiError(error);
  }
}
