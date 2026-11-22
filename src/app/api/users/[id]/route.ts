import { count, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { articles, users } from "@/db/schema";
import { ApiError, handleApiError, ok, readJson, requireCapability, requireUser } from "@/lib/api";
import { sanitizePlainText } from "@/lib/sanitize";
import { roleLevel } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const currentUser = await requireCapability("users.manage");
    const { id } = await ctx.params;
    const userId = Number(id);
    if (!Number.isFinite(userId)) throw new ApiError(400, "Invalid user id");
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const existing = rows[0];
    if (!existing) throw new ApiError(404, "User not found");

    const body = await readJson<{
      name?: string;
      email?: string;
      role?: string;
      avatarUrl?: string | null;
      bio?: string | null;
      status?: string;
      canPublish?: boolean;
      password?: string;
    }>(req);

    if (userId === currentUser.id) {
      if (body.role && body.role !== currentUser.role) throw new ApiError(403, "You cannot change your own role");
      if (body.status && body.status !== "active") throw new ApiError(403, "You cannot suspend your own account");
    }
    if (body.role && roleLevel(body.role) > roleLevel(currentUser.role)) {
      throw new ApiError(403, "You cannot grant a role higher than your own");
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = sanitizePlainText(body.name);
    if (body.email !== undefined) {
      const email = body.email.toLowerCase().trim();
      const clash = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (clash.length && clash[0]!.id !== userId) throw new ApiError(409, "That email is already in use");
      patch.email = email;
    }
    if (body.role !== undefined) patch.role = body.role;
    if (body.avatarUrl !== undefined) patch.avatarUrl = body.avatarUrl?.trim() || null;
    if (body.bio !== undefined) patch.bio = sanitizePlainText(body.bio) || null;
    if (body.status !== undefined) patch.status = body.status;
    if (body.canPublish !== undefined) patch.canPublish = Boolean(body.canPublish);
    if (body.password) {
      if (body.password.length < 8) throw new ApiError(422, "Password must be at least 8 characters");
      patch.passwordHash = await bcrypt.hash(body.password, 10);
      patch.resetTokenHash = null;
      patch.resetTokenExpiresAt = null;
    }

    const [row] = await db.update(users).set(patch).where(eq(users.id, userId)).returning();
    const { passwordHash: _ignored, ...safe } = row!;
    return ok({ item: safe });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const currentUser = await requireCapability("users.manage");
    const { id } = await ctx.params;
    const userId = Number(id);
    if (!Number.isFinite(userId)) throw new ApiError(400, "Invalid user id");
    if (userId === currentUser.id) throw new ApiError(403, "You cannot delete your own account");

    const remainingAdmins = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.role, "super_admin"));
    const target = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (target[0]?.role === "super_admin" && (remainingAdmins[0]?.value ?? 0) <= 1) {
      throw new ApiError(409, "At least one super administrator must remain");
    }

    await db.update(articles).set({ createdById: null }).where(eq(articles.createdById, userId));
    await db.delete(users).where(eq(users.id, userId));
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
