import "server-only";
import { findUserIdByEmail, getDb, listSubscriptions, type SubscriptionSync } from "@ceomaker/db";
import { Freemius, idToString } from "@freemius/sdk";
import { syncSubscription } from "./billing";
import { serverEnv } from "./env";
import { freemiusStatus, parseFreemiusDate } from "./freemius-state";

// Freemius sells Pro as merchant of record. Checkout is Freemius's hosted page; what a buyer is
// entitled to is read back from Freemius (never trusted from the browser) and handed to the
// provider-neutral syncSubscription. Production sells for real; previews and local development
// use Freemius's sandbox, and each ignores the other's licenses.

export const FREEMIUS = "freemius";

/** Our subscription rows for Freemius hold the license id: the license is what grants access. */
type LicenseId = string;

let client: Freemius | undefined;

/** The Freemius SDK, or null until all four FREEMIUS_* variables are set. */
export function freemius(): Freemius | null {
  const env = serverEnv();
  const { FREEMIUS_PRODUCT_ID, FREEMIUS_API_KEY, FREEMIUS_SECRET_KEY, FREEMIUS_PUBLIC_KEY } = env;
  if (!FREEMIUS_PRODUCT_ID || !FREEMIUS_API_KEY || !FREEMIUS_SECRET_KEY || !FREEMIUS_PUBLIC_KEY) {
    return null;
  }
  client ??= new Freemius({
    productId: FREEMIUS_PRODUCT_ID,
    apiKey: FREEMIUS_API_KEY,
    secretKey: FREEMIUS_SECRET_KEY,
    publicKey: FREEMIUS_PUBLIC_KEY,
  });
  return client;
}

/** Real payments only on the production deployment. */
export function freemiusSandbox(): boolean {
  return process.env.VERCEL_ENV !== "production";
}

/** Freemius marks every license as sandbox (1) or live (0). */
function sameEnvironment(environment: number | undefined): boolean {
  return (environment === 1) === freemiusSandbox();
}

export type BillingCycle = "monthly" | "annual";

/** The hosted checkout for Pro, with the account's email fixed so the purchase finds the account. */
export async function freemiusCheckoutLink(
  user: { email: string; name?: string | null },
  cycle: BillingCycle,
): Promise<string | null> {
  const fs = freemius();
  if (!fs) return null;
  const checkout = await fs.checkout.create({
    user: { email: user.email, name: user.name ?? undefined },
    isSandbox: freemiusSandbox(),
  });
  return checkout.setBillingCycle(cycle).getLink();
}

/**
 * Reads a license from Freemius and applies it. Throws when Freemius can't be reached, so a
 * webhook is retried. A license from the other environment, or one Freemius no longer has, is
 * left alone (see freemiusLicenseRemoved for deletions).
 */
export async function syncFreemiusLicense(licenseId: LicenseId): Promise<SubscriptionSync> {
  const fs = freemius();
  if (!fs) throw new Error("Freemius isn't configured");
  const readAt = new Date();
  const license = await fs.api.license.retrieve(licenseId);
  if (!license) throw new Error(`Couldn't read Freemius license ${licenseId}`);
  if (!sameEnvironment(license.environment)) return { outcome: "unknown" };

  const [subscription, buyer] = await Promise.all([
    fs.api.license.retrieveSubscription(licenseId),
    license.user_id ? fs.api.user.retrieve(license.user_id) : null,
  ]);
  // The SDK answers null for "none" and for a failed request alike: without the buyer a new
  // purchase can't find its account, so retry rather than guess.
  if (license.user_id && !buyer) throw new Error(`Couldn't read the buyer of license ${licenseId}`);
  const expiration = parseFreemiusDate(license.expiration);
  const status = freemiusStatus(
    {
      cancelled: license.is_cancelled ?? false,
      expiration,
      subscription: subscription
        ? { canceledAt: parseFreemiusDate(subscription.canceled_at) }
        : null,
    },
    readAt,
  );
  return syncSubscription({
    provider: FREEMIUS,
    subscriptionId: idToString(license.id!),
    customerId: license.user_id ? idToString(license.user_id) : null,
    userId: buyer?.email ? await findUserIdByEmail(getDb(), buyer.email) : null,
    status,
    currentPeriodEnd: expiration,
    occurredAt: readAt,
  });
}

/** A license deleted at Freemius grants nothing any more. */
export async function freemiusLicenseRemoved(licenseId: LicenseId): Promise<SubscriptionSync> {
  return syncSubscription({
    provider: FREEMIUS,
    subscriptionId: licenseId,
    status: "canceled",
    occurredAt: new Date(),
  });
}

/** A short-lived sign-in link to Freemius's customer portal (card, invoices, cancelling). */
export async function freemiusPortalLink(email: string): Promise<string | null> {
  const result = await freemius()?.api.user.retrieveHostedCustomerPortalByEmail(email);
  return result?.link ?? null;
}

/**
 * Stops renewal of every Freemius subscription on the account, so a deleted account is never
 * charged again. Throws if one can't be stopped: the account must then stay until it is.
 */
export async function cancelFreemiusSubscriptions(userId: string): Promise<void> {
  const rows = (await listSubscriptions(getDb(), userId)).filter(
    (row) => row.provider === FREEMIUS && row.status !== "canceled",
  );
  if (!rows.length) return;
  const fs = freemius();
  if (!fs) throw new Error("Freemius isn't configured");
  for (const row of rows) {
    const subscription = await fs.api.license.retrieveSubscription(row.providerSubscriptionId);
    if (!subscription?.id || subscription.canceled_at) continue;
    const cancelled = await fs.api.subscription.cancel(subscription.id, "Account deleted");
    if (!cancelled) throw new Error(`Couldn't cancel Freemius subscription ${subscription.id}`);
  }
}
