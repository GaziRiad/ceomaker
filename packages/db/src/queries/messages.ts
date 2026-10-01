import type { ContactMessage } from "@ceomaker/schema";
import { and, count, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { Database } from "../client";
import { contactMessage, site } from "../schema";

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
}

/** The newest messages for a site its owner can see; another user's site returns none. */
export async function listContactMessages(
  db: Database,
  input: { userId: string; siteId: string; limit?: number },
): Promise<ContactMessageRow[]> {
  return db
    .select({
      id: contactMessage.id,
      name: contactMessage.name,
      email: contactMessage.email,
      organisation: contactMessage.organisation,
      topic: contactMessage.topic,
      message: contactMessage.message,
      createdAt: contactMessage.createdAt,
    })
    .from(contactMessage)
    .innerJoin(site, eq(site.id, contactMessage.siteId))
    .where(and(eq(contactMessage.siteId, input.siteId), eq(site.userId, input.userId)))
    .orderBy(desc(contactMessage.createdAt))
    .limit(input.limit ?? 50);
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
