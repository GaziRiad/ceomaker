import { getDb, getTenantSiteBySubdomain } from "@ceomaker/db";
import { cacheLife, cacheTag } from "next/cache";

/** Cache tag for everything rendered from one tenant's public address. */
export function siteCacheTag(subdomain: string) {
  return `site:${subdomain}`;
}

/**
 * Public lookup for the renderer: the live version, or why there isn't one. Cached until the
 * site is published, restored, renamed or paused (each calls updateTag with siteCacheTag), so
 * steady-state traffic to a customer's site never touches the database.
 */
export async function getTenantSite(subdomain: string) {
  "use cache";
  cacheTag(siteCacheTag(subdomain));
  cacheLife("max");
  return getTenantSiteBySubdomain(getDb(), subdomain);
}
