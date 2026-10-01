import { and, count, eq, gte } from "drizzle-orm";
import type { Database } from "../client";
import { media, type MediaContentType } from "../schema";

export async function insertMedia(
  db: Database,
  input: {
    userId: string;
    contentType: MediaContentType;
    width: number;
    height: number;
    sha256: string;
    data: Uint8Array;
  },
): Promise<{ id: string }> {
  const [row] = await db
    .insert(media)
    .values({ ...input, byteSize: input.data.byteLength })
    .returning({ id: media.id });
  if (!row) throw new Error("Media insert returned no row");
  return row;
}

/** Public read: media ids are unguessable and only ever embedded in sites. */
export async function getMedia(db: Database, id: string) {
  const [row] = await db
    .select({ contentType: media.contentType, data: media.data, byteSize: media.byteSize })
    .from(media)
    .where(eq(media.id, id))
    .limit(1);
  return row ?? null;
}

export async function countMediaSince(db: Database, userId: string, since: Date) {
  const [row] = await db
    .select({ value: count() })
    .from(media)
    .where(and(eq(media.userId, userId), gte(media.createdAt, since)));
  return row?.value ?? 0;
}
