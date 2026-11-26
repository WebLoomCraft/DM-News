import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, type SessionUser } from "./session";
import { can, type Capability } from "./permissions";
import { getCanonicalSiteUrl } from "./config";
import { getClientIp, rateLimit, type RateLimitResult } from "./rate-limit";

export { getClientIp, rateLimit };

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

/** Hard cap on JSON request bodies (article bodies are the largest legit payload). */
const MAX_JSON_BYTES = 2 * 1024 * 1024;

export async function readJson<T = unknown>(req: Request): Promise<T> {
  // Reject oversized bodies before buffering them into memory.
  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) {
    throw new ApiError(413, "Request body is too large");
  }
  try {
    const text = await req.text();
    if (text.length > MAX_JSON_BYTES) throw new ApiError(413, "Request body is too large");
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
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
 * CSRF / cross-origin protection for state-changing requests.
 *
 * SameSite=Lax on the session cookie is not sufficient on its own: it does not
 * cover every browser/legacy path, and it says nothing about requests made by
 * an authenticated *server-side* caller. So every mutating route additionally
 * requires the request to originate from our own canonical origin.
 *
 * Decision rules:
 *  - Origin (or Referer) present  → must match the canonical site origin or the
 *    request Host. Mismatch is rejected.
 *  - Both absent                  → only allowed when the request also lacks
 *    cookies, i.e. a genuine server-to-server call with a bearer credential.
 *    A browser form/fetch always sends at least one of them on cross-site
 *    POSTs, so this closes the classic CSRF gap without breaking API clients.
 */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");

  const allowed = new Set<string>();
  if (host) allowed.add(host.toLowerCase());
  try {
    allowed.add(new URL(getCanonicalSiteUrl()).host.toLowerCase());
  } catch {
    /* misconfiguration is surfaced at startup, not here */
  }

  const source = origin || referer;
  if (!source) {
    // No browser context. Reject if the request carries ambient credentials,
    // because that is exactly the shape of a CSRF request from a client that
    // omitted Origin.
    if (req.headers.get("cookie")) {
      throw new ApiError(403, "Cross origin request blocked");
    }
    return;
  }

  let sourceHost: string;
  try {
    sourceHost = new URL(source, `https://${host ?? "invalid"}`).host.toLowerCase();
  } catch {
    throw new ApiError(403, "Invalid origin header");
  }

  if (!allowed.has(sourceHost)) {
    throw new ApiError(403, "Cross origin request blocked");
  }

  /*
   * Scheme check runs in every environment, not just production: an
   * http:// origin for the right host is still a downgrade (a network attacker
   * can inject it), and tests caught that it previously slipped through when
   * NODE_ENV was not "production".
   */
  if (origin) {
    let scheme: string;
    try {
      scheme = new URL(origin).protocol;
    } catch {
      throw new ApiError(403, "Invalid origin header");
    }
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (scheme !== "https:" && !isLocal) {
      throw new ApiError(403, "Insecure origin blocked");
    }
  }
}

/** Returns a 429 response when the limit is exceeded, otherwise null. */
export async function enforceRateLimit(
  req: Request,
  bucket: string,
  limit: number,
  windowMs: number,
): Promise<Response | null> {
  const result: RateLimitResult = await rateLimit(`${bucket}:${getClientIp(req)}`, limit, windowMs);
  if (result.ok) return null;
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}

export function tooManyRequests(retryAfterSeconds = 60) {
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
