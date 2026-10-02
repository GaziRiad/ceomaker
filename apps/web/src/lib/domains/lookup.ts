import "server-only";
import { Resolver } from "node:dns/promises";
import type { HostRecords } from "./dns";

/** Public resolvers, so we see what the internet sees rather than a stale local cache. */
const PUBLIC_DNS = ["1.1.1.1", "8.8.8.8"];

async function quietly<T>(lookup: Promise<T>, fallback: T): Promise<T> {
  try {
    return await lookup;
  } catch {
    // No record (ENODATA/ENOTFOUND) or a timeout: both mean "not there yet".
    return fallback;
  }
}

/** The A, AAAA and CNAME records of each host. */
export async function lookupHosts(hosts: string[]): Promise<Record<string, HostRecords>> {
  const resolver = new Resolver({ timeout: 3000, tries: 2 });
  resolver.setServers(PUBLIC_DNS);
  const entries = await Promise.all(
    hosts.map(async (host): Promise<[string, HostRecords]> => {
      const [a, aaaa, cname] = await Promise.all([
        quietly(resolver.resolve4(host), [] as string[]),
        quietly(resolver.resolve6(host), [] as string[]),
        quietly(resolver.resolveCname(host), [] as string[]),
      ]);
      return [
        host,
        { a, aaaa, cname: cname[0] ? cname[0].toLowerCase().replace(/\.$/, "") : null },
      ];
    }),
  );
  return Object.fromEntries(entries);
}
