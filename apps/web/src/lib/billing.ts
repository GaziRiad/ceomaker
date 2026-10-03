import "server-only";
import {
  applySubscriptionEvent,
  getDb,
  listSitesForUser,
  type SubscriptionEvent,
  type SubscriptionSync,
} from "@ceomaker/db";
import { revalidateTag } from "next/cache";
import { forgetDomainRouting } from "./domain-routing";
import { siteCacheTag } from "./sites";

// What every billing provider's webhook does once it has checked the signature and read the
// event: record it, and when the plan changes, make the owner's live site show it.

export async function syncSubscription(event: SubscriptionEvent): Promise<SubscriptionSync> {
  const result = await applySubscriptionEvent(getDb(), event);
  if (result.outcome === "applied" && result.planChanged) await refreshLiveSites(result.userId);
  return result;
}

/**
 * After a plan change: the owner's live pages are rebuilt on their next visit (badge, template,
 * form) and their custom domain is routed by the new plan. Nothing is served stale, so an owner
 * who has just paid sees Pro at once. Other servers drop their domain routing within 30 seconds.
 */
export async function refreshLiveSites(userId: string): Promise<void> {
  for (const { subdomain } of await listSitesForUser(getDb(), userId)) {
    revalidateTag(siteCacheTag(subdomain), { expire: 0 });
  }
  forgetDomainRouting();
}
