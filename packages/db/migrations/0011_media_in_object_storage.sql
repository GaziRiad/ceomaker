-- Images move to object storage. The stored ones were test uploads (no customers yet), so they
-- are dropped rather than copied; sites that used them show no image until a new upload.
DELETE FROM "media";--> statement-breakpoint
ALTER TABLE "media" DROP CONSTRAINT "media_byte_size";--> statement-breakpoint
ALTER TABLE "media" DROP COLUMN "data";--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_byte_size" CHECK ("media"."byte_size" > 0 and "media"."byte_size" <= 3145728);