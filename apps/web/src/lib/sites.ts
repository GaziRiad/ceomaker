import { getDb, getPublishedSiteBySubdomain } from "@ceomaker/db";
import { cacheLife, cacheTag } from "next/cache";

/** Cache tag for everything rendered from one tenant's published site. */
export function siteCacheTag(subdomain: string) {
  return `site:${subdomain}`;
}

/**
 * Published site lookup for the public renderer. Cached until the site is republished or
 * paused (which call updateTag/revalidateTag with siteCacheTag), so steady-state traffic to a
 * customer's site does not touch the database.
 */
export async function getPublishedSite(subdomain: string) {
  "use cache";
  cacheTag(siteCacheTag(subdomain));
  cacheLife("max");
  return getPublishedSiteBySubdomain(getDb(), subdomain);
}
