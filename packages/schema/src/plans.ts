import type { TemplateKey } from "./templates";

/**
 * Plans. Everyone starts free: a published site on Meridian or Harbour at <name>.ceomaker.app,
 * with email and links to get in touch, a first AI draft and a few rewrites, and a "Made with
 * CEOMaker" badge. Pro adds the premium templates, a custom domain, the contact form and its inbox,
 * analytics, unlimited AI rewrites and CV import, and removes the badge.
 */
export const PLANS = ["free", "pro"] as const;
export type Plan = (typeof PLANS)[number];

/** Unknown or missing values are free, so a bad value never unlocks anything. */
export function planOf(value: unknown): Plan {
  return value === "pro" ? "pro" : "free";
}

export function isPro(plan: Plan): boolean {
  return plan === "pro";
}

/**
 * Templates only Pro sites can publish. Free sites may try them in the draft. Meridian and
 * Harbour are free.
 */
export const PREMIUM_TEMPLATES: ReadonlySet<TemplateKey> = new Set<TemplateKey>([
  "monument",
  "salon",
  "folio",
  "tempo",
]);

export function isPremiumTemplate(key: TemplateKey): boolean {
  return PREMIUM_TEMPLATES.has(key);
}

/** What a live site shows instead of a premium template once its owner isn't Pro. */
export const FREE_FALLBACK_TEMPLATE = { key: "meridian", version: 1 } as const;

/** AI on the free plan: one first draft per account, ever, and a few headline rewrites a day. */
export const FREE_AI_LIMITS = { drafts: 1, rewritesPerDay: 5 } as const;

/**
 * A Pro subscription's state, the same whichever billing provider sells it: each provider's
 * webhook maps its own states onto these. "past_due" means a renewal payment failed and the
 * provider is retrying it.
 */
export const SUBSCRIPTION_STATUSES = ["active", "past_due", "paused", "canceled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/**
 * Pro holds while a subscription is active or its payment is being retried: the provider's retry
 * schedule is the grace period. It ends when the provider pauses or cancels the subscription,
 * which for a cancellation is at the end of the period already paid for.
 */
export function subscriptionGrantsPro(status: SubscriptionStatus): boolean {
  return status === "active" || status === "past_due";
}

/** Gifts of Pro, given from the admin page, last a whole number of months. */
export const GIFT_MONTHS = [1, 3, 6, 12] as const;
export type GiftMonths = (typeof GIFT_MONTHS)[number];

/** The "your gift ends soon" email goes out this many days before a gift ends. */
export const GIFT_REMINDER_DAYS = 7;

/** Whole months later on the calendar (UTC), kept within shorter months: 31 Jan + 1 is 28 Feb. */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

/** Where a new gift ends: added to a gift that hasn't ended, or counted from now. */
export function giftEndAfter(current: Date | null, months: number, now: Date): Date {
  return addMonths(current && giftGrantsPro(current, now) ? current : now, months);
}

/** A gift of Pro holds until the moment it ends. */
export function giftGrantsPro(proUntil: Date | null, now: Date): boolean {
  return proUntil !== null && proUntil.getTime() > now.getTime();
}

/**
 * The account's plan: Pro while a subscription grants it or a gift hasn't ended. The two don't
 * interact, so paying during a gift, or a gift outliving a cancelled subscription, both just work.
 */
export function planFrom(
  statuses: readonly SubscriptionStatus[],
  proUntil: Date | null,
  now: Date,
): Plan {
  return statuses.some(subscriptionGrantsPro) || giftGrantsPro(proUntil, now) ? "pro" : "free";
}
