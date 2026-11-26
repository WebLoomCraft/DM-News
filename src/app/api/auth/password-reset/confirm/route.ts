import { and, eq, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  ApiError,
  assertSameOrigin,
  enforceRateLimit,
  handleApiError,
  readJson,
} from "@/lib/api";
import { LIMITS } from "@/lib/config";
import { hashToken } from "@/lib/crypto";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { passwordResetConfirmSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);

    // Tokens are 256-bit, but limiting guesses still removes any doubt.
    const limited = await enforceRateLimit(req, "pwreset-confirm", 10, 10 * 60_000);
    if (limited) return limited;

    const body = passwordResetConfirmSchema.parse(await readJson(req));
    const tokenHash = hashToken(body.token);

    /**
     * Direct indexed lookup.
     *
     * The previous implementation selected *every* user with a non-null reset
     * token and ran a bcrypt comparison against each one — one request cost
     * O(users) bcrypt work, which is a trivial denial-of-service. The token is
     * high-entropy CSPRNG output, so a SHA-256 lookup hash is both safe and
     * O(1), and the expiry check is part of the query.
     */
    const rows = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.resetTokenHash, tokenHash),
          gt(users.resetTokenExpiresAt, new Date()),
        ),
      )
      .limit(1);

    const match = rows[0];
    if (!match) throw new ApiError(400, "This reset link is invalid or has expired.");

    const passwordHash = await bcrypt.hash(body.password, LIMITS.bcryptRounds);

    // Single use: the token is cleared in the same statement that sets the new
    // password, and sessionVersion is bumped so every previously issued token
    // (including one held by an attacker) stops working immediately.
    const [updated] = await db
      .update(users)
      .set({
        passwordHash,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        sessionVersion: (match.sessionVersion ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, match.id), eq(users.resetTokenHash, tokenHash)))
      .returning();

    // The conditional update guarantees exactly one request can consume the
    // token even under a race.
    if (!updated) throw new ApiError(400, "This reset link is invalid or has expired.");

    const token = await createSessionToken({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      avatarUrl: updated.avatarUrl,
      status: updated.status,
      canPublish: updated.canPublish,
      sessionVersion: updated.sessionVersion,
    });
    await setSessionCookie(token);

    return Response.json({ ok: true, message: "Password updated. You are now signed in." });
  } catch (error) {
    return handleApiError(error);
  }
}
