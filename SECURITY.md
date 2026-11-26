# DM News Network — Security Hardening Report

**Branch:** `arena/d7cf2de5-dm-news` · **PR:** [#4](https://github.com/WebLoomCraft/DM-News/pull/4) · **Commit:** `86dd5b5`
**Base:** `da943f7` (main) · **Date:** 2026-11-22

## Verification summary

| Check | Result |
| --- | --- |
| `npm run test:security` | **25 / 25 pass** |
| `npx tsc --noEmit` | clean (exit 0) |
| `npx next build` | success (exit 0) |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| `npm audit` (full) | 4 moderate, all dev-only (`drizzle-kit` → `esbuild`) |
| Drizzle migration `0002` | applied to Supabase, objects verified |
| Stored XSS corpus | 11 payloads, all neutralised |

---

## 1. Findings and fixes

### F1 — Session secret and JWT (critical)
The session JWT was signed with a fallback derived from `DATABASE_URL`, so anyone who learned the connection string could forge an admin token.

- `AUTH_SECRET` is now **required in production**: ≥32 characters, high entropy, **no fallback of any kind**. `validateStartupConfig()` throws and the server refuses to serve.
- Verification pins **HS256**, issuer, audience and expiry. `alg=none` and wrong-key tokens are rejected.
- A key **fingerprint** (first 16 hex of SHA-256) is available for rotation without logging the secret.

### F2 — Seeded admin and demo credentials (critical)
**This was live in production, not just a code smell.** The database held two active accounts using passwords published in the source:

| Account | Role | Old password (public) | Status |
| --- | --- | --- | --- |
| `admin@dmnewsnetwork.com` | super_admin | `DMnews@2026` | **rotated, old password rejected** |
| `newsroom@dmnewsnetwork.com` | admin | `Newsroom@2026` | **rotated, old password rejected** |

Remediation applied:
1. Rotated both password hashes to new 24-character random secrets (bcrypt cost 12); verified by comparing the old passwords against the new hashes — both now fail, both new ones succeed.
2. Bumped `session_version` 1 → 2 on both rows, invalidating every session minted before the fix.
3. Cleared any outstanding reset tokens.

Code-side:
- Production seeding creates **one** `super_admin` from `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` (≥12 characters, refusal logged otherwise), and only on an empty users table.
- Demo accounts are **development-only**.
- The sign-in hint needs `NODE_ENV !== "production"` **and** `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === "true"`; set to `false` in Vercel.

> **Credential handover:** the two new passwords are not recorded in this document or the repo. Retrieve them from the deployment owner's vault. `docs` intentionally omits them.

### F3 — Password reset (high)
- 256-bit tokens from `crypto.randomBytes`, stored **only as SHA-256 hashes**, single-use, short expiry, unique index.
- Reset links are built from `SITE_URL` **only** — never from the request `Origin`/`Host`, which closes reset-link poisoning and open redirects.
- Without a mail provider the flow **fails safely**: the token and link are never returned in the API response and never logged.
- Generic responses regardless of whether the address exists (no account enumeration).

### F4 — Database TLS (high)
Remote hosts require TLS **with certificate verification**; `PGSSLMODE=disable` / `DATABASE_SSL_NO_VERIFY` cause a startup failure in production. Optional `DATABASE_CA_CERT` for private CAs. Localhost is exempt.

### F5 — Rate limiting and client IP (high)
Three separate bugs, all caught by tests:

1. **Inverted hop direction.** Client IP was taken as `chain.length - 1 - hops` from the left, making the **client-supplied** leftmost `X-Forwarded-For` value authoritative — an attacker could mint a fresh rate-limit bucket per request.
2. **`Number("") === 0`.** An unset `TRUSTED_PROXY_HOPS` silently meant "trust no proxies", so the spoofable path was the *default*.
3. **IPv6 rotation.** A single client rotating within its own /64 got unlimited buckets.

Fixes: read the chain from the right, trusting only hops our own proxy appended; validate the env var as a non-empty string first; collapse IPv6 to the /64 prefix; make login lockout **database-backed** (`login_throttle`) so it holds across serverless instances; optional Upstash store for the general limiter.

### F6 — Stored XSS, scripts and CSP (critical)
Four distinct injection paths were open:

| Vector | Before | Fix |
| --- | --- | --- |
| `<script>` inner text | tag stripped, **payload rendered as visible text** | `stripDisallowedScripts()` deletes the whole subtree unless `src` is allowlisted |
| `style="background:url(javascript:…)"` | **passed through** | `style` removed from the settings allowlist |
| `</script>` in article title | broke out of the JSON-LD element | `toJsonLdScript()` escapes `<`, `>`, `&`, U+2028/9 |
| `adSlotHtml` written before this change | stored unsanitised, rendered raw | sanitised **at render** as well as on write |

Plus full security headers in `next.config.ts`: CSP with explicit allowlists, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, HSTS 2 years with preload, `nosniff`, `DENY`, referrer and permissions policies, COOP, and a `default-src 'none'; sandbox` CSP on `/api/media/file/*`.

### F7 — Upload security (high)
- Content classified by **magic bytes** (JPEG/PNG/WebP/GIF/AVIF). Client `Content-Type` is ignored.
- **SVG rejected** outright (it carries script).
- **Polyglots truncated** to the true end of image data plus a structural minimum, so appended payloads never survive.
- **Pixel bombs** rejected via dimension and pixel caps.
- Filenames are **server-generated** (`<timestamp>-<24 hex>.<ext>`), never client-controlled.

### F8 — Session revocation (high)
`users.session_version` is bumped on password change/reset, role change and deactivation. Tokens embed the value they were minted with and are rejected on mismatch — instant revocation with no server-side session store.

### F9 — Path traversal (high)
Upload paths use a strict segment regex plus a `path.relative` boundary check that also catches **prefix-sibling** escapes (`/uploads-evil` vs `/uploads`).

### F10 — CSRF and origin validation (high)
`assertSameOrigin()` is the **first statement** in all **17** mutating route handlers. Requests carrying cookies but **no** `Origin` are rejected; cross-site, suffix-trick (`site.evil.tld`), foreign-referer and non-HTTPS origins are rejected. The scheme check runs in **every** environment — tests caught that `http://` for the correct host previously passed outside production.

### F11 — Authorisation and privilege escalation (high)
- Every CMS route enforces a role check before touching data.
- Account management blocks acting on accounts with **equal or higher** privilege unless acting on yourself — no admin can demote or lock out a `super_admin`.

### F12 — Input validation (medium)
Request bodies capped at 2 MiB; reset tokens validated against `^[A-Za-z0-9_-]{20,128}$`; all password fields require ≥10 characters; URLs normalised; enum fields constrained with Zod.

### F13 — Dependency audit (medium)
- The former **high** (`zod`) is resolved.
- `npm audit --omit=dev` → **0**.
- 4 moderate remain, all dev-only via `drizzle-kit` → `esbuild` dev-server advisory. Not in the runtime bundle. **Accepted risk**, documented.

### F14 — PII in logs (medium)
No email, token, password or reset URL is written to logs. Password-reset failures log a generic reason only. Throttle keys are hashed before storage (`email:<sha256>`, `ip:<sha256>`).

---

## 2. Files changed (51 files, +4346 / −496)

**New — security core**
`src/lib/config.ts` · `src/lib/crypto.ts` · `src/lib/rate-limit.ts` · `src/lib/login-throttle.ts` · `src/instrumentation.ts` · `next.config.ts` · `.env.example`

**Rewritten / hardened**
`src/lib/session.ts` · `src/lib/sanitize.ts` · `src/lib/media-storage.ts` · `src/lib/seed.ts` · `src/lib/api.ts` · `src/lib/validators.ts` · `src/db/index.ts` · `src/db/schema.ts`

**Routes** — all `src/app/api/auth/*` (login, logout, change-password, password-reset, password-reset/confirm) and 16 CMS routes: `articles`, `articles/[id]`, `authors`, `authors/[id]`, `categories`, `categories/[id]`, `contact/[id]`, `homepage/featured`, `homepage/sections`, `media`, `media/[id]`, `newsletter/[id]`, `settings`, `tags`, `tags/[id]`, `users`, `users/[id]`

**Pages** — `src/app/(site)/page.tsx`, `news/[slug]/page.tsx`, `category/[slug]/page.tsx`, `src/app/admin/login/LoginForm.tsx`

**Docs / tests** — `README.md`, `.env.example`, `drizzle/0002_security_hardening.sql`, `drizzle/meta/0002_snapshot.json`, `tests/security/*`

---

## 3. Migration

`drizzle/0002_security_hardening.sql` — **already applied** to Supabase (`bhrcpzozghwsltfuppoi`), verified:

- `login_throttle` table + `login_throttle_created_idx`
- `users.session_version` integer default 0
- unique `users_reset_token_idx`

Additive only — no column dropped, no data rewritten, no downtime.

---

## 4. Tests added

`tests/security/` — 25 tests via `npm run test:security`:

| File | Covers |
| --- | --- |
| `session-and-config.test.mjs` | no production fallback, weak-secret rejection, strong secret + fingerprint, `alg=none`, wrong-key JWT, missing state, session-version revocation |
| `injection-and-uploads.test.mjs` | 11 XSS payloads, ad allowlist, rich-text embeds, JSON-LD breakout, magic bytes, GIF polyglot, traversal incl. prefix-sibling, token hashing, sealed-state tampering |
| `authz-and-rate-limit.test.mjs` | XFF spoofing, inverted hops, IPv6 /64, origin/CSRF matrix, limiter window + flood, role hierarchy, `canEditRecord` |
| `setup.mjs` | stubs `DATABASE_URL` so modules load without a live database |

**Bugs these tests found** (fixed, not waived): `<script>` text leak, CSS `url(javascript:)` bypass, JSON-LD breakout, inverted proxy hops, `Number("")` default, `http://` origin acceptance.

---

## 5. Required production environment variables

Set in Vercel **before** deploying — the app refuses to start without the first two (because `VERCEL_PROJECT_PRODUCTION_URL` is not reliably present, `SITE_URL` must be explicit):

| Variable | Value / status |
| --- | --- |
| `AUTH_SECRET` | ✅ present, 40 hex chars (160 bits) — acceptable |
| `SITE_URL` | ✅ **added** — `https://dm-news.vercel.app` |
| `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS` | ✅ **set to `false`** (was `true`) |
| `DATABASE_CA_CERT` | optional — not needed (Supabase uses a public CA) |
| `TRUSTED_PROXY_HOPS` | optional — defaults to 1 on Vercel (correct) |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | optional — recommended for cross-instance limits |
| `RESEND_API_KEY` / `MAIL_FROM` | optional — **required in practice** for password reset to deliver mail |
| `DATABASE_URL` | ✅ present |

`BOOTSTRAP_ADMIN_*` is **not** needed: the users table is already populated, so seeding exits early.

---

## 6. Manual deployment steps

1. ~~Apply the migration~~ — **done**.
2. ~~Rotate the compromised production passwords~~ — **done and verified**.
3. ~~Set `SITE_URL`~~ — **done**.
4. ~~Set `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=false`~~ — **done**.
5. **Merge PR [#4](https://github.com/WebLoomCraft/DM-News/pull/4).** Vercel auto-deploys `main`.
6. **Verify the deploy:**
   ```bash
   curl -sI https://dm-news.vercel.app/ | grep -iE 'content-security-policy|strict-transport|x-frame'
   # expect CSP, HSTS, X-Frame-Options: DENY
   curl -s -o /dev/null -w '%{http_code}\n' -X POST https://dm-news.vercel.app/api/auth/login \
     -H 'Origin: https://evil.example.com' -H 'Content-Type: application/json' \
     -d '{"email":"a@b.c","password":"x"}'    # expect 403
   ```
7. Confirm the old demo passwords no longer sign in; retrieve the new ones from the vault.
8. If a redeploy is ever rejected with `Insecure configuration`, read the startup error — it names the exact missing variable.
9. Configure `RESEND_API_KEY` before relying on password reset.

**Rollback:** previous good deployment `dpl_Gu5PdGB6fdG9kKbU2yEQAf5n7Aow`. Note that rolling back also restores the vulnerable code, so prefer rolling *forward*.

---

## 7. Remaining risks

| Risk | Severity | Notes / mitigation |
| --- | --- | --- |
| Rate limits are per-instance without Upstash | Medium | Serverless instances each hold their own window. Login **lockout** is database-backed and therefore global. Set `UPSTASH_REDIS_REST_*` to close this. |
| CSP keeps `'unsafe-inline'` for scripts | Medium | Next.js injects inline bootstrap code. Removing it requires nonces and dynamic rendering on every route. `object-src`, `base-uri`, `frame-ancestors` and `form-action` are already locked down. |
| No mail provider configured | Medium | Password reset fails safely (no token leak) but cannot deliver. Set `RESEND_API_KEY`. |
| 4 moderate dev-only advisories | Low | `drizzle-kit` → `esbuild` dev-server issue, absent from the runtime bundle. Revisit when `drizzle-kit` ships a fix. |
| Uploaded images are trusted for display | Low | Byte-validated and re-encoded where feasible, but no full re-encode pipeline (no `sharp` on the free tier). Malformed-image parsers in the browser remain the last line. |
| Sessions are stateless JWTs | Low | Revocable via `session_version`, but revocation is a DB read per request rather than a deny-list. |
| No MFA for CMS accounts | Low | Out of scope for this pass; recommended next. |

---

## 8. Preserved functionality (regression-checked)

- **Video uploads stay removed**; images only.
- **Live page** (`/live`) and `settings.liveStreamEnabled` / `liveStreamUrl` intact.
- **YouTube embeds inside articles** still render — verified: `sanitizeRichText` keeps `youtube.com/embed` iframes and drops foreign ones.
- **Allowlisted ad scripts** still load — verified against `googlesyndication.com`.
- **WebLoom footer block** untouched.
- `/videos*` permanently redirects to `/live`.
