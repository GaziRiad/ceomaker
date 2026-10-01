import type { ContactMessage } from "@ceomaker/schema";
import { and, count, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import type { Database } from "../client";
import { contactMessage, site, user } from "../schema";

/**
 * Limits on what one site's form accepts, so a script can't flood an inbox. Generous for people:
 * a real sender rarely writes twice in an hour, and a busy executive gets a few messages a day.
 */
export const MESSAGE_LIMITS = { perSenderPerHour: 5, perSitePerDay: 100 } as const;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Stores a message for a site, unless the sender or the site is over its limit. The caller has
 * already checked that the site is live and its form is on.
 */
export async function saveContactMessage(
  db: Database,
  input: { siteId: string; message: ContactMessage; senderKey: string | null; now?: Date },
): Promise<{ ok: true; id: string } | { ok: false; reason: "rate-limited" }> {
  const now = input.now ?? new Date();
  const hourAgo = new Date(now.getTime() - HOUR_MS);
  const [recent] = await db
    .select({
      fromSender: input.senderKey
        ? sql<number>`count(*) filter (where ${contactMessage.senderKey} = ${input.senderKey} and ${contactMessage.createdAt} > ${hourAgo.toISOString()}::timestamptz)`.mapWith(
            Number,
          )
        : sql<number>`0`.mapWith(Number),
      forSite: count(),
    })
    .from(contactMessage)
    .where(
      and(
        eq(contactMessage.siteId, input.siteId),
        gt(contactMessage.createdAt, new Date(now.getTime() - DAY_MS)),
      ),
    );
  if (
    (recent?.fromSender ?? 0) >= MESSAGE_LIMITS.perSenderPerHour ||
    (recent?.forSite ?? 0) >= MESSAGE_LIMITS.perSitePerDay
  ) {
    return { ok: false, reason: "rate-limited" };
  }
  const { name, email, organisation, topic, message } = input.message;
  const [row] = await db
    .insert(contactMessage)
    .values({
      siteId: input.siteId,
      name,
      email,
      organisation: organisation || null,
      topic: topic || null,
      message,
      senderKey: input.senderKey,
      createdAt: now,
    })
    .returning({ id: contactMessage.id });
  return { ok: true, id: row!.id };
}

export interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  organisation: string | null;
  topic: string | null;
  message: string;
  createdAt: Date;
  /** Null while the message is new. */
  readAt: Date | null;
}

export interface ContactMessagePage {
  rows: ContactMessageRow[];
  /** Pass back as `before` for the next, older page; null when this was the last. */
  nextCursor: string | null;
}

/** "<created_at ISO>_<id>": a stable place in a newest-first list, even with equal timestamps. */
function parseCursor(cursor: string | null | undefined): { createdAt: Date; id: string } | null {
  if (!cursor) return null;
  const at = cursor.lastIndexOf("_");
  const createdAt = new Date(cursor.slice(0, at));
  const id = cursor.slice(at + 1);
  if (at < 1 || Number.isNaN(createdAt.getTime()) || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return { createdAt, id };
}

function cursorOf(row: ContactMessageRow): string {
  return `${row.createdAt.toISOString()}_${row.id}`;
}

/**
 * A page of a site's messages for its owner, newest first, optionally about one topic. Another
 * user's site returns nothing. Older pages continue from `before`, so nothing is ever skipped.
 */
export async function listContactMessages(
  db: Database,
  input: {
    userId: string;
    siteId: string;
    topic?: string | null;
    before?: string | null;
    limit?: number;
  },
): Promise<ContactMessagePage> {
  const limit = Math.min(Math.max(input.limit ?? 15, 1), 100);
  const before = parseCursor(input.before);
  const rows = await db
    .select({
      id: contactMessage.id,
      name: contactMessage.name,
      email: contactMessage.email,
      organisation: contactMessage.organisation,
      topic: contactMessage.topic,
      message: contactMessage.message,
      createdAt: contactMessage.createdAt,
      readAt: contactMessage.readAt,
    })
    .from(contactMessage)
    .innerJoin(site, eq(site.id, contactMessage.siteId))
    .where(
      and(
        eq(contactMessage.siteId, input.siteId),
        eq(site.userId, input.userId),
        input.topic ? eq(contactMessage.topic, input.topic) : undefined,
        before
          ? sql`(${contactMessage.createdAt}, ${contactMessage.id}) < (${before.createdAt.toISOString()}::timestamptz, ${before.id}::uuid)`
          : undefined,
      ),
    )
    .orderBy(desc(contactMessage.createdAt), desc(contactMessage.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  return {
    rows: page,
    nextCursor: rows.length > limit && page.length ? cursorOf(page[page.length - 1]!) : null,
  };
}

export interface ContactMessageCounts {
  total: number;
  unread: number;
  /** Messages per topic, for the inbox filters. Messages without a topic aren't listed. */
  topics: Record<string, number>;
}

/** How many messages a site has, how many are new, and how many per topic. */
export async function countContactMessages(
  db: Database,
  input: { userId: string; siteId: string },
): Promise<ContactMessageCounts> {
  const rows = await db
    .select({
      topic: contactMessage.topic,
      total: count(),
      unread: sql<number>`count(*) filter (where ${contactMessage.readAt} is null)`.mapWith(Number),
    })
    .from(contactMessage)
    .innerJoin(site, eq(site.id, contactMessage.siteId))
    .where(and(eq(contactMessage.siteId, input.siteId), eq(site.userId, input.userId)))
    .groupBy(contactMessage.topic);
  const counts: ContactMessageCounts = { total: 0, unread: 0, topics: {} };
  for (const row of rows) {
    counts.total += row.total;
    counts.unread += row.unread;
    if (row.topic) counts.topics[row.topic] = row.total;
  }
  return counts;
}

/** New messages across the user's sites, for the badge on the Messages tab. */
export async function countUnreadMessages(db: Database, userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(contactMessage)
    .innerJoin(site, eq(site.id, contactMessage.siteId))
    .where(and(eq(site.userId, userId), isNull(contactMessage.readAt)));
  return row?.value ?? 0;
}

/** Marks one of the user's messages read or new again. False when there's no such message. */
export async function setContactMessageRead(
  db: Database,
  input: { userId: string; messageId: string; read: boolean },
): Promise<boolean> {
  const updated = await db
    .update(contactMessage)
    .set({ readAt: input.read ? new Date() : null })
    .where(
      and(
        eq(contactMessage.id, input.messageId),
        inArray(
          contactMessage.siteId,
          db.select({ id: site.id }).from(site).where(eq(site.userId, input.userId)),
        ),
      ),
    )
    .returning({ id: contactMessage.id });
  return updated.length > 0;
}

/** Deletes one message from a site the user owns. False when there was nothing to delete. */
export async function deleteContactMessage(
  db: Database,
  input: { userId: string; messageId: string },
): Promise<boolean> {
  const deleted = await db
    .delete(contactMessage)
    .where(
      and(
        eq(contactMessage.id, input.messageId),
        inArray(
          contactMessage.siteId,
          db.select({ id: site.id }).from(site).where(eq(site.userId, input.userId)),
        ),
      ),
    )
    .returning({ id: contactMessage.id });
  return deleted.length > 0;
}

/** Where to send an alert about a new message for a site, or null when its owner turned them off. */
export async function getMessageAlertAddress(db: Database, siteId: string): Promise<string | null> {
  const [row] = await db
    .select({ email: user.email, notify: site.notifyMessages })
    .from(site)
    .innerJoin(user, eq(user.id, site.userId))
    .where(eq(site.id, siteId))
    .limit(1);
  return row?.notify ? row.email : null;
}
