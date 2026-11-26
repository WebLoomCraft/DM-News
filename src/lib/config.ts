/**
 * Application configuration and startup validation.
 *
 * Security-relevant settings are validated **once, at startup**, and the
 * process refuses to run in production when something is unsafe. The previous
 * behaviour — quietly deriving a JWT signing key from DATABASE_URL — meant a
 * publicly known value acted as the session secret, so anyone could mint an
 * administrator token. That fallback is gone: production now requires an
 * explicit, high-entropy AUTH_SECRET.
 */

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const MIN_SECRET_LENGTH = 32;

/** Known-weak values that must never be accepted as a signing key. */
const FORBIDDEN_SECRET_VALUES = new Set([
  "secret",
  "changeme",
  "change-me",
  "password",
  "dm-news",
  "development",
  "test",
  "supersecret",
  "your-secret-here",
]);

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

/**
 * Resolves the JWT signing secret.
 *
 * - Production: AUTH_SECRET is mandatory and must be high entropy.
 * - Development: a clearly-labelled, per-process random secret is generated so
 *   `npm run dev` still works, but it is never reused and never derived from
 *   another secret that might leak.
 *
 * Returns the raw secret plus a stable fingerprint used for key rotation.
 */
let cachedDevSecret: string | null = null;

export function getAuthSecret(): { secret: string; fingerprint: string } {
  const configured = (process.env.AUTH_SECRET || process.env.SESSION_SECRET || "").trim();

  if (!configured) {
    // The production check must run BEFORE any development fallback so a
    // misconfigured deploy can never pick up an ephemeral key.
    if (isProduction()) {
      throw new ConfigError(
        "AUTH_SECRET is not set. Generate one with `openssl rand -base64 48` and set it in the environment.",
      );
    }
    if (!cachedDevSecret) {
      // Random per process: a restart invalidates old dev sessions, which is
      // the safe direction. Never derived from DATABASE_URL or any other value.
      cachedDevSecret = require("node:crypto").randomBytes(48).toString("base64");
      console.warn("[config] AUTH_SECRET is unset — using an ephemeral development secret. Sessions reset on restart.");
    }
    return { secret: cachedDevSecret as string, fingerprint: "dev-ephemeral" };
  }

  if (configured.length < MIN_SECRET_LENGTH) {
    throw new ConfigError(`AUTH_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`);
  }
  if (FORBIDDEN_SECRET_VALUES.has(configured.toLowerCase())) {
    throw new ConfigError("AUTH_SECRET is a well-known weak value. Generate a random secret.");
  }
  // Reject low-entropy strings such as 32 identical characters.
  if (new Set(configured).size < 8) {
    throw new ConfigError("AUTH_SECRET has too little entropy. Generate a random secret.");
  }

  // Fingerprint lets us rotate tokens when the secret itself changes, without
  // ever persisting the secret. First 8 bytes of SHA-256 is not reversible.
  const crypto = require("node:crypto") as typeof import("node:crypto");
  const fingerprint = crypto.createHash("sha256").update(configured).digest("hex").slice(0, 16);

  return { secret: configured, fingerprint };
}

/**
 * Canonical public origin. Password-reset links are built from this value and
 * never from the request's Origin/Host header, which an attacker controls.
 */
export function getCanonicalSiteUrl(): string {
  const configured =
    process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "";

  const raw = configured.trim();
  if (!raw) {
    if (isProduction()) {
      throw new ConfigError(
        "SITE_URL is not set. Password-reset links are built from this canonical URL; set it to the public origin (e.g. https://example.com).",
      );
    }
    return "http://localhost:3000";
  }

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new ConfigError(`SITE_URL is not a valid URL: ${raw}`);
  }
  if (isProduction() && parsed.protocol !== "https:") {
    throw new ConfigError("SITE_URL must use https in production so reset links and cookies are not sent in clear text.");
  }
  return parsed.origin;
}

/**
 * Trusted proxy count for client-IP resolution.
 *
 * On Vercel the platform appends to X-Forwarded-For, so the *last* entry is
 * the one the platform observed. Values to the left are client supplied and
 * must never be trusted for rate limiting or lockouts.
 */
export function getTrustedProxyHops(): number {
  // Note: Number("") === 0, so an unset variable must be checked as a string
  // first — otherwise "unset" would silently mean "trust nobody", which makes
  // the leftmost, client-supplied X-Forwarded-For value authoritative.
  const configured = (process.env.TRUSTED_PROXY_HOPS || "").trim();
  if (configured !== "") {
    const parsed = Number(configured);
    if (Number.isInteger(parsed) && parsed >= 0) return parsed;
    console.warn(`[config] TRUSTED_PROXY_HOPS="${configured}" is not a non-negative integer; using the default.`);
  }
  // Vercel and most managed platforms put exactly one proxy in front of us.
  return isProduction() ? 1 : 0;
}

export const LIMITS = {
  /** bcrypt cost. 12 is the current floor for passwords; keep it explicit. */
  bcryptRounds: 12,
  /** Session lifetime in seconds — short enough to bound a stolen token. */
  sessionMaxAgeSeconds: Number(process.env.SESSION_MAX_AGE_SECONDS ?? 60 * 60 * 8),
  /** Password-reset link lifetime. */
  resetTokenTtlMs: 30 * 60 * 1000,
  /** Maximum accepted image dimension on either axis. */
  maxImageDimension: 12_000,
  /** Maximum pixels (width × height) to keep decode cost bounded. */
  maxImagePixels: 40_000_000,
} as const;

/**
 * Fails fast on a misconfigured production environment. Called from
 * instrumentation so a bad deploy errors at boot rather than on first login.
 * Never logs secret values.
 */
export function validateStartupConfig(): void {
  const problems: string[] = [];
  try {
    getAuthSecret();
  } catch (error) {
    problems.push((error as Error).message);
  }
  try {
    getCanonicalSiteUrl();
  } catch (error) {
    problems.push((error as Error).message);
  }
  if (isProduction() && isDatabaseTlsDisabled()) {
    problems.push(
      "Database TLS verification is disabled. Unset PGSSLMODE=disable / DATABASE_SSL_NO_VERIFY so the server certificate is verified.",
    );
  }
  if (problems.length) {
    throw new ConfigError(`Insecure configuration:\n - ${problems.join("\n - ")}`);
  }
}

function isDatabaseTlsDisabled(): boolean {
  return (process.env.PGSSLMODE || "").toLowerCase() === "disable" || process.env.DATABASE_SSL_NO_VERIFY === "true";
}
