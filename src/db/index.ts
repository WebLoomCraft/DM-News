import { drizzle } from "drizzle-orm/node-postgres";
import fs from "node:fs";
import { Pool, type PoolConfig } from "pg";
import { SUPABASE_ROOT_CA_PEM } from "@/lib/db-ca";
import { isProduction } from "@/lib/config";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

/**
 * Serverless (Vercel) fans out into many short-lived instances, each of which
 * would otherwise open its own small pool. Supabase's pooler caps *sessions*
 * (EMAXCONNSESSION: "max clients are limited to pool_size"), so on port 5432
 * (session mode) a handful of concurrent lambdas is enough to lock the whole
 * site out of the database — every DB-backed page 500s while /api/health,
 * which only runs `select 1`, still looks fine.
 *
 * Transaction mode (port 6543) hands a backend connection back to the pooler
 * after each statement group instead of pinning it to a client for the life of
 * the connection. That is what a serverless workload wants.
 */
function resolveConnectionString(raw: string): string {
  try {
    const url = new URL(raw);
    const isSupabasePooler = url.hostname.includes("pooler.supabase.com");
    const isTransactionMode = url.port === "6543" || url.searchParams.get("pgbouncer") === "true";

    if (isSupabasePooler && !isTransactionMode) {
      url.port = "6543";
      url.searchParams.set("pgbouncer", "true");
    }

    /*
     * pg builds its config as `Object.assign({}, config, parse(connectionString))`,
     * so an `sslmode` in the DSN silently overwrites the explicit `ssl` option
     * below. `sslmode=require` is interpreted by node-postgres as full
     * verification, which fails against the provider's private root. Dropping
     * the TLS query parameters keeps the DSN from overriding verified TLS.
     */
    for (const key of ["sslmode", "uselibpqcompat", "sslrootcert", "sslcert", "sslkey"]) {
      url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return raw;
  }
}

const connectionString = resolveConnectionString(databaseUrl);

/**
 * Supabase (and most managed Postgres providers) require TLS. Local Docker /
 * embedded Postgres instances usually do not offer it, so it is only enabled
 * for remote hosts.
 */
const isLocalHost = /(^|@|\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal|::1)(:|\/|$)/i.test(
  connectionString,
);

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

/**
 * TLS configuration for remote databases.
 *
 * Previously `rejectUnauthorized: false` disabled certificate validation
 * entirely, so anything able to intercept the connection could present any
 * certificate and read or modify every query and password hash in transit.
 * Verification is now on by default.
 *
 * Managed providers (Supabase, Neon, RDS…) present a certificate signed by a
 * public CA, so the system trust store is enough. For a private CA, supply the
 * PEM (or a path to it) in DATABASE_CA_CERT.
 */
/**
 * Supabase signs database certificates with its own root CA ("Supabase Root
 * 2021 CA"), which is not in Node's trust store. Verification therefore fails
 * with UNABLE_TO_VERIFY_LEAF_SIGNATURE / SELF_SIGNED_CERT_IN_CHAIN once
 * `rejectUnauthorized` is on — which would take the whole site down.
 *
 * The answer is NOT to disable verification (that re-opens the original
 * vulnerability: any interceptor could present any certificate). Instead the
 * provider CA is bundled so the chain can be verified against the real root.
 * The certificate is public, pinned in the repo, and its SHA-256 fingerprint is
 * 80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA
 */
function buildSslConfig(): PoolConfig["ssl"] {
  if (isLocalHost) return undefined;

  const mode = (process.env.PGSSLMODE || "").toLowerCase();
  if (mode === "disable") {
    if (isProduction()) {
      throw new Error(
        "PGSSLMODE=disable is not allowed in production. Database traffic must be encrypted and verified.",
      );
    }
    console.warn("[db] TLS disabled for the database connection (non-production only).");
    return undefined;
  }

  /*
   * Anchor verification on the provider root rather than trusting whatever
   * chain the peer presents. DATABASE_CA_CERT overrides for other providers.
   *
   * `rejectUnauthorized: true` stays on: the connection is encrypted AND the
   * server's identity is checked. Disabling verification here would restore the
   * original vulnerability.
   */
  const configuredCa = (process.env.DATABASE_CA_CERT || "").trim();
  if (configuredCa) {
    const ca = configuredCa.includes("BEGIN CERTIFICATE")
      ? configuredCa.replace(/\\n/g, "\n")
      : fs.readFileSync(configuredCa, "utf8");
    return { ca, rejectUnauthorized: true };
  }

  const usesSupabase = connectionString.includes("supabase.co") || connectionString.includes("supabase.com");
  return usesSupabase ? { ca: SUPABASE_ROOT_CA_PEM, rejectUnauthorized: true } : { rejectUnauthorized: true };
}

/**
 * Transaction-mode pooling cannot reuse server-side prepared statements, so a
 * tiny per-instance pool is both correct and plenty: the pooler, not the
 * client, is what multiplexes concurrent queries.
 */
const defaultMax = isServerless ? 2 : 10;

const poolConfig: PoolConfig = {
  connectionString,
  ssl: buildSslConfig(),
  max: Number(process.env.PG_POOL_MAX ?? defaultMax),
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 15_000,
  keepAlive: true,
};

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool = globalForDb.__arenaNextJsPostgresqlPool ?? new Pool(poolConfig);

/**
 * An idle client error (network blip, pooler restart, timeout) would otherwise
 * be emitted as an unhandled 'error' event and take the whole function down.
 */
pool.on("error", (error) => {
  console.error("[db] idle client error:", error.message);
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
