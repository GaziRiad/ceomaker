ALTER TABLE "user" ADD COLUMN "pro_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "pro_note" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "pro_reminded_at" timestamp with time zone;