import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  ApiError,
  assertSameOrigin,
  enforceRateLimit,
  getClientIp,
  handleApiError,
  readJson,
  tooManyRequests,
} from "@/lib/api";
import { checkLoginThrottle, clearLoginFailures, recordLoginFailure } from "@/lib/login-throttle";
import { createSessionToken, setSessionCookie, toPublicUser } from "@/lib/session";
import { loginSchema } from "@/lib/validators";

/**
 * A dummy hash keeps the bcrypt comparison cost identical for unknown emails,
 * so response timing cannot be used to enumerate accounts.
 */
const DUMMY_HASH = "$2b$12$oaywe1PKg34htvlDbjzRse/J2Jg.WrJfN/UL553wmzexwj1JViexq";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const ip = getClientIp(req);

    // Per-instance burst limit.
    const limited = await enforceRateLimit(req, "login", 10, 60_000);
    if (limited) return limited;

    const body = loginSchema.parse(await readJson(req));
    const email = body.email.toLowerCase().trim();

    // Shared, database-backed lockout: holds across every lambda instance and
    // cannot be bypassed by rotating X-Forwarded-For.
    const verdict = await checkLoginThrottle(email, ip);
    if (!verdict.allowed) {
      return tooManyRequests(verdict.retryAfterSeconds);
    }

    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];

    const valid = await bcrypt.compare(body.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) {
      await recordLoginFailure(email, ip);
      throw new ApiError(401, "Invalid email or password");
    }
    if (user.status !== "active") {
      await recordLoginFailure(email, ip);
      throw new ApiError(401, "Invalid email or password");
    }

    await clearLoginFailures(email);

    const token = await createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      status: user.status,
      canPublish: user.canPublish,
      sessionVersion: user.sessionVersion,
    });
    await setSessionCookie(token);
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    return Response.json({ ok: true, user: toPublicUser(user) });
  } catch (error) {
    return handleApiError(error);
  }
}
