import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = text; // super_admin | admin | editor | author

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 200 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 30 }).notNull().default("author"),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    canPublish: boolean("can_publish").notNull().default(false),
    /**
     * SHA-256 of the current reset token. A deterministic hash (not bcrypt)
     * lets the confirm endpoint look the row up directly instead of scanning
     * and bcrypt-comparing every user's token.
     */
    resetTokenHash: text("reset_token_hash"),
    resetTokenExpiresAt: timestamp("reset_token_expires_at", { withTimezone: true }),
    /**
     * Incremented whenever existing sessions must stop working (password
     * change/reset, suspension, privilege change). Tokens embed the value they
     * were minted with, so a bump invalidates all of them without server state.
     */
    sessionVersion: integer("session_version").notNull().default(0),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    // Reset-token confirmation looks the row up by this hash, so it must be
    // indexed; it is also unique, which makes token collisions impossible.
    uniqueIndex("users_reset_token_idx").on(t.resetTokenHash),
  ],
);

export const authors = pgTable(
  "authors",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    photoUrl: text("photo_url"),
    bio: text("bio"),
    email: varchar("email", { length: 200 }),
    designation: varchar("designation", { length: 160 }),
    facebookUrl: text("facebook_url"),
    xUrl: text("x_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("authors_slug_idx").on(t.slug), index("authors_user_idx").on(t.userId)],
);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    color: varchar("color", { length: 20 }).default("#D81F2A"),
    orderIndex: integer("order_index").notNull().default(0),
    showOnHomepage: boolean("show_on_homepage").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("categories_slug_idx").on(t.slug), index("categories_order_idx").on(t.orderIndex)],
);

export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tags_slug_idx").on(t.slug)],
);

export const articles = pgTable(
  "articles",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 300 }).notNull(),
    slug: varchar("slug", { length: 320 }).notNull(),
    excerpt: text("excerpt"),
    content: text("content").notNull().default(""),
    featuredImageUrl: text("featured_image_url"),
    imageAlt: text("image_alt"),
    imageCaption: text("image_caption"),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    authorId: integer("author_id").references(() => authors.id, { onDelete: "set null" }),
    createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" }),
    status: varchar("status", { length: 20 }).notNull().default("draft"), // draft | published | scheduled | archived
    isFeatured: boolean("is_featured").notNull().default(false),
    featuredRank: integer("featured_rank").notNull().default(0),
    isBreaking: boolean("is_breaking").notNull().default(false),
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: text("seo_description"),
    socialImageUrl: text("social_image_url"),
    views: integer("views").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("articles_slug_idx").on(t.slug),
    index("articles_status_published_idx").on(t.status, t.publishedAt),
    index("articles_category_idx").on(t.categoryId),
    index("articles_author_idx").on(t.authorId),
    index("articles_breaking_idx").on(t.isBreaking),
    index("articles_featured_idx").on(t.isFeatured),
    index("articles_title_trgm_idx").on(t.title),
  ],
);

export const articleTags = pgTable(
  "article_tags",
  {
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("article_tags_pk").on(t.articleId, t.tagId), index("article_tags_tag_idx").on(t.tagId)],
);

