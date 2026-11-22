# DM News Network — Professional News & Media Platform

A complete, production-ready news portal and database-backed CMS built with **Next.js (App Router) + TypeScript + Tailwind CSS v4 + PostgreSQL + Drizzle ORM**.

Everything is wired end to end: publish an article in the admin panel and it appears instantly on the homepage, the breaking-news ticker, the category page, the sitemap and the search index — no code changes required.

---

## 1. Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure the database (already present in this project)
#    .env → DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db

# 3. Create the schema
npx drizzle-kit push

# 4. Build & run
npm run build
npm start
```

On first boot `src/instrumentation.ts` runs the seeder (`src/lib/seed.ts`), which installs:

* the default site settings row, homepage sections and navigation,
* 7 news sections (Pakistan, World, Politics, Business, Technology, Sports, Entertainment),
* desk author profiles, tags, video reports and a set of placeholder stories,
* four staff accounts (see below).

The seeder is idempotent — it only inserts content when the database is empty.

---

## 2. Newsroom accounts (seeded)

| Role        | Email                          | Password        |
| ----------- | ------------------------------ | --------------- |
| Super Admin | `admin@dmnewsnetwork.com`      | `DMnews@2026`   |
| Admin       | `newsroom@dmnewsnetwork.com`   | `Newsroom@2026` |
| Editor      | `editor@dmnewsnetwork.com`     | `Editor@2026`   |
| Author      | `reporter@dmnewsnetwork.com`   | `Reporter@2026` |

Sign in at **`/admin`**. Change these passwords immediately in a real deployment
(Team & roles → key icon, or the user menu → *Change password*).

Hide the credential panel on the login screen with `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=false`.

---

## 3. Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | **yes** | PostgreSQL connection string used by Drizzle. |
| `AUTH_SECRET` | recommended | Secret for signing the session JWT (HS256). A deterministic fallback derived from `DATABASE_URL` is used when unset — always set this in production. |
| `NEXT_PUBLIC_SITE_URL` / `siteUrl` setting | optional | Canonical origin for sitemap, canonicals and Open Graph. When unset the request host is used automatically. |
| `RESEND_API_KEY` (+ optional `MAIL_FROM`) | optional | Enables real password-reset emails. Without a mail provider the reset link is returned in the API response so the flow still works. |
| `SMTP_HOST` / `MAILER_SEND_KEY` | optional | Detected as "mail configured" and suppresses the returned reset link. |
| `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS` | optional | Set to `false` to hide the seeded-account panel on `/admin/login`. |

Media storage: uploads are written to `./uploads` on the server and streamed through
`/api/media/file/<filename>` with immutable cache headers and a strict CSP. To move to cloud
storage (S3/R2/Supabase), change `saveUpload()` in `src/lib/media-storage.ts` to push to the bucket
and return the public URL — nothing else needs to change.

---

## 4. What is included

### Public website
* **Top information bar** — live date (locale aware), social icons, EN/اردو selector, on-air indicator.
* **Header** — logo (image or wordmark, admin-managed), dynamic navigation, search, mobile drawer, Watch Live button.
* **Breaking news ticker** — smooth marquee, pause on hover, admin-toggled, per-article flag.
* **Featured block** — manual lead + secondary stories, plus a real "Most read" rail.
* **Latest news** — responsive grid with a working Load More endpoint.
* **Category sections** — automatic per-section blocks with View all links.
* **Video section** — YouTube privacy-enhanced embeds or direct MP4/WebM, click-to-load.
* **Watch Live** — YouTube live embed or a designed off-air placeholder when unconfigured.
* **Social, newsletter, footer** — all editable from the admin panel.
* **Article page** — breadcrumbs, byline, published/updated timestamps, reading time, view counter,
  hero image + caption, sanitised rich text, share buttons, tags, related stories, prev/next, ad slots.
* **Category, tag, author, search, latest, videos, live, about, contact, privacy, terms** pages.

### Admin dashboard (`/admin`)
* Secure login (bcrypt + signed httpOnly JWT session), logout, password reset, change password.
* Overview with real counters and first-party readership stats (no fake traffic numbers).
* Articles: searchable/filterable list, create, edit, delete, save draft, schedule, publish,
  unpublish (archive), breaking/featured flags, preview, rich text editor, media picker, tag input,
  auto-generated editable slug, SEO fields and search preview.
* Media library: drag & drop upload, validation, size limits, alt text, dimensions, file size, delete.
* Categories (with safe delete + reassignment), tags, authors/desks, videos.
* Homepage editor: reorder/enable/rename/resize sections, pick featured stories, manage the ticker,
  update the live stream URL.
* Settings: identity, logo/favicon, brand colours, navigation builder, ticker, broadcast, social links,
  contact details, footer builder, newsletter, SEO defaults, advertising, analytics snippet, legal pages.
* Subscribers (with CSV export), contact messages, and user/role management.

### Roles
`super_admin` → everything · `admin` → content + presentation + settings · `editor` → publish/edit any
story, media, taxonomy, videos · `author` → own drafts only (publishing can be granted per account).
Every capability check runs on the server in the API layer (`src/lib/permissions.ts`).

---

## 5. SEO & performance

* Semantic URLs: `/news/<slug>`, `/category/<slug>`, `/tag/<slug>`, `/author/<slug>`.
* Per-page titles, meta descriptions, canonical URLs, Open Graph and Twitter/X cards.
* `NewsArticle`, `BreadcrumbList`, `NewsMediaOrganization` and `WebSite`+`SearchAction` JSON-LD.
* `/sitemap.xml` and `/robots.txt` generated from the database.
* No heavy client bundles on public pages: plain responsive `<img>` with `loading="lazy"`,
  `decoding="async"`, fixed aspect-ratio boxes (no CLS), click-to-load video/iframe embeds.

## 6. Security

* Passwords hashed with bcrypt (cost 10); sessions are signed HS256 JWTs in `httpOnly`,
  `SameSite=Lax` cookies (Secure in production).
* Server-side authorization on every mutating endpoint; CSRF hardening via same-origin checks.
* All rich text is sanitised with `sanitize-html` (allowlisted tags/attributes, iframe host allowlist,
  forced `rel="noopener noreferrer nofollow"`, lazy images).
* Uploads validated by MIME type and size, stored under randomised names, served with a strict CSP
  and `X-Content-Type-Options: nosniff`. Path traversal is blocked in the media file route.
* Rate limiting on login, password reset, newsletter and contact endpoints.
* Parameterised queries through Drizzle (no string-built SQL). Secrets stay server-side.

---

## 7. Acceptance test

1. Open `/admin` → sign in as `admin@dmnewsnetwork.com` / `DMnews@2026`.
2. **Articles → New article**: write a headline, upload/pick a featured image, choose a section,
   add body copy, tick *Breaking news* and *Featured story*, click **Publish now**.
3. Visit `/` — the story is the lead in Top Stories and scrolling in the ticker;
   visit `/category/<section>` — it is listed there; `/search?q=<word>` finds it.
4. In the article editor switch the status to **Archived (unpublished)** and save — the story
   disappears from the public site immediately.

---

## 8. Project structure

```
src/
  app/
    (site)/            public website (layout, home, news, category, tag, author, search, …)
    admin/             login, reset-password and the (panel) CMS pages
    api/               JSON endpoints (auth, articles, categories, tags, authors, media,
                       videos, settings, homepage, users, newsletter, contact, stats, public)
    sitemap.ts robots.ts icon.svg not-found.tsx layout.tsx
  components/
    site/              header, ticker, cards, footer, video/live/newsletter widgets
    admin/             shell, UI kit, rich text editor, media picker, article form
  db/                  Drizzle client + schema (13 tables)
  lib/                 session, permissions, settings, queries, sanitisation, uploads,
                       validation, rate limiting, seeding
  instrumentation.ts   runs the idempotent seeder on server start
uploads/               local media storage (created at runtime)
```
