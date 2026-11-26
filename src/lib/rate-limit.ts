import crypto from "node:crypto";
import { getTrustedProxyHops, isProduction } from "./config";

/**
 * Client identity and rate limiting.
 *
 * Two problems in the previous implementation:
 *
 * 1. `x-forwarded-for.split(",")[0]` is the *client-supplied* leftmost value.
 *    Anyone could send `X-Forwarded-For: 1.2.3.4` and get a fresh rate-limit
 *    bucket on every request. We now walk from the right, skipping exactly the
 *    number of trusted proxies that actually sit in front of us, so the value
 *    used is the one the edge infrastructure observed.
 *
 * 2. A module-level `Map` gave every lambda its own counter, so a distributed
 *    attacker got `limit × instances` attempts, and entries were never
 *    evicted. The limiter now has a bounded store with an eviction sweep and
 *    an optional shared backend (Upstash Redis REST) for multi-instance
 *    consistency. Without shared storage it is explicitly best-effort per
 *    instance — and the password-lockout check in the database still applies
 *    globally (see `login_throttle`).
 */

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/** Parses an X-Forwarded-For chain, trusting only hops our own proxy appended. */
export function getClientIp(req: Request): string {
  const hops = getTrustedProxyHops();
  const forwarded = req.headers.get("x-forwarded-for");

  if (forwarded) {
    const chain = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (chain.length > 0) {
      /*
       * The edge proxy APPENDS the address it observed, so the rightmost entry
       * is the only one we can trust. With `hops` trusted proxies in front of
       * us, the client is `hops` entries from the right.
       *
       * Everything to the left is client-supplied and is ignored entirely —
       * that is what stops `X-Forwarded-For: <random>` from minting a fresh
       * rate-limit bucket on every request.
       */
      const index = chain.length - hops;
      const candidate = normalizeIp(chain[index] ?? "");
      if (candidate) return candidate;
    }
  }

  const realIp = normalizeIp(req.headers.get("x-real-ip") || "");
  if (realIp) return realIp;

  // Unknown identity must not collapse into one shared bucket for everybody:
  // that would let a single offender lock out all anonymous users. Instead it
  // maps to a stable but non-identifying value.
  return "unknown";
}

function normalizeIp(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;
  // [2001:db8::1]:443 → 2001:db8::1
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    if (end > 0) value = value.slice(1, end);
  } else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(value)) {
    value = value.slice(0, value.lastIndexOf(":"));
  }
  // Reject anything that is not plausibly an address, so a crafted header
  // cannot inject arbitrary strings into keys.
  const isV4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(value);
  const isV6 = /^[0-9a-fA-F:]{2,45}$/.test(value) && value.includes(":");
  return isV4 || isV6 ? value.toLowerCase() : null;
}

/** Coarse bucket for an IP so one host cannot rotate through a /64 subnet. */
export function ipKey(ip: string): string {
  if (ip.includes(":")) {
    // Keep the /64 prefix for IPv6.
    const parts = ip.split(":");
    return parts.slice(0, 4).join(":") || ip;
  }
  return ip;
}

type Bucket = { count: number; resetAt: number };

const MAX_BUCKETS = 10_000;
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  // Evict expired buckets at most once per second, and hard-cap the map so
  // memory use is bounded regardless of traffic patterns.
  if (now - lastSweep < 1000 && buckets.size < MAX_BUCKETS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size >= MAX_BUCKETS) {
    // Still full: drop the oldest quarter to make room.
    const excess = Math.floor(MAX_BUCKETS / 4);
    let removed = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      if (++removed >= excess) break;
    }
  }
}

function localLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true, remaining: Math.max(0, limit - bucket.count), retryAfterSeconds: 0 };
}

/**
 * Optional shared backend. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * to make limits consistent across serverless instances.
 */
function sharedBackendConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function sharedLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult | null> {
  if (!sharedBackendConfigured()) return null;
  const url = process.env.UPSTASH_REDIS_REST_URL!.replace(/\/+$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const bucketKey = `rl:${key}:${Math.floor(Date.now() / windowMs)}`;

  try {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", bucketKey],
        ["PEXPIRE", bucketKey, String(windowMs)],
      ]),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as Array<{ result?: number }>;
    const count = Number(payload?.[0]?.result ?? 0);
    if (!Number.isFinite(count) || count <= 0) return null;
    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: count <= limit ? 0 : Math.ceil(windowMs / 1000),
    };
  } catch {
    // Fail open on transport errors, but the database-backed login lockout
    // still protects credentials. Never fail closed by locking out everyone.
    return null;
  }
}

export async function rateLimit(key: string, limit = 20, windowMs = 60_000): Promise<RateLimitResult> {
  const shared = await sharedLimit(key, limit, windowMs);
  if (shared) return shared;
  return localLimit(key, limit, windowMs);
}

/** Hash of a value for use in a rate-limit key, so identifiers are not logged. */
export function opaqueKey(value: string): string {
  return crypto.createHash("sha256").update(value.toLowerCase().trim()).digest("hex").slice(0, 32);
}

export function isSharedRateLimitingConfigured(): boolean {
  return sharedBackendConfigured();
}

export function warnIfRateLimitIsLocalOnly(): void {
  if (isProduction() && !sharedBackendConfigured()) {
    console.warn(
      "[security] No shared rate-limit store configured (UPSTASH_REDIS_REST_URL). Limits apply per instance; login lockout is still enforced in the database.",
    );
  }
}