export const media = pgTable(
  "media",
  {
    id: serial("id").primaryKey(),
    filename: varchar("filename", { length: 255 }).notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    url: text("url").notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    alt: text("alt"),
    uploadedById: integer("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("media_filename_idx").on(t.filename), index("media_created_idx").on(t.createdAt)],
);

export const homepageSections = pgTable(
  "homepage_sections",
  {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 60 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    orderIndex: integer("order_index").notNull().default(0),
    categoryId: integer("category_id"),
    layout: varchar("layout", { length: 30 }).notNull().default("grid"),
    limit: integer("limit").notNull().default(6),
    config: jsonb("config"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("homepage_sections_key_idx").on(t.key), index("homepage_sections_order_idx").on(t.orderIndex)],
);

export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  siteName: varchar("site_name", { length: 160 }).notNull().default("DM News Network"),
  tagline: varchar("tagline", { length: 200 }).default("Truth. Speed. Trust."),
  siteDescription: text("site_description"),
  siteUrl: varchar("site_url", { length: 240 }).notNull().default("http://localhost:3000"),
  logoUrl: text("logo_url"),
  logoMarkText: varchar("logo_mark_text", { length: 12 }).notNull().default("DM"),
  logoWordmark: varchar("logo_wordmark", { length: 60 }).notNull().default("DM News Network"),
  faviconUrl: text("favicon_url"),
  colorPrimary: varchar("color_primary", { length: 20 }).notNull().default("#0B1B33"),
  colorAccent: varchar("color_accent", { length: 20 }).notNull().default("#D81F2A"),
  colorInk: varchar("color_ink", { length: 20 }).notNull().default("#07101F"),
  colorPaper: varchar("color_paper", { length: 20 }).notNull().default("#FFFFFF"),
  navItems: jsonb("nav_items").$type<Array<{ label: string; href: string; enabled?: boolean }>>(),
  showSearchIcon: boolean("show_search_icon").notNull().default(true),
  showWatchLiveButton: boolean("show_watch_live_button").notNull().default(true),
  watchLiveLabel: varchar("watch_live_label", { length: 60 }).notNull().default("Watch Live"),
  liveStreamUrl: text("live_stream_url"),
  liveStreamEnabled: boolean("live_stream_enabled").notNull().default(true),
  showLiveIndicator: boolean("show_live_indicator").notNull().default(true),
  showLanguageSelector: boolean("show_language_selector").notNull().default(true),
  tickerEnabled: boolean("ticker_enabled").notNull().default(true),
  tickerLabel: varchar("ticker_label", { length: 40 }).notNull().default("Breaking News"),
  tickerSpeed: integer("ticker_speed").notNull().default(40),
  facebookUrl: text("facebook_url"),
  tiktokUrl: text("tiktok_url"),
  youtubeUrl: text("youtube_url"),
  xUrl: text("x_url"),
  instagramUrl: text("instagram_url"),
  contactEmail: varchar("contact_email", { length: 200 }),
  contactPhone: varchar("contact_phone", { length: 60 }),
  contactAddress: text("contact_address"),
  footerAbout: text("footer_about"),
  footerColumns: jsonb("footer_columns").$type<Array<{ title: string; links: Array<{ label: string; href: string }> }>>(),
  copyright: varchar("copyright", { length: 240 }),
  newsletterEnabled: boolean("newsletter_enabled").notNull().default(true),
  newsletterTitle: varchar("newsletter_title", { length: 160 }).notNull().default("The DM Evening Briefing"),
  newsletterDescription: text("newsletter_description"),
  defaultSeoTitle: varchar("default_seo_title", { length: 200 }),
  defaultSeoDescription: text("default_seo_description"),
  defaultSocialImage: text("default_social_image"),
  adSlotHtml: text("ad_slot_html"),
  showAdSlots: boolean("show_ad_slots").notNull().default(true),
  aboutContent: text("about_content"),
  privacyContent: text("privacy_content"),
  termsContent: text("terms_content"),
  analyticsSnippet: text("analytics_snippet"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 240 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("subscribed"),
    source: varchar("source", { length: 60 }).default("website"),
    consent: boolean("consent").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("newsletter_email_idx").on(t.email)],
);

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 200 }).notNull(),
    subject: varchar("subject", { length: 200 }),
    message: text("message").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contact_created_idx").on(t.createdAt)],
);

export const dailyStats = pgTable(
  "daily_stats",
  {
    id: serial("id").primaryKey(),
    day: varchar("day", { length: 10 }).notNull(),
    pageviews: integer("pageviews").notNull().default(0),
    articleViews: integer("article_views").notNull().default(0),
  },
  (t) => [uniqueIndex("daily_stats_day_idx").on(t.day)],
);

/**
 * Shared brute-force counters for the login endpoint. Keyed by a hash of the
 * email or IP so no plaintext identifiers are persisted.
 */
export const loginThrottle = pgTable(
  "login_throttle",
  {
    key: varchar("key", { length: 120 }).primaryKey(),
    kind: varchar("kind", { length: 16 }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_throttle_created_idx").on(t.createdAt)],
);

export type UserRow = typeof users.$inferSelect;
export type ArticleRow = typeof articles.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type TagRow = typeof tags.$inferSelect;
export type AuthorRow = typeof authors.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type SettingsRow = typeof siteSettings.$inferSelect;
export type HomepageSectionRow = typeof homepageSections.$inferSelect;
export type SubscriberRow = typeof newsletterSubscribers.$inferSelect;
export type ContactMessageRow = typeof contactMessages.$inferSelect;
export type Role = "super_admin" | "admin" | "editor" | "author";
