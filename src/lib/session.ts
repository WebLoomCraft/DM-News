import crypto from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { users, type UserRow } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthSecret, LIMITS, isProduction } from "./config";
import { openSessionState, sealSessionState } from "./crypto";

export const SESSION_COOKIE = "dm_session";

const ISSUER = "dm-news-network";
const AUDIENCE = "dm-news-admin";

function getSecret(): Uint8Array {
  // Throws in production when AUTH_SECRET is missing or weak — there is no
  // predictable fallback any more.
  return new TextEncoder().encode(getAuthSecret().secret);
}

export type SessionUser = Pick<
  UserRow,
  "id" | "name" | "email" | "role" | "avatarUrl" | "status" | "canPublish"
>;

export type SessionTokenInput = SessionUser & {
  /**
   * Session version read from the database. A password change or reset
   * increments it, which invalidates every token issued before that moment.
   */
  sessionVersion?: number;
};

export async function createSessionToken(user: SessionTokenInput): Promise<string> {
  // Opaque, authenticated handle carrying the session version. Encrypting it
  // means the client can neither read nor forge the revocation state.
  const sealed = sealSessionState({
    sid: crypto.randomBytes(16).toString("base64url"),
    ver: user.sessionVersion ?? 0,
  });

  return new SignJWT({ role: user.role, name: user.name, email: user.email, sv: sealed })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(user.id))
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${LIMITS.sessionMaxAgeSeconds}s`)
    .setJti(crypto.randomUUID())
    .sign(getSecret());
}

export type VerifiedSession = { id: number; role: string; sessionVersion: number };

export async function verifySessionToken(token: string): Promise<VerifiedSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) return null;

    // Without a well-formed, authenticated session state the token cannot be
    // revoked, so it is rejected rather than trusted.
    const sv = typeof payload.sv === "string" ? payload.sv : "";
    const state = sv ? openSessionState(sv) : null;
    if (!state) return null;

    return { id, role: String(payload.role || "author"), sessionVersion: state.ver };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: LIMITS.sessionMaxAgeSeconds,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: 0,
  });
}

export const getSessionUserId = cache(async (): Promise<number | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  return payload?.id ?? null;
});

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const rows = await db.select().from(users).where(eq(users.id, payload.id)).limit(1);
  const user = rows[0];
  if (!user || user.status !== "active") return null;

  // Session revocation: a stale token (issued before the last password change
  // or forced sign-out) is rejected even though its signature is still valid.
  if (payload.sessionVersion !== user.sessionVersion) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    status: user.status,
    canPublish: user.canPublish,
  };
});

/**
 * Invalidates every session for a user. Call on password change, password
 * reset, privilege change, or account suspension.
 */
export async function revokeUserSessions(userId: number): Promise<void> {
  await db
    .update(users)
    .set({ sessionVersion: sqlIncrement(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

function sqlIncrement() {
  // Drizzle expression: users.session_version + 1
  return sql`${users.sessionVersion} + 1`;
}

export function toPublicUser(user: SessionUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    canPublish: user.canPublish,
  };
}
