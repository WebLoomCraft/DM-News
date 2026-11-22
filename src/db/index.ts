import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

/**
 * Supabase (and most managed Postgres providers) require TLS. Local Docker /
 * embedded Postgres instances usually do not offer it, so it is only enabled
 * for remote hosts.
 */
const isLocalHost = /(^|@|\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal|::1)(:|\/|$)/i.test(
  databaseUrl,
);

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl: isLocalHost ? undefined : { rejectUnauthorized: false },
    // Serverless functions are short-lived and fan out; a small pool per
    // instance keeps us well inside the Supabase connection limit while
    // recycling idle sockets before the pooler drops them.
    max: Number(process.env.PG_POOL_MAX ?? 5),
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
  });

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
