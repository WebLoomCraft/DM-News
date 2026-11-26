import { asc, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ApiError, assertSameOrigin, handleApiError, ok, readJson, requireCapability } from "@/lib/api";
import { userSchema } from "@/lib/validators";
import { sanitizePlainText } from "@/lib/sanitize";
import { roleLevel } from "@/lib/permissions";

export async function GET() {
  try {
    await requireCapability("users.manage");
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        status: users.status,
        canPublish: users.canPublish,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.id));
    return ok({ items: rows });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireCapability("users.manage");
    const input = userSchema.parse(await readJson(req));
    const email = input.email.toLowerCase().trim();
    const clash = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (clash.length) throw new ApiError(409, "A user with that email already exists");
    if (!input.password) throw new ApiError(422, "A password is required for new users");

    const [row] = await db
      .insert(users)
      .values({
        name: sanitizePlainText(input.name),
        email,
        passwordHash: await bcrypt.hash(input.password, 10),
        role: input.role,
        avatarUrl: input.avatarUrl?.trim() || null,
        bio: sanitizePlainText(input.bio ?? "") || null,
        status: input.status ?? "active",
        canPublish: input.canPublish ?? input.role !== "author",
      })
      .returning();
    return ok({ item: { ...row, passwordHash: undefined } }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
