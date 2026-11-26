import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ApiError, assertSameOrigin, enforceRateLimit, handleApiError, readJson, requireUser } from "@/lib/api";
import { LIMITS } from "@/lib/config";
import { can, roleLevel } from "@/lib/permissions";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { changePasswordSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const currentUser = await requireUser();

    // Password attempts are a credential-guessing surface too.
    const limited = await enforceRateLimit(req, "pwchange", 5, 10 * 60_000);
    if (limited) return limited;

    const body = changePasswordSchema.parse(await readJson(req));

    const isAdminReset = body.userId && body.userId !== currentUser.id;
    if (isAdminReset && !can(currentUser, "users.manage")) {
      throw new ApiError(403, "Only a super administrator can reset another user's password");
    }

    const targetId = isAdminReset ? body.userId! : currentUser.id;
    const rows = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
    const target = rows[0];
    if (!target) throw new ApiError(404, "User not found");

    // Privilege boundary: nobody may reset the password of an account at or
    // above their own level (unless it is their own account). Without this, an
    // admin could take over a super_admin by setting its password.
    if (isAdminReset && roleLevel(target.role) >= roleLevel(currentUser.role)) {
      throw new ApiError(403, "You cannot reset the password of an account at or above your own role");
    }

    if (!isAdminReset) {
      if (!body.currentPassword) throw new ApiError(400, "Current password is required");
      const valid = await bcrypt.compare(body.currentPassword, target.passwordHash);
      if (!valid) throw new ApiError(401, "Current password is incorrect");
    }

    const passwordHash = await bcrypt.hash(body.newPassword, LIMITS.bcryptRounds);
    const [updated] = await db
      .update(users)
      .set({
        passwordHash,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        // Invalidate every existing session for this user.
        sessionVersion: sql`${users.sessionVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetId))
      .returning();

    if (!isAdminReset && updated) {
      // Re-issue a session for the person who just changed their own password,
      // so they are not signed out of the tab they are using.
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
    }

    return Response.json({ ok: true, message: isAdminReset ? "Password reset for that account." : "Password updated." });
  } catch (error) {
    return handleApiError(error);
  }
}
