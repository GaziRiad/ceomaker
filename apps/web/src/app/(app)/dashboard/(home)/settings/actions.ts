"use server";

import {
  AddressLockedError,
  changeSubdomain,
  deleteAccount,
  getDb,
  getSiteDomain,
  InvalidSiteDataError,
  listSitesForUser,
  setSiteNotifications,
  SiteNotFoundError,
  SubdomainTakenError,
} from "@ceomaker/db";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { isPro } from "@ceomaker/schema";
import { getAuth, getSession } from "@/lib/auth";
import { planFor } from "@/lib/plan";
import { forgetDomainRouting } from "@/lib/domain-routing";
import {
  checkSiteDomain,
  connectDomain,
  disconnectDomain,
  recordsAdded,
  releaseFromProvider,
  type DomainResult,
} from "@/lib/domains/service";
import { canSendEmail } from "@/lib/email";
import { cancelFreemiusSubscriptions } from "@/lib/freemius";
import { isUuid } from "@/lib/site-data";
import { siteCacheTag } from "@/lib/sites";

// Settings changes. Each action re-checks the session; queries scope everything by owner.

type Failure = { ok: false; error: string };

const SIGNED_OUT: Failure = { ok: false, error: "Your session ended. Sign in again." };
const NOT_FOUND: Failure = { ok: false, error: "This site no longer exists." };
const UNREACHABLE: Failure = { ok: false, error: "Something went wrong. Try again." };

/** Renames the site's address. Only possible before its first publish. */
export async function saveAddressAction(
  siteId: string,
  subdomain: string,
): Promise<{ ok: true; subdomain: string } | Failure> {
  const session = await getSession();
  if (!session) return SIGNED_OUT;
  if (!isUuid(siteId)) return NOT_FOUND;
  try {
    const saved = await changeSubdomain(getDb(), {
      userId: session.user.id,
      siteId,
      subdomain: String(subdomain),
    });
    return { ok: true, subdomain: saved.subdomain };
  } catch (error) {
    if (error instanceof SubdomainTakenError) {
      return { ok: false, error: "Someone already has this address." };
    }
    if (error instanceof AddressLockedError) {
      return { ok: false, error: "Your address is locked since your first publish." };
    }
    if (error instanceof InvalidSiteDataError) {
      return { ok: false, error: "Use 3 to 40 lowercase letters, numbers or hyphens." };
    }
    if (error instanceof SiteNotFoundError) return NOT_FOUND;
    throw error;
  }
}

/** Turns the "new message" emails on or off. */
export async function setNotificationsAction(
  siteId: string,
  notify: boolean,
): Promise<{ ok: true } | Failure> {
  const session = await getSession();
  if (!session) return SIGNED_OUT;
  if (!isUuid(siteId) || typeof notify !== "boolean") return NOT_FOUND;
  try {
    await setSiteNotifications(getDb(), { userId: session.user.id, siteId, notify });
    return { ok: true };
  } catch (error) {
    if (error instanceof SiteNotFoundError) return NOT_FOUND;
    throw error;
  }
}

const nameSchema = z.string().trim().min(1).max(80);

export async function saveNameAction(name: string): Promise<{ ok: true } | Failure> {
  const session = await getSession();
  if (!session) return SIGNED_OUT;
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: "Use a name between 1 and 80 characters." };
  await getAuth().api.updateUser({ body: { name: parsed.data }, headers: await headers() });
  return { ok: true };
}

/**
 * Sends a link to the new address; the email changes when it's opened. An address that already
 * has an account gets the same answer and no email, so this can't be used to test addresses.
 */
export async function changeEmailAction(newEmail: string): Promise<{ ok: true } | Failure> {
  const session = await getSession();
  if (!session) return SIGNED_OUT;
  if (!canSendEmail()) {
    return { ok: false, error: "Changing your email isn't available yet." };
  }
  const parsed = z.email().safeParse(String(newEmail).trim().toLowerCase());
  if (!parsed.success) return { ok: false, error: "Check the email address." };
  if (parsed.data === session.user.email.toLowerCase()) {
    return { ok: false, error: "That's already your email." };
  }
  try {
    await getAuth().api.changeEmail({
      body: { newEmail: parsed.data, callbackURL: "/dashboard/settings/account?email=changed" },
      headers: await headers(),
    });
    return { ok: true };
  } catch (error) {
    console.error("Couldn't send the email change link", error);
    return { ok: false, error: "We couldn't send the link. Try again shortly." };
  }
}

