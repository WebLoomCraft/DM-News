/**
 * Test bootstrap.
 *
 * `session.ts` imports the pool module, which requires DATABASE_URL at import
 * time. The security tests never issue a query, so a syntactically valid
 * placeholder is enough and keeps the suite hermetic (no live database).
 */
process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test_db";
process.env.NODE_ENV ??= "test";
process.env.SITE_URL ??= "https://dm-news.example.com";
process.env.AUTH_SECRET ??= "test-secret-0123456789abcdefghijklmnopqrstuvwx";
