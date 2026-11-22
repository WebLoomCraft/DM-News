import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  ApiError,
  assertSameOrigin,
  getClientIp,
  handleApiError,
  rateLimit,
  readJson,
  tooManyRequests,
} from "@/lib/api";
import { createSessionToken, setSessionCookie, toPublicUser } from "@/lib/session";
import { loginSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const ip = getClientIp(req);
    if (!rateLimit(`login:${ip}`, 8, 60_000)) return tooManyRequests();

    const body = loginSchema.parse(await readJson(req));
    const rows = await db.select().from(users).where(eq(users.email, body.email.toLowerCase())).limit(1);
    const user = rows[0];

    const valid = user ? await bcrypt.compare(body.password, user.passwordHash) : false;
    if (!user || !valid) {
      throw new ApiError(401, "Invalid email or password");
    }
    if (user.status !== "active") {
      throw new ApiError(403, "This account has been suspended. Contact a super administrator.");
    }

    const token = await createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      status: user.status,
      canPublish: user.canPublish,
    });
    await setSessionCookie(token);
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    return Response.json({ ok: true, user: toPublicUser({ ...user, status: user.status }) });
  } catch (error) {
    return handleApiError(error);
  }
}
