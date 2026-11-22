import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ApiError, assertSameOrigin, handleApiError, readJson, requireUser } from "@/lib/api";
import { can } from "@/lib/permissions";
import { changePasswordSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const currentUser = await requireUser();
    const body = changePasswordSchema.parse(await readJson(req));

    const isAdminReset = body.userId && body.userId !== currentUser.id;
    if (isAdminReset && !can(currentUser, "users.manage")) {
      throw new ApiError(403, "Only a super administrator can reset another user's password");
    }

    const targetId = isAdminReset ? body.userId! : currentUser.id;
    const rows = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
    const target = rows[0];
    if (!target) throw new ApiError(404, "User not found");

    if (!isAdminReset) {
      if (!body.currentPassword) throw new ApiError(400, "Current password is required");
      const valid = await bcrypt.compare(body.currentPassword, target.passwordHash);
      if (!valid) throw new ApiError(401, "Current password is incorrect");
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash, resetTokenHash: null, resetTokenExpiresAt: null, updatedAt: new Date() })
      .where(eq(users.id, targetId));

    return Response.json({ ok: true, message: isAdminReset ? "Password reset for that account." : "Password updated." });
  } catch (error) {
    return handleApiError(error);
  }
}
