import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { loginThrottle } from "@/db/schema";
import { opaqueKey } from "./rate-limit";

/**
 * Database-backed credential throttling.
 *
 * Per-instance memory cannot protect a login endpoint on serverless: an
 * attacker simply spreads requests across lambda instances. This table is the
 * shared source of truth, so lockouts hold no matter which instance answers.
 *
 * Keys are SHA-256 hashes of the email or IP, so the table never stores raw
 * identifiers.
 */

const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;

export type ThrottleVerdict = { allowed: boolean; retryAfterSeconds: number };

function windowStart(): Date {
  return new Date(Date.now() - WINDOW_MS);
}

/** Checks both the email and IP buckets before attempting a login. */
export async function checkLoginThrottle(email: string, ip: string): Promise<ThrottleVerdict> {
  const keys = [`email:${opaqueKey(email)}`, `ip:${opaqueKey(ip)}`];
  const since = windowStart();

  const rows = await db
    .select({ key: loginThrottle.key, attempts: loginThrottle.attempts, createdAt: loginThrottle.createdAt })
    .from(loginThrottle)
    .where(inArray(loginThrottle.key, keys));

  for (const row of rows) {
    if (row.createdAt < since) continue;
    if (row.attempts >= MAX_FAILURES) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((row.createdAt.getTime() + WINDOW_MS - Date.now()) / 1000)),
      };
    }
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Records a failed attempt against both the email and the IP bucket. */
export async function recordLoginFailure(email: string, ip: string): Promise<void> {
  const entries = [
    { key: `email:${opaqueKey(email)}`, kind: "email" },
    { key: `ip:${opaqueKey(ip)}`, kind: "ip" },
  ];

  for (const entry of entries) {
    const since = windowStart();
    // Reset the counter once the window has rolled over.
    await db
      .delete(loginThrottle)
      .where(and(eq(loginThrottle.key, entry.key), sql`${loginThrottle.createdAt} < ${since}`));

    await db
      .insert(loginThrottle)
      .values({ key: entry.key, kind: entry.kind, attempts: 1 })
      .onConflictDoUpdate({
        target: loginThrottle.key,
        set: { attempts: sql`${loginThrottle.attempts} + 1`, updatedAt: new Date() },
      });
  }
}

/** Clears the email bucket after a successful sign-in. */
export async function clearLoginFailures(email: string): Promise<void> {
  await db.delete(loginThrottle).where(eq(loginThrottle.key, `email:${opaqueKey(email)}`));
}
