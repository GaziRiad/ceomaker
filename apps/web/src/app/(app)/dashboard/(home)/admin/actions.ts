"use server";

import {
  deleteSite,
  endProGift,
  getDb,
  getPrimarySiteId,
  giveProGift,
  listOwnedSites,
  SiteNotFoundError,
} from "@ceomaker/db";
import { GIFT_MONTHS, type GiftMonths } from "@ceomaker/schema";
import { updateTag } from "next/cache";
import { adminSession } from "@/lib/admin";
import { refreshLiveSites } from "@/lib/billing";
import { forgetDomainRouting } from "@/lib/domain-routing";
import { releaseFromProvider } from "@/lib/domains/service";
import { emailConfigured } from "@/lib/email";
import { lifecycleGiftGiven } from "@/lib/lifecycle-email";
import { removeMedia } from "@/lib/media-store";
import { trackServerEvent } from "@/lib/product-analytics/server";
import { appUrl } from "@/lib/routing";
import { siteCacheTag } from "@/lib/sites";

// The admin page's actions: gifts of Pro, and drafts made for other people. Each action checks
// again that an admin is signed in. When the plan changes, the owner's live site shows it on its
// next visit.

type Result = { ok: true; message: string } | { ok: false; error: string };

const NOT_ALLOWED: Result = { ok: false, error: "Only admins can do this." };
const NO_ACCOUNT: Result = { ok: false, error: "This account no longer exists." };

/** How long a gift's note can be. */
const NOTE_MAX = 200;

const longDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function isGiftMonths(value: unknown): value is GiftMonths {
  return GIFT_MONTHS.some((months) => months === value);
}

/**
 * Gives Pro for 1, 3, 6 or 12 months, added to a gift that hasn't ended, and tells Resend, whose
 * "Gift of Pro" Automation emails the owner. A failed email doesn't undo the gift; the message
 * says so.
 */
export async function giveProGiftAction(
  userId: string,
  months: number,
  note: string,
): Promise<Result> {
  if (!(await adminSession())) return NOT_ALLOWED;
  if (typeof userId !== "string" || !userId) return NO_ACCOUNT;
  if (!isGiftMonths(months)) return { ok: false, error: "Choose 1, 3, 6 or 12 months." };
  const text = typeof note === "string" ? note.trim().slice(0, NOTE_MAX) : "";
  const db = getDb();
  const gift = await giveProGift(db, { userId, months, note: text || null });
  if (!gift) return NO_ACCOUNT;
  if (gift.planChanged) {
    await refreshLiveSites(userId);
    trackServerEvent(userId, "plan_changed", { plan: gift.plan, cause: "gift" });
  }
  const until = `Pro until ${longDate.format(gift.proUntil)}`;
  if (!emailConfigured()) {
    return { ok: true, message: `${until}. Email is off, so they weren't told.` };
  }
  try {
    const siteId = await getPrimarySiteId(db, userId);
    await lifecycleGiftGiven(gift, {
      endsOn: gift.proUntil,
      extended: gift.extended,
      editUrl: `${appUrl()}/dashboard${siteId ? `/sites/${siteId}/edit` : ""}`,
    });
  } catch (error) {
    console.error(`Telling Resend about ${userId}'s gift of Pro failed`, error);
    return { ok: true, message: `${until}. The email to them didn't go out.` };
  }
  return { ok: true, message: `${until}. Their email is on its way.` };
}

/** Ends the gift now; the account keeps Pro only if a subscription pays for it. */
export async function endProGiftAction(userId: string): Promise<Result> {
  if (!(await adminSession())) return NOT_ALLOWED;
  if (typeof userId !== "string" || !userId) return NO_ACCOUNT;
  const ended = await endProGift(getDb(), { userId });
  if (!ended) return { ok: false, error: "There's no gift to end." };
  if (ended.planChanged) {
    await refreshLiveSites(userId);
    trackServerEvent(userId, "plan_changed", { plan: ended.plan, cause: "gift_ended" });
  }
  return {
    ok: true,
    message: ended.plan === "pro" ? "Gift ended. Their subscription keeps Pro." : "Gift ended",
  };
}

/**
 * Deletes a draft the admin made for someone else. Their own site (their first) isn't deleted
 * here. The address is freed at once, so the person can take it for their own site.
 */
export async function deleteDraftForSomeoneAction(siteId: string): Promise<Result> {
  const session = await adminSession();
  if (!session) return NOT_ALLOWED;
  const db = getDb();
  const userId = session.user.id;
  const sites = await listOwnedSites(db, userId);
  const index = sites.findIndex((row) => row.id === siteId);
  const gone: Result = { ok: false, error: "This draft was already deleted." };
  if (index === -1) return gone;
  if (index === 0) return { ok: false, error: "Your own site is deleted from Settings." };
  try {
    const deleted = await deleteSite(db, { userId, siteId, holdAddress: false });
    updateTag(siteCacheTag(deleted.subdomain));
    await removeMedia(deleted.mediaIds);
    if (deleted.domain) {
      await releaseFromProvider(deleted.domain);
      forgetDomainRouting();
    }
    return { ok: true, message: "Draft deleted" };
  } catch (error) {
    if (error instanceof SiteNotFoundError) return gone;
    throw error;
  }
}
