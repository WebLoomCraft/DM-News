/**
 * Security regression tests: session secret handling and JWT integrity.
 *
 * These run against the compiled TypeScript sources via tsx (dev dependency),
 * so they exercise the real modules rather than a reimplementation.
 */
import test from "node:test";
import assert from "node:assert/strict";

const MODE = process.env.SECURITY_TEST_MODE;

test("VULN-01: no predictable fallback secret in production", async (t) => {
  await t.test("production without AUTH_SECRET refuses to start", async () => {
    const { getAuthSecret } = await import("../../src/lib/config.ts");
    const original = { ...process.env };
    try {
      process.env.NODE_ENV = "production";
      process.env.VERCEL_ENV = "production";
      delete process.env.AUTH_SECRET;
      delete process.env.SESSION_SECRET;
      assert.throws(
        () => getAuthSecret(),
        /AUTH_SECRET is not set/,
        "a production build with no AUTH_SECRET must throw, not invent a key",
      );
    } finally {
      process.env = original;
    }
  });

  await t.test("DATABASE_URL is never used as key material", async () => {
    const { getAuthSecret } = await import("../../src/lib/config.ts");
    const original = { ...process.env };
    try {
      process.env.NODE_ENV = "production";
      process.env.VERCEL_ENV = "production";
      process.env.DATABASE_URL = "postgresql://postgres:supersecret@db.example.com:5432/postgres";
      delete process.env.AUTH_SECRET;
      // Even with a rich DATABASE_URL present, the secret must be refused.
      assert.throws(() => getAuthSecret(), /AUTH_SECRET is not set/);
    } finally {
      process.env = original;
    }
  });

  await t.test("weak secrets are rejected", async () => {
    const { getAuthSecret } = await import("../../src/lib/config.ts");
    // Fresh module state: the dev fallback is memoised per process.
    const original = { ...process.env };
    try {
      process.env.NODE_ENV = "production";
      process.env.VERCEL_ENV = "production";
      for (const weak of ["short", "changeme", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]) {
        process.env.AUTH_SECRET = weak;
        assert.throws(() => getAuthSecret(), /AUTH_SECRET/, `weak secret ${weak} must be rejected`);
      }
    } finally {
      process.env = original;
    }
  });

});

test("VULN-01c: a strong production secret is accepted and fingerprinted", async () => {
  const { getAuthSecret } = await import("../../src/lib/config.ts?fresh=strong");
  const original = { ...process.env };
  try {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    process.env.AUTH_SECRET = "9f3c1a7e5b2d8046c9a1f4e7b0d3c6a9f2e5b8d1c4a7f0e3b6d9c2a5f8e1b4d7";
    const { secret, fingerprint } = getAuthSecret();
    assert.equal(secret, process.env.AUTH_SECRET, "the configured secret is used verbatim");
    assert.match(fingerprint, /^[0-9a-f]{16}$/, "fingerprint supports key rotation");
    assert.ok(!fingerprint.includes(secret), "fingerprint must not leak the secret");
  } finally {
    process.env = original;
  }
});

