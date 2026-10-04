import type { SubscriptionStatus } from "@ceomaker/schema";

// How a Freemius license reads as one of our subscription states. Freemius grants access through
// the license: its expiry moves forward with each payment, and a refund or a manual cancel marks
// it cancelled at once. While Freemius retries a failed renewal, the license may already have
// expired but its subscription is not cancelled yet: that is our grace period (past_due).

export interface FreemiusLicenseState {
  cancelled: boolean;
  /** When the paid period ends. Null for a lifetime license. */
  expiration: Date | null;
  /** The license's latest subscription, if it has one. */
  subscription: { canceledAt: Date | null } | null;
}

export function freemiusStatus(
  license: FreemiusLicenseState,
  now: Date = new Date(),
): SubscriptionStatus {
  if (license.cancelled) return "canceled";
  if (!license.expiration || license.expiration > now) return "active";
  return license.subscription && !license.subscription.canceledAt ? "past_due" : "canceled";
}

/** Freemius writes dates as "YYYY-MM-DD HH:mm:ss" in UTC. */
export function parseFreemiusDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value.trim().replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
