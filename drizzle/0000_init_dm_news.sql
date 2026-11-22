CREATE TABLE "article_tags" (
	"article_id" integer NOT NULL,
	"tag_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"slug" varchar(320) NOT NULL,
	"excerpt" text,
	"content" text DEFAULT '' NOT NULL,
	"featured_image_url" text,
	"image_alt" text,
	"image_caption" text,
	"category_id" integer,
	"author_id" integer,
	"created_by_id" integer,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"featured_rank" integer DEFAULT 0 NOT NULL,
	"is_breaking" boolean DEFAULT false NOT NULL,
	"seo_title" varchar(200),
	"seo_description" text,
	"social_image_url" text,
	"views" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"name" varchar(160) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"photo_url" text,
	"bio" text,
	"email" varchar(200),
	"designation" varchar(160),
	"facebook_url" text,
	"x_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"description" text,
	"image_url" text,
	"color" varchar(20) DEFAULT '#D81F2A',
	"order_index" integer DEFAULT 0 NOT NULL,
	"show_on_homepage" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"email" varchar(200) NOT NULL,
	"subject" varchar(200),
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" varchar(10) NOT NULL,
	"pageviews" integer DEFAULT 0 NOT NULL,
	"article_views" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homepage_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(60) NOT NULL,
	"title" varchar(160) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"category_id" integer,
	"layout" varchar(30) DEFAULT 'grid' NOT NULL,
	"limit" integer DEFAULT 6 NOT NULL,
	"config" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"width" integer,
	"height" integer,
	"alt" text,
	"uploaded_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(240) NOT NULL,
	"status" varchar(20) DEFAULT 'subscribed' NOT NULL,
	"source" varchar(60) DEFAULT 'website',
	"consent" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_name" varchar(160) DEFAULT 'DM News Network' NOT NULL,
	"tagline" varchar(200) DEFAULT 'Truth. Speed. Trust.',
	"site_description" text,
	"site_url" varchar(240) DEFAULT 'http://localhost:3000' NOT NULL,
	"logo_url" text,
	"logo_mark_text" varchar(12) DEFAULT 'DM' NOT NULL,
	"logo_wordmark" varchar(60) DEFAULT 'DM News Network' NOT NULL,
	"favicon_url" text,
	"color_primary" varchar(20) DEFAULT '#0B1B33' NOT NULL,
	"color_accent" varchar(20) DEFAULT '#D81F2A' NOT NULL,
	"color_ink" varchar(20) DEFAULT '#07101F' NOT NULL,
	"color_paper" varchar(20) DEFAULT '#FFFFFF' NOT NULL,
	"nav_items" jsonb,
	"show_search_icon" boolean DEFAULT true NOT NULL,
	"show_watch_live_button" boolean DEFAULT true NOT NULL,
	"watch_live_label" varchar(60) DEFAULT 'Watch Live' NOT NULL,
	"live_stream_url" text,
	"live_stream_enabled" boolean DEFAULT true NOT NULL,
	"show_live_indicator" boolean DEFAULT true NOT NULL,
	"show_language_selector" boolean DEFAULT true NOT NULL,
	"ticker_enabled" boolean DEFAULT true NOT NULL,
	"ticker_label" varchar(40) DEFAULT 'Breaking News' NOT NULL,
	"ticker_speed" integer DEFAULT 40 NOT NULL,
	"facebook_url" text,
	"tiktok_url" text,
	"youtube_url" text,
	"x_url" text,
	"instagram_url" text,
	"contact_email" varchar(200),
	"contact_phone" varchar(60),
	"contact_address" text,
	"footer_about" text,
	"footer_columns" jsonb,
	"copyright" varchar(240),
	"newsletter_enabled" boolean DEFAULT true NOT NULL,
	"newsletter_title" varchar(160) DEFAULT 'The DM Evening Briefing' NOT NULL,
	"newsletter_description" text,
	"default_seo_title" varchar(200),
	"default_seo_description" text,
	"default_social_image" text,
	"ad_slot_html" text,
	"show_ad_slots" boolean DEFAULT true NOT NULL,
	"about_content" text,
	"privacy_content" text,
	"terms_content" text,
	"analytics_snippet" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"email" varchar(200) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(30) DEFAULT 'author' NOT NULL,
	"avatar_url" text,
	"bio" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"can_publish" boolean DEFAULT false NOT NULL,
	"reset_token_hash" text,
	"reset_token_expires_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(260) NOT NULL,
	"youtube_url" text NOT NULL,
	"youtube_id" varchar(40),
	"thumbnail_url" text,
	"description" text,
	"kind" varchar(30) DEFAULT 'report' NOT NULL,
	"is_live" boolean DEFAULT false NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authors" ADD CONSTRAINT "authors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "article_tags_pk" ON "article_tags" USING btree ("article_id","tag_id");--> statement-breakpoint
CREATE INDEX "article_tags_tag_idx" ON "article_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "articles_status_published_idx" ON "articles" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "articles_category_idx" ON "articles" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "articles_author_idx" ON "articles" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "articles_breaking_idx" ON "articles" USING btree ("is_breaking");--> statement-breakpoint
CREATE INDEX "articles_featured_idx" ON "articles" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "articles_title_trgm_idx" ON "articles" USING btree ("title");--> statement-breakpoint
CREATE UNIQUE INDEX "authors_slug_idx" ON "authors" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "authors_user_idx" ON "authors" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_order_idx" ON "categories" USING btree ("order_index");--> statement-breakpoint
CREATE INDEX "contact_created_idx" ON "contact_messages" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_stats_day_idx" ON "daily_stats" USING btree ("day");--> statement-breakpoint
CREATE UNIQUE INDEX "homepage_sections_key_idx" ON "homepage_sections" USING btree ("key");--> statement-breakpoint
CREATE INDEX "homepage_sections_order_idx" ON "homepage_sections" USING btree ("order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");--> statement-breakpoint
CREATE INDEX "media_created_idx" ON "media" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_email_idx" ON "newsletter_subscribers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "videos_published_idx" ON "videos" USING btree ("published_at");