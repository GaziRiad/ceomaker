import { SUBSCRIPTION_STATUSES } from "@ceomaker/schema";
import { index, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const subscriptionStatus = pgEnum("subscription_status", SUBSCRIPTION_STATUSES);

/**
 * A Pro subscription as the billing provider last reported it. The account's plan (user.plan)
 * follows from these rows and its gift: Pro while any of them grants it (see
 * subscriptionGrantsPro) or the gift hasn't ended. An account with no rows is never changed by
 * billing, so Pro set by hand stays.
 */
export const subscription = pgTable(
  "subscription",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Who sells it, e.g. "paddle". */
    provider: text("provider").notNull(),
    /** The provider's ids for the subscription and the paying customer. */
    providerSubscriptionId: text("provider_subscription_id").notNull(),
    providerCustomerId: text("provider_customer_id"),
    status: subscriptionStatus("status").notNull(),
    /** End of the period paid for: the renewal date, or when a cancellation takes effect. */
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    /** When the latest change happened at the provider. Webhooks can arrive out of order. */
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("subscription_provider_ref_unique").on(table.provider, table.providerSubscriptionId),
    index("subscription_user_id_idx").on(table.userId),
  ],
);
