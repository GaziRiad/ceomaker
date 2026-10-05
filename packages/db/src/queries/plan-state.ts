import {
  planFrom,
  planOf,
  SUBSCRIPTION_STATUSES,
  subscriptionGrantsPro,
  type Plan,
  type SubscriptionStatus,
} from "@ceomaker/schema";
import { and, eq, exists, inArray, type SQL } from "drizzle-orm";
import type { Database } from "../client";
import { subscription, user } from "../schema";

// The account's plan follows from its subscriptions and its gift. Billing and gifts both change
// it through these two steps, inside one transaction, so neither can overwrite the other.

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export interface LockedAccount {
  plan: string;
  proUntil: Date | null;
  proNote: string | null;
}

/** Locks the account for the rest of the transaction, so two plan changes can't interleave. */
export async function lockAccount(tx: Transaction, userId: string): Promise<LockedAccount | null> {
  const [account] = await tx
    .select({ plan: user.plan, proUntil: user.proUntil, proNote: user.proNote })
    .from(user)
    .where(eq(user.id, userId))
    .for("update");
  return account ?? null;
}

/** The states of the account's subscriptions, current and past. */
export async function subscriptionStatuses(
  tx: Transaction,
  userId: string,
): Promise<SubscriptionStatus[]> {
  const rows = await tx
    .select({ status: subscription.status })
    .from(subscription)
    .where(eq(subscription.userId, userId));
  return rows.map((row) => row.status);
}

/** Brings a locked account's plan in line with its subscriptions and its gift (see planFrom). */
export async function settlePlan(
  tx: Transaction,
  userId: string,
  account: Pick<LockedAccount, "plan" | "proUntil">,
  now: Date,
): Promise<{ plan: Plan; planChanged: boolean }> {
  const plan = planFrom(await subscriptionStatuses(tx, userId), account.proUntil, now);
  const planChanged = plan !== planOf(account.plan);
  if (planChanged) await tx.update(user).set({ plan }).where(eq(user.id, userId));
  return { plan, planChanged };
}

/** Subscription states that pay for Pro (see subscriptionGrantsPro). */
export const PAYING_STATUSES = SUBSCRIPTION_STATUSES.filter(subscriptionGrantsPro);

/** True when the account in the outer query (a user row) has a subscription paying for Pro. */
export function paysForPro(db: Pick<Database, "select">): SQL {
  return exists(
    db
      .select({ id: subscription.id })
      .from(subscription)
      .where(and(eq(subscription.userId, user.id), inArray(subscription.status, PAYING_STATUSES))),
  );
}
