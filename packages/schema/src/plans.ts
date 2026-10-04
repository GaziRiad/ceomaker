import type { TemplateKey } from "./templates";

/**
 * Plans. Everyone starts free: a published site on Meridian at <name>.ceomaker.app, with email
 * and links to get in touch, a first AI draft and a few rewrites, and a "Made with CEOMaker"
 * badge. Pro adds the premium templates, a custom domain, the contact form and its inbox,
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

/** Templates only Pro sites can publish. Free sites may try them in the draft. */
export const PREMIUM_TEMPLATES: ReadonlySet<TemplateKey> = new Set<TemplateKey>([
  "monument",
  "salon",
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
