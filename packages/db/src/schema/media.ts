import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

/** Largest upload we store. The editor resizes portraits well below this before uploading. */
export const MEDIA_MAX_BYTES = 3 * 1024 * 1024;
export const MEDIA_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type MediaContentType = (typeof MEDIA_CONTENT_TYPES)[number];

/**
 * Uploaded images. The bytes live in object storage (Cloudflare R2) under the row's id; the row
 * records who uploaded what. Rows and files are immutable and addressed by an unguessable id,
 * so they are served with a year-long cache.
 */
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contentType: text("content_type").$type<MediaContentType>().notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    sha256: text("sha256").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("media_user_id_created_at_idx").on(table.userId, table.createdAt),
    check(
      "media_content_type",
      sql`${table.contentType} in ('image/jpeg', 'image/png', 'image/webp')`,
    ),
    check(
      "media_byte_size",
      sql`${table.byteSize} > 0 and ${table.byteSize} <= ${sql.raw(String(MEDIA_MAX_BYTES))}`,
    ),
  ],
);