/** Ends every session of this account, this browser's included. */
export async function signOutEverywhereAction(): Promise<{ ok: true } | Failure> {
  const session = await getSession();
  if (!session) return SIGNED_OUT;
  const auth = getAuth();
  const list = await headers();
  try {
    await auth.api.revokeSessions({ headers: list });
    await auth.api.signOut({ headers: list });
    return { ok: true };
  } catch (error) {
    console.error("Couldn't sign out everywhere", error);
    return UNREACHABLE;
  }
}

/**
 * Deletes the account and everything it owns. The confirmation must be the account's email,
 * checked here as well as in the dialog. A Pro subscription is cancelled first, so nobody is
 * charged for a deleted account. Live addresses stay held, and their pages stop at once.
 */
export async function deleteAccountAction(confirmation: string): Promise<{ ok: true } | Failure> {
  const session = await getSession();
  if (!session) return SIGNED_OUT;
  if (String(confirmation).trim().toLowerCase() !== session.user.email.toLowerCase()) {
    return { ok: false, error: "Type your email exactly as shown to confirm." };
  }
  try {
    await cancelFreemiusSubscriptions(session.user.id, "Account deleted");
  } catch (error) {
    console.error("Cancelling the subscription before deleting an account failed", error);
    return {
      ok: false,
      error: "Your Pro subscription couldn't be cancelled, so nothing was deleted. Try again.",
    };
  }
  try {
    const { heldAddresses, domains } = await deleteAccount(getDb(), { userId: session.user.id });
    for (const subdomain of heldAddresses) updateTag(siteCacheTag(subdomain));
    for (const domain of domains) await releaseFromProvider(domain);
    if (domains.length) forgetDomainRouting();
  } catch (error) {
    if (error instanceof SiteNotFoundError) return SIGNED_OUT;
    throw error;
  }
  // The sessions went with the account; this clears this browser's cookies too.
  await getAuth().api.signOut({ headers: await headers() });
  return { ok: true };
}

/** Switches off renewal of Pro. It stays on to the end of the period already paid for. */
export async function cancelProAction(): Promise<{ ok: true } | Failure> {
  const session = await getSession();
  if (!session) return SIGNED_OUT;
  try {
    await cancelFreemiusSubscriptions(session.user.id, "Cancelled in CEOMaker Settings");
  } catch (error) {
    console.error("Cancelling a subscription failed", error);
    return { ok: false, error: "Your subscription couldn't be cancelled just now. Try again." };
  }
  return { ok: true };
}

// Custom domains. Each returns the domain as Settings should now show it (null: none).

const invalidate = (subdomain: string) => updateTag(siteCacheTag(subdomain));

/** The signed-in user's site with this id, or a failure to show. */
async function ownedSite(siteId: string) {
  const session = await getSession();
  if (!session) return { failure: SIGNED_OUT };
  if (!isUuid(siteId)) return { failure: NOT_FOUND };
  const site = (await listSitesForUser(getDb(), session.user.id)).find((row) => row.id === siteId);
  if (!site) return { failure: NOT_FOUND };
  return { failure: null, session, site };
}

export async function connectDomainAction(siteId: string, domain: string): Promise<DomainResult> {
  const owned = await ownedSite(siteId);
  if (owned.failure) return owned.failure;
  if (!isPro(await planFor(owned.session.user.id))) {
    return { ok: false, error: "Custom domains are part of Pro." };
  }
  return connectDomain({
    userId: owned.session.user.id,
    siteId,
    subdomain: owned.site.subdomain,
    raw: String(domain).slice(0, 300),
    invalidate,
  });
}

export async function domainRecordsAddedAction(siteId: string): Promise<DomainResult> {
  const owned = await ownedSite(siteId);
  if (owned.failure) return owned.failure;
  return recordsAdded({
    userId: owned.session.user.id,
    siteId,
    subdomain: owned.site.subdomain,
    owner: owned.session.user,
    invalidate,
  });
}

/** Checks DNS now. Repeated presses within a few seconds return the last result. */
export async function checkDomainAction(siteId: string): Promise<DomainResult> {
  const owned = await ownedSite(siteId);
  if (owned.failure) return owned.failure;
  const row = await getSiteDomain(getDb(), { userId: owned.session.user.id, siteId });
  if (!row) return { ok: true, view: null };
  const view = await checkSiteDomain({
    row,
    subdomain: owned.site.subdomain,
    owner: owned.session.user,
    invalidate,
  });
  return { ok: true, view };
}

export async function removeDomainAction(siteId: string): Promise<DomainResult> {
  const owned = await ownedSite(siteId);
  if (owned.failure) return owned.failure;
  await disconnectDomain({ userId: owned.session.user.id, siteId, invalidate });
  return { ok: true, view: null };
}
