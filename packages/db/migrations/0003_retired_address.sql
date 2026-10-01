CREATE TABLE "retired_address" (
	"subdomain" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"retired_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "retired_address" ADD CONSTRAINT "retired_address_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;