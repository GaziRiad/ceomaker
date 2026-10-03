import {
  planOf,
  subscriptionGrantsPro,
  type Plan,
  type SubscriptionStatus,
} from "@ceomaker/schema";
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../client";
import { subscription, user } from "../schema";

// Billing. Each provider's webhook turns its events into a SubscriptionEvent; everything after
// that (which account, which plan) is decided here, the same for every provider.

export interface SubscriptionEvent {
  provider: string;
  subscriptionId: string;
  customerId?: string | null;
  /**
   * Our account id, when the provider hands back what checkout was given. Later events may
   * leave it out: the subscription is then found by its id.
   */
  userId?: string | null;
  status: SubscriptionStatus;
  currentPeriodEnd?: Date | null;
  /** When the change happened at the provider (not when the webhook arrived). */
  occurredAt: Date;
}

export type SubscriptionSync =
  /** No account to attach it to: an unknown subscription without our account id. */
  | { outcome: "unknown" }
  /** A newer event for this subscription was already applied. */
  | { outcome: "stale"; userId: string }
  | { outcome: "applied"; userId: string; plan: Plan; planChanged: boolean };

/**
 * Records a subscription change and brings the account's plan in line with all of its
 * subscriptions. Safe to repeat: a redelivered event changes nothing, and an older event never
 * overwrites a newer one.
 */
export async function applySubscriptionEvent(
  db: Database,
  event: SubscriptionEvent,
): Promise<SubscriptionSync> {
  return db.transaction(async (tx) => {
    const [known] = await tx
      .select({ userId: subscription.userId })
      .from(subscription)
      .where(
        and(
          eq(subscription.provider, event.provider),
          eq(subscription.providerSubscriptionId, event.subscriptionId),
        ),
      )
      .limit(1);
    // A subscription stays with the account it started on.
    const userId = known?.userId ?? event.userId;
    if (!userId) return { outcome: "unknown" };

    // Locks the account, so two events for it at once can't leave the plan out of step.
    const [account] = await tx
      .select({ plan: user.plan })
      .from(user)
      .where(eq(user.id, userId))
      .for("update");
    if (!account) return { outcome: "unknown" };

    const values = {
      status: event.status,
      currentPeriodEnd: event.currentPeriodEnd ?? null,
      changedAt: event.occurredAt,
      ...(event.customerId ? { providerCustomerId: event.customerId } : {}),
    };
    const written = await tx
      .insert(subscription)
      .values({
        userId,
        provider: event.provider,
        providerSubscriptionId: event.subscriptionId,
        ...values,
      })
      .onConflictDoUpdate({
        target: [subscription.provider, subscription.providerSubscriptionId],
        set: values,
        setWhere: sql`${subscription.changedAt} <= excluded.changed_at`,
      })
      .returning({ id: subscription.id });
    if (!written.length) return { outcome: "stale", userId };

    const statuses = await tx
      .select({ status: subscription.status })
      .from(subscription)
      .where(eq(subscription.userId, userId));
    const plan: Plan = statuses.some((row) => subscriptionGrantsPro(row.status)) ? "pro" : "free";
    const planChanged = plan !== planOf(account.plan);
    if (planChanged) await tx.update(user).set({ plan }).where(eq(user.id, userId));
    return { outcome: "applied", userId, plan, planChanged };
  });
}
