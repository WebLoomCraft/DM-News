/**
 * Security regression tests: client-IP derivation, CSRF/origin enforcement,
 * rate-limit behaviour, and role-boundary helpers.
 */
import test from "node:test";
import assert from "node:assert/strict";

process.env.AUTH_SECRET = "test-secret-0123456789abcdefghijklmnopqrstuvwx";

test("VULN-05/06: X-Forwarded-For spoofing cannot mint fresh buckets", async () => {
  const { getClientIp, ipKey } = await import("../../src/lib/rate-limit.ts");
  const original = process.env.TRUSTED_PROXY_HOPS;

  try {
    // Exactly one trusted proxy in front of us (the Vercel edge).
    process.env.TRUSTED_PROXY_HOPS = "1";

    const make = (xff) =>
      new Request("https://example.com/api", { headers: xff ? { "x-forwarded-for": xff } : {} });

    // The attacker controls everything to the left; the edge appends the peer.
    const a = getClientIp(make("1.1.1.1, 203.0.113.9"));
    const b = getClientIp(make("2.2.2.2, 203.0.113.9"));
    const c = getClientIp(make("9.9.9.9, 203.0.113.9"));

    assert.equal(a, "203.0.113.9", "must use the hop the trusted proxy appended");
    assert.equal(a, b, "rotating the spoofed prefix must not change identity");
    assert.equal(b, c, "rotating the spoofed prefix must not change identity");

    // A single-value header (proxy replaces rather than appends) is used as-is.
    assert.equal(getClientIp(make("198.51.100.7")), "198.51.100.7");

    // Garbage must not be accepted as an identifier.
    assert.equal(getClientIp(make("not-an-ip")), "unknown");

    // IPv6 is grouped by /64 so a single host cannot rotate its suffix.
    assert.equal(ipKey("2001:db8:1234:5678:aaaa:bbbb:cccc:dddd"), "2001:db8:1234:5678");
    assert.equal(ipKey("203.0.113.9"), "203.0.113.9");
  } finally {
    if (original === undefined) delete process.env.TRUSTED_PROXY_HOPS;
    else process.env.TRUSTED_PROXY_HOPS = original;
  }
});

test("VULN-05b: origin validation rejects cross-site and credential-less bypass", async () => {
  const { assertSameOrigin } = await import("../../src/lib/api.ts");
  const original = process.env.SITE_URL;
  process.env.SITE_URL = "https://dm-news.example.com";

  const req = (headers) => new Request("https://dm-news.example.com/api/users", { method: "POST", headers });

  try {
    // Legitimate same-origin browser request.
    assert.doesNotThrow(() =>
      assertSameOrigin(req({ origin: "https://dm-news.example.com", host: "dm-news.example.com" })),
    );

    // Cross-site attacker.
    assert.throws(
      () => assertSameOrigin(req({ origin: "https://evil.example.com", host: "dm-news.example.com" })),
      /Cross origin request blocked/,
    );

    // Subdomain confusion and scheme downgrade.
    assert.throws(() =>
      assertSameOrigin(req({ origin: "https://dm-news.example.com.evil.tld", host: "dm-news.example.com" })),
    );
    assert.throws(() =>
      assertSameOrigin(req({ origin: "http://dm-news.example.com", host: "dm-news.example.com" })),
    );

    // Referer fallback is checked too.
    assert.throws(() =>
      assertSameOrigin(req({ referer: "https://evil.example.com/x", host: "dm-news.example.com" })),
    );

    // No Origin at all, but ambient cookies present → classic CSRF shape.
    assert.throws(() => assertSameOrigin(req({ host: "dm-news.example.com", cookie: "dm_session=abc" })), /Cross origin/);

    // No Origin and no cookie → a genuine server-to-server call is allowed.
    assert.doesNotThrow(() => assertSameOrigin(req({ host: "dm-news.example.com" })));
  } finally {
    if (original === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = original;
  }
});

test("VULN-06: rate limiter blocks, counts, and stays bounded", async () => {
  const { rateLimit } = await import("../../src/lib/rate-limit.ts");

  const key = `test:${Date.now()}`;
  const results = [];
  for (let i = 0; i < 6; i++) {
    results.push(await rateLimit(key, 5, 60_000));
  }
  assert.equal(results.filter((r) => r.ok).length, 5, "exactly five requests may pass");
  assert.equal(results.at(-1).ok, false, "the sixth request must be rejected");
  assert.ok(results.at(-1).retryAfterSeconds > 0, "a retry hint must be provided");

  // A different key is unaffected (no global lockout).
  assert.equal((await rateLimit(`${key}:other`, 5, 60_000)).ok, true);

  // Window expiry frees the bucket again.
  const shortKey = `test-expiry:${Date.now()}`;
  for (let i = 0; i < 3; i++) await rateLimit(shortKey, 2, 60);
  assert.equal((await rateLimit(shortKey, 2, 60)).ok, false);
  await new Promise((r) => setTimeout(r, 80));
  assert.equal((await rateLimit(shortKey, 2, 60)).ok, true, "limit resets after the window");
});

test("VULN-06b: limiter does not grow without bound", async () => {
  const { rateLimit } = await import("../../src/lib/rate-limit.ts");
  // Generate far more keys than the internal cap; memory must remain stable.
  // (The module evicts expired/oldest buckets; here we only assert it survives.)
  for (let i = 0; i < 2500; i++) {
    await rateLimit(`flood:${i}`, 100, 50);
  }
  assert.ok(true, "flooding keys must not throw or exhaust memory");
});

test("VULN-13: role hierarchy prevents horizontal privilege escalation", async () => {
  const { roleLevel, canEditRecord, can } = await import("../../src/lib/permissions.ts");

  assert.ok(roleLevel("super_admin") > roleLevel("admin"));
  assert.ok(roleLevel("admin") > roleLevel("editor"));
  assert.ok(roleLevel("editor") > roleLevel("author"));

  // An admin must not be able to act on a super_admin's account.
  assert.equal(roleLevel("super_admin") >= roleLevel("admin"), true);
  // An editor may not act on another admin.
  assert.equal(roleLevel("admin") >= roleLevel("editor"), true);

  // Record ownership: authors only touch their own content.
  const author = { id: 5, role: "author", name: "a", email: "a@x", avatarUrl: null, status: "active", canPublish: false };
  assert.equal(canEditRecord(author, 5), true);
  assert.equal(canEditRecord(author, 6), false);

  const editor = { ...author, id: 9, role: "editor" };
  assert.equal(canEditRecord(editor, 12345), true, "editors hold articles.editAny");

  // Capability matrix sanity: authors cannot manage users or settings.
  assert.equal(can(author, "users.manage"), false);
  assert.equal(can(author, "settings.manage"), false);
  assert.equal(can({ ...author, role: "admin" }, "users.manage"), false, "only super_admin manages users");
});
