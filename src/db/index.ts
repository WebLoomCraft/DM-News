import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

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
 * Transaction-mode pooling cannot reuse server-side prepared statements, so a
 * tiny per-instance pool is both correct and plenty: the pooler, not the
 * client, is what multiplexes concurrent queries.
 */
const defaultMax = isServerless ? 2 : 10;

const poolConfig: PoolConfig = {
  connectionString,
  ssl: isLocalHost ? undefined : { rejectUnauthorized: false },
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
