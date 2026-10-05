import { and, count, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { Database } from "../client";
import { media, siteVersion, type MediaContentType } from "../schema";

/** Records an image whose bytes are already in object storage under `id`. */
export async function insertMedia(
  db: Database,
  input: {
    id: string;
    userId: string;
    contentType: MediaContentType;
    byteSize: number;
    width: number;
    height: number;
    sha256: string;
  },
): Promise<{ id: string }> {
  const [row] = await db.insert(media).values(input).returning({ id: media.id });
  if (!row) throw new Error("Media insert returned no row");
  return row;
}

export async function countMediaSince(db: Database, userId: string, since: Date) {
  const [row] = await db
    .select({ value: count() })
    .from(media)
    .where(and(eq(media.userId, userId), gte(media.createdAt, since)));
  return row?.value ?? 0;
}

/**
 * Images no version of any site uses (draft or published, content or theme), uploaded before
 * `before` so an image just added to the editor isn't caught before its draft saves.
 */
export async function listUnusedMedia(db: Database, before: Date, limit = 200) {
  const rows = await db
    .select({ id: media.id })
    .from(media)
    .where(
      and(
        lt(media.createdAt, before),
        sql`not exists (
          select 1 from ${siteVersion}
          where strpos(${siteVersion.content}::text, ${media.id}::text) > 0
             or strpos(${siteVersion.theme}::text, ${media.id}::text) > 0
        )`,
      ),
    )
    .limit(limit);
  return rows.map((row) => row.id);
}

export async function deleteMediaRows(db: Database, ids: string[]) {
  if (!ids.length) return;
  await db.delete(media).where(inArray(media.id, ids));
}
