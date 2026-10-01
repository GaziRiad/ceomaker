CREATE TYPE "public"."ai_usage_kind" AS ENUM('generate', 'rewrite');--> statement-breakpoint
CREATE TYPE "public"."ai_usage_status" AS ENUM('started', 'succeeded', 'failed', 'refused', 'rejected');--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"sha256" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_content_type" CHECK ("media"."content_type" in ('image/jpeg', 'image/png', 'image/webp')),
	CONSTRAINT "media_byte_size" CHECK ("media"."byte_size" > 0 and "media"."byte_size" <= 3145728 and octet_length("media"."data") = "media"."byte_size")
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"site_id" uuid,
	"kind" "ai_usage_kind" NOT NULL,
	"status" "ai_usage_status" DEFAULT 'started' NOT NULL,
	"model" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "site" ADD COLUMN "answers" jsonb;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_user_id_created_at_idx" ON "media" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_user_id_created_at_idx" ON "ai_usage" USING btree ("user_id","created_at");--> statement-breakpoint
-- Drafts from the retired "executive" template move to its successor, with default colours
-- (the old theme shape has no equivalent). Published versions are immutable and are mapped
-- when rendered instead.
UPDATE "site_version" SET "template_key" = 'meridian', "theme" = '{"palettes":{}}'::jsonb
  WHERE "kind" = 'draft' AND "template_key" = 'executive';
