import "server-only";
import { findUserIdByEmail, getDb, listSubscriptions, type SubscriptionSync } from "@ceomaker/db";
import { Freemius, idToString, parseBillingCycle, parseNumber } from "@freemius/sdk";
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

/**
 * Stops renewal of every Freemius subscription on the account. Pro stays on to the end of the
 * period already paid for. Throws if one can't be stopped, so the caller can say so (and an
 * account being deleted stays until it is, so it's never charged again).
 */
export async function cancelFreemiusSubscriptions(userId: string, reason: string): Promise<void> {
  const rows = (await listSubscriptions(getDb(), userId)).filter(
    (row) => row.provider === FREEMIUS && row.status !== "canceled",
  );
  if (!rows.length) return;
  const fs = freemius();
  if (!fs) throw new Error("Freemius isn't configured");
  for (const row of rows) {
    const subscription = await fs.api.license.retrieveSubscription(row.providerSubscriptionId);
    if (!subscription?.id || subscription.canceled_at) continue;
    const cancelled = await fs.api.subscription.cancel(subscription.id, reason);
    if (!cancelled) throw new Error(`Couldn't cancel Freemius subscription ${subscription.id}`);
  }
}

/** The account's current Freemius license: an unended one first, else the latest. */
async function currentLicense(userId: string) {
  const rows = (await listSubscriptions(getDb(), userId)).filter(
    (row) => row.provider === FREEMIUS,
  );
  return rows.find((row) => row.status !== "canceled") ?? rows[0] ?? null;
}

export interface FreemiusPayment {
  id: string;
  date: Date;
  /** What was charged, tax included; negative for a refund. */
  amount: number;
  currency: string;
}

/** What Settings › Billing shows about a Freemius subscription, read live from Freemius. */
export interface FreemiusBilling {
  cycle: "monthly" | "yearly" | null;
  /** The next charge. */
  amount: number | null;
  currency: string;
  /** The next charge's date, while renewal is on. */
  renewsOn: Date | null;
  /** When the paid period ends: the day Pro stops once renewal is off. */
  paidUntil: Date | null;
  /** Renewal has been switched off (cancelled); Pro lasts until paidUntil. */
  cancelled: boolean;
  payments: FreemiusPayment[];
}

/** Null when the account has never bought through Freemius, or Freemius can't be reached. */
export async function freemiusBilling(userId: string): Promise<FreemiusBilling | null> {
  const fs = freemius();
  const row = fs ? await currentLicense(userId) : null;
  if (!fs || !row) return null;
  try {
    const [license, subscription] = await Promise.all([
      fs.api.license.retrieve(row.providerSubscriptionId),
      fs.api.license.retrieveSubscription(row.providerSubscriptionId),
    ]);
    // Every purchase here is a subscription, so a missing one is a failed read, not "none".
    if (!license?.user_id || !subscription) return null;
    const payments = await fs.api.user.retrievePayments(license.user_id);
    const cycle = parseBillingCycle(subscription.billing_cycle);
    return {
      cycle: cycle === "monthly" || cycle === "yearly" ? cycle : null,
      amount: parseNumber(subscription.renewal_amount),
      currency: (subscription.currency ?? "usd").toUpperCase(),
      renewsOn: subscription.canceled_at ? null : parseFreemiusDate(subscription.next_payment),
      paidUntil: parseFreemiusDate(license.expiration),
      cancelled: Boolean(subscription.canceled_at),
      payments: payments
        .filter((payment) => payment.id && sameEnvironment(payment.environment))
        .map((payment) => ({
          id: idToString(payment.id!),
          date: parseFreemiusDate(payment.created) ?? new Date(0),
          amount: (payment.type === "payment" ? 1 : -1) * Math.abs(parseNumber(payment.gross) ?? 0),
          currency: (payment.currency ?? "usd").toUpperCase(),
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime()),
    };
  } catch (error) {
    console.error("Reading billing details from Freemius failed", error);
    return null;
  }
}

/** Freemius's secure page for a new card; it returns to Billing like a purchase does. */
export async function freemiusCardUpdateLink(userId: string): Promise<string | null> {
  const fs = freemius();
  const row = fs ? await currentLicense(userId) : null;
  if (!fs || !row || row.status === "canceled") return null;
  const result = await fs.api.license.retrieveCheckoutUpgrade(row.providerSubscriptionId, {
    is_payment_method_update: true,
  });
  if (!result?.url) return null;
  const url = new URL(result.url);
  if (freemiusSandbox()) {
    const sandbox = await fs.checkout.getSandboxParams();
    url.searchParams.set("s_ctx_ts", sandbox.ctx);
    url.searchParams.set("sandbox", sandbox.token);
  }
  return url.toString();
}

/** An invoice of the account's own, as a PDF. Null for a payment that isn't theirs. */
export async function freemiusInvoice(userId: string, paymentId: string): Promise<Blob | null> {
  const fs = freemius();
  const row = fs ? await currentLicense(userId) : null;
  if (!fs || !row) return null;
  const license = await fs.api.license.retrieve(row.providerSubscriptionId);
  if (!license?.user_id) return null;
  const payments = await fs.api.user.retrievePayments(license.user_id);
  if (!payments.some((payment) => payment.id && idToString(payment.id) === paymentId)) return null;
  return fs.api.user.retrieveInvoice(license.user_id, paymentId);
}