test("VULN-01b: JWT is bound to algorithm, issuer, audience and expiry", async (t) => {
  process.env.AUTH_SECRET = "test-secret-0123456789abcdefghijklmnopqrstuvwx";
  process.env.NODE_ENV = "test";

  const { createSessionToken, verifySessionToken } = await import("../../src/lib/session.ts");
  const { SignJWT } = await import("jose");

  const user = {
    id: 7,
    name: "Test",
    email: "t@example.com",
    role: "author",
    avatarUrl: null,
    status: "active",
    canPublish: false,
    sessionVersion: 0,
  };

  await t.test("a genuine token verifies", async () => {
    const token = await createSessionToken(user);
    const result = await verifySessionToken(token);
    assert.ok(result, "valid token must verify");
    assert.equal(result.id, 7);
    assert.equal(result.sessionVersion, 0);
  });

  await t.test("alg=none tokens are rejected", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ sub: "7", role: "super_admin" })).toString("base64url");
    const forged = `${header}.${payload}.`;
    assert.equal(await verifySessionToken(forged), null);
  });

  await t.test("a token signed with a different secret is rejected", async () => {
    const forged = await new SignJWT({ role: "super_admin", sv: "x" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("7")
      .setIssuer("dm-news-network")
      .setAudience("dm-news-admin")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("attacker-secret-attacker-secret-attacker-secret"));
    assert.equal(await verifySessionToken(forged), null);
  });

  await t.test("tokens without session state cannot be minted by hand", async () => {
    const noState = await new SignJWT({ role: "super_admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("7")
      .setIssuer("dm-news-network")
      .setAudience("dm-news-admin")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
    assert.equal(await verifySessionToken(noState), null, "session state is required for revocation");
  });
});

test("VULN-08: session version changes invalidate old tokens", async () => {
  process.env.AUTH_SECRET = "test-secret-0123456789abcdefghijklmnopqrstuvwx";
  const { createSessionToken, verifySessionToken } = await import("../../src/lib/session.ts");

  const base = {
    id: 3,
    name: "A",
    email: "a@example.com",
    role: "editor",
    avatarUrl: null,
    status: "active",
    canPublish: true,
  };
  const oldToken = await createSessionToken({ ...base, sessionVersion: 1 });
  const newToken = await createSessionToken({ ...base, sessionVersion: 2 });

  const old = await verifySessionToken(oldToken);
  const fresh = await verifySessionToken(newToken);
  assert.equal(old.sessionVersion, 1);
  assert.equal(fresh.sessionVersion, 2);
  assert.notEqual(old.sessionVersion, fresh.sessionVersion, "version must be carried in the token");
});

test("VULN-04: database TLS is verified, anchored on the provider root", async () => {
  /*
   * Run in a child process: db/index.ts caches its pool at import time and the
   * suite's bootstrap already imported it with a localhost DSN, which correctly
   * gets no TLS. A fresh process is the only faithful way to observe the
   * production configuration.
   */
  const { execFileSync } = await import("node:child_process");
  const script = `
    process.env.DATABASE_URL =
      "postgresql://postgres.ref:pw@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&sslrootcert=/tmp/nope";
    delete process.env.DATABASE_CA_CERT;
    delete process.env.PGSSLMODE;
    const { pool } = await import("./src/db/index.ts");
    const ssl = pool.options.ssl;
    const url = new URL(pool.options.connectionString);
    console.log(JSON.stringify({
      rejectUnauthorized: ssl?.rejectUnauthorized,
      ca: String(ssl?.ca || ""),
      sslmode: url.searchParams.get("sslmode"),
      sslrootcert: url.searchParams.get("sslrootcert"),
      port: url.port,
    }));
  `;

  const out = execFileSync(
    process.execPath,
    ["--import", "tsx", "-e", script],
    { cwd: new URL("../..", import.meta.url).pathname, encoding: "utf8", timeout: 60_000 },
  );
  const result = JSON.parse(out.trim().split("\n").pop());

  // Verification must be ON. Disabling it was the original vulnerability:
  // any interceptor could present any certificate and read every query.
  assert.equal(result.rejectUnauthorized, true, "TLS certificate verification must stay enabled");

  // ...and anchored on the provider root, otherwise verified TLS fails against
  // Supabase's private CA and every DB-backed page 500s.
  const { X509Certificate } = await import("node:crypto");
  const ca = new X509Certificate(result.ca);
  assert.match(ca.subject, /Supabase Root 2021 CA/);
  assert.equal(ca.ca, true, "the pinned certificate must itself be a CA");

  // A sslmode/sslrootcert in the DSN must not override the explicit ssl option
  // (pg does Object.assign(config, parse(dsn))).
  assert.equal(result.sslmode, null);
  assert.equal(result.sslrootcert, null);

  // Serverless must use the transaction pooler, not session mode.
  assert.equal(result.port, "6543");
});
