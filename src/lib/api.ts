import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, type SessionUser } from "./session";
import { can, type Capability } from "./permissions";

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return fail(error.message, error.status, error.details);
  }
  if (error instanceof z.ZodError) {
    return fail("Validation failed", 422, error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  }
  console.error("[api-error]", error);
  return fail("Something went wrong on the server", 500);
}

export async function readJson<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "You must be signed in");
  return user;
}

export async function requireCapability(capability: Capability): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, capability)) {
    throw new ApiError(403, "You do not have permission to perform this action");
  }
  return user;
}

/**
 * CSRF hardening: mutating requests from a browser must either be same-origin
 * or carry no Origin header (server-to-server). Combined with the SameSite=Lax
 * session cookie this blocks cross-site form/fetch attacks.
 */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("host");
  if (!host) return;
  try {
    const url = new URL(origin);
    if (url.host !== host) throw new ApiError(403, "Cross origin request blocked");
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(403, "Invalid origin header");
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  if (bucket.count > limit) return false;
  return true;
}

export function tooManyRequests() {
  return fail("Too many requests. Please slow down and try again.", 429);
}

export function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
