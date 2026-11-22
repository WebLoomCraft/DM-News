import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { users, type UserRow } from "@/db/schema";
import { eq } from "drizzle-orm";

export const SESSION_COOKIE = "dm_session";

function getSecret(): Uint8Array {
  const base = process.env.AUTH_SECRET || process.env.SESSION_SECRET || `${process.env.DATABASE_URL || "dm-news"}::dm-news-network-session-key`;
  return new TextEncoder().encode(base.padEnd(48, "!").slice(0, 64));
}

export type SessionUser = Pick<
  UserRow,
  "id" | "name" | "email" | "role" | "avatarUrl" | "status" | "canPublish"
>;

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ role: user.role, name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<{ id: number; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (!id) return null;
    return { id, role: String(payload.role || "author") };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export const getSessionUserId = cache(async (): Promise<number | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  return payload?.id ?? null;
});

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const id = await getSessionUserId();
  if (!id) return null;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const user = rows[0];
  if (!user || user.status !== "active") return null;
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
