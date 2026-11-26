CREATE TABLE "login_throttle" (
	"key" varchar(120) PRIMARY KEY NOT NULL,
	"kind" varchar(16) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "login_throttle_created_idx" ON "login_throttle" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_reset_token_idx" ON "users" USING btree ("reset_token_hash");