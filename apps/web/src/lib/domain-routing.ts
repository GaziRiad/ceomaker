import { findConnectedDomain, findSiteByHost, getDb } from "@ceomaker/db";
import type { Plan } from "@ceomaker/schema";

// Lookups the proxy makes for customer domains, cached briefly in memory so steady traffic
// doesn't touch the database. A change reaches every server within CACHE_MS; the server that
// made it forgets at once.

const CACHE_MS = 30_000;
const MAX_ENTRIES = 2000;

interface Entry<T> {
  value: T;
  expires: number;
}

function cache<T>() {
  const entries = new Map<string, Entry<T>>();
  return {
    async get(key: string, load: () => Promise<T>): Promise<T> {
      const now = Date.now();
      const hit = entries.get(key);
      if (hit && hit.expires > now) return hit.value;
      const value = await load();
      if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value!);
      entries.set(key, { value, expires: now + CACHE_MS });
      return value;
    },
    clear() {
      entries.clear();
    },
  };
}

export interface HostSite {
  subdomain: string;
  domain: string;
  /** The www form of an apex domain, which forwards to the domain. */
  isWww: boolean;
  /** Custom domains are a Pro feature: a free owner's domain forwards to the site's own address. */
  ownerPlan: Plan;
}

const hosts = cache<HostSite | null>();
const liveDomains = cache<string | null>();

/** The site a customer domain belongs to, or null. Fails open: a lookup error means "none". */
export async function siteForHost(hostname: string): Promise<HostSite | null> {
  try {
    return await hosts.get(hostname, async () => {
      const found = await findSiteByHost(getDb(), hostname);
      return found
        ? {
            subdomain: found.subdomain,
            domain: found.domain,
            isWww: found.isWww,
            ownerPlan: found.ownerPlan,
          }
        : null;
    });
  } catch (error) {
    console.error("Custom domain lookup failed", error);
    return null;
  }
}

/** The live custom domain a site's own address forwards to, or null. */
export async function liveDomainFor(subdomain: string): Promise<string | null> {
  try {
    return await liveDomains.get(subdomain, () => findConnectedDomain(getDb(), subdomain));
  } catch (error) {
    console.error("Custom domain lookup failed", error);
    return null;
  }
}

/** After a domain is connected or removed: this server stops serving the old answer at once. */
export function forgetDomainRouting() {
  hosts.clear();
  liveDomains.clear();
}
