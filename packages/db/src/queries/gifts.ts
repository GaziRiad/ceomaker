import {
  giftEndAfter,
  giftGrantsPro,
  GIFT_REMINDER_DAYS,
  planOf,
  subscriptionGrantsPro,
  type GiftMonths,
  type Plan,
} from "@ceomaker/schema";
import { and, eq, gt, isNotNull, isNull, lte, not } from "drizzle-orm";
import type { Database } from "../client";
import { user } from "../schema";
import { lockAccount, paysForPro, settlePlan, subscriptionStatuses } from "./plan-state";

// Gifts of Pro, given from the admin page. A gift is an end date on the account (proUntil): the
// account is Pro until then, whatever billing says, and paying during a gift simply overlaps it.
// A daily job ends gifts once their date has passed (expireProGifts) and emails owners a week
// before (listGiftReminders).

const DAY_MS = 24 * 60 * 60 * 1000;

export interface GiftChange {
  userId: string;
  plan: Plan;
  planChanged: boolean;
  proUntil: Date | null;
}

/** When the account's gift ends or ended; null if it never had one. */
export async function getProGiftEnd(db: Database, userId: string): Promise<Date | null> {
  const [row] = await db
    .select({ proUntil: user.proUntil })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row?.proUntil ?? null;
}

/**
 * Gives the account Pro for some months, added to a gift that hasn't ended yet. A note replaces
 * the earlier one; without one the earlier note stays. A new end date gets its own reminder.
 * Null when the account doesn't exist.
 */
export async function giveProGift(
  db: Database,
  input: { userId: string; months: GiftMonths; note?: string | null; now?: Date },
): Promise<GiftChange | null> {
  const now = input.now ?? new Date();
  return db.transaction(async (tx) => {
    const account = await lockAccount(tx, input.userId);
    if (!account) return null;
    const proUntil = giftEndAfter(account.proUntil, input.months, now);
    const note = input.note?.trim() || account.proNote;
    await tx
      .update(user)
      .set({ proUntil, proNote: note, proRemindedAt: null })
      .where(eq(user.id, input.userId));
    const settled = await settlePlan(tx, input.userId, { ...account, proUntil }, now);
    return { userId: input.userId, proUntil, ...settled };
  });
}

/**
 * Ends the account's gift now: it stays Pro only if a subscription pays for it. Also ends Pro set
 * by hand before gifts existed (Pro with no end date). Null when the account doesn't exist or has
 * nothing to end.
 */
export async function endProGift(
  db: Database,
  input: { userId: string; now?: Date },
): Promise<GiftChange | null> {
  const now = input.now ?? new Date();
  return db.transaction(async (tx) => {
    const account = await lockAccount(tx, input.userId);
    if (!account) return null;
    // Pro set by hand: Pro with no gift date that no subscription pays for.
    const byHand =
      account.proUntil === null &&
      planOf(account.plan) === "pro" &&
      !(await subscriptionStatuses(tx, input.userId)).some(subscriptionGrantsPro);
    if (!giftGrantsPro(account.proUntil, now) && !byHand) return null;
    await tx.update(user).set({ proUntil: now }).where(eq(user.id, input.userId));
    const settled = await settlePlan(tx, input.userId, { ...account, proUntil: now }, now);
    return { userId: input.userId, proUntil: now, ...settled };
  });
}

/**
 * Moves accounts whose gift has ended to the plan their subscriptions give. Returns the accounts
 * whose plan changed, so their live sites can be refreshed.
 */
export async function expireProGifts(db: Database, now: Date = new Date()): Promise<string[]> {
  const due = await db
    .select({ id: user.id })
    .from(user)
    .where(
      and(
        eq(user.plan, "pro"),
        isNotNull(user.proUntil),
        lte(user.proUntil, now),
        not(paysForPro(db)),
      ),
    );
  const changed: string[] = [];
  for (const { id } of due) {
    const result = await db.transaction(async (tx) => {
      const account = await lockAccount(tx, id);
      return account ? settlePlan(tx, id, account, now) : null;
    });
    if (result?.planChanged) changed.push(id);
  }
  return changed;
}

export interface GiftReminder {
  userId: string;
  email: string;
  name: string;
  proUntil: Date;
}

/**
 * Gifts ending within GIFT_REMINDER_DAYS whose owner hasn't been told yet. Owners who already
 * pay are left out: their Pro doesn't end with the gift.
 */
export async function listGiftReminders(
  db: Database,
  now: Date = new Date(),
): Promise<GiftReminder[]> {
  const soon = new Date(now.getTime() + GIFT_REMINDER_DAYS * DAY_MS);
  const rows = await db
    .select({ userId: user.id, email: user.email, name: user.name, proUntil: user.proUntil })
    .from(user)
    .where(
      and(
        gt(user.proUntil, now),
        lte(user.proUntil, soon),
        isNull(user.proRemindedAt),
        not(paysForPro(db)),
      ),
    );
  return rows.flatMap((row) => (row.proUntil ? [{ ...row, proUntil: row.proUntil }] : []));
}

/** Records that the reminder for this gift went out. A gift changed since then isn't marked. */
export async function markGiftReminded(
  db: Database,
  input: { userId: string; proUntil: Date; now?: Date },
): Promise<void> {
  await db
    .update(user)
    .set({ proRemindedAt: input.now ?? new Date() })
    .where(and(eq(user.id, input.userId), eq(user.proUntil, input.proUntil)));
}
