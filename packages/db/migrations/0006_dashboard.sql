ALTER TABLE "site" ADD COLUMN "notify_messages" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_message" ADD COLUMN "read_at" timestamp with time zone;