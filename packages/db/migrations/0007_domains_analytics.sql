CREATE TYPE "public"."domain_stage" AS ENUM('records', 'waiting', 'securing', 'connected');--> statement-breakpoint
CREATE TYPE "public"."analytics_event_kind" AS ENUM('pageview', 'click');--> statement-breakpoint
CREATE TABLE "site_domain" (
	"site_id" uuid PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"kind" text NOT NULL,
	"stage" "domain_stage" DEFAULT 'records' NOT NULL,
	"a_value" text NOT NULL,
	"cname_value" text NOT NULL,
	"diagnosis" jsonb,
	"share_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"checked_at" timestamp with time zone,
	"connected_at" timestamp with time zone,
	CONSTRAINT "site_domain_domain_unique" UNIQUE("domain"),
	CONSTRAINT "site_domain_share_token_unique" UNIQUE("share_token"),
	CONSTRAINT "site_domain_format" CHECK ("site_domain"."domain" ~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$'),
	CONSTRAINT "site_domain_kind" CHECK ("site_domain"."kind" in ('apex', 'subdomain'))
);
--> statement-breakpoint
CREATE TABLE "analytics_event" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"kind" "analytics_event_kind" NOT NULL,
	"path" text NOT NULL,
	"source" text NOT NULL,
	"referrer_host" text,
	"click_kind" text,
	"country" text,
	"city" text,
	"latitude" real,
	"longitude" real,
	"device" text NOT NULL,
	"visitor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_domain" ADD CONSTRAINT "site_domain_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_event" ADD CONSTRAINT "analytics_event_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_domain_stage_checked_at_idx" ON "site_domain" USING btree ("stage","checked_at");--> statement-breakpoint
CREATE INDEX "analytics_event_site_id_created_at_idx" ON "analytics_event" USING btree ("site_id","created_at");