import { sql } from "drizzle-orm";
import {
  check,
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => "bytea",
});

/** Largest upload we store. The editor resizes portraits well below this before uploading. */
export const MEDIA_MAX_BYTES = 3 * 1024 * 1024;
export const MEDIA_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type MediaContentType = (typeof MEDIA_CONTENT_TYPES)[number];

/**
 * Uploaded images, stored in Postgres to keep the stack to one service while volumes are small.
 * Rows are immutable and addressed by an unguessable id, so they are served with a year-long
 * cache. Move to object storage (R2, Vercel Blob) once storage cost or volume justifies it.
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
    data: bytea("data").notNull(),
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
      sql`${table.byteSize} > 0 and ${table.byteSize} <= ${sql.raw(String(MEDIA_MAX_BYTES))} and octet_length(${table.data}) = ${table.byteSize}`,
    ),
  ],
);
