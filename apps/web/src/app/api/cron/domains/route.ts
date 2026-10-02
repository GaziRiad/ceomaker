import {
  getDb,
  listDomainsToCheck,
  listExpiredDomainClaims,
  releaseDomainClaim,
} from "@ceomaker/db";
import { revalidateTag } from "next/cache";
import { forgetDomainRouting } from "@/lib/domain-routing";
import { domainProvider } from "@/lib/domains/provider";
import { checkSiteDomain, releaseFromProvider } from "@/lib/domains/service";
import { serverEnv } from "@/lib/env";
import { siteCacheTag } from "@/lib/sites";

// The background domain check. Vercel calls it on the schedule in vercel.json with the
// CRON_SECRET as a bearer token; any scheduler can (see README). Owners with Settings open
// are also checked from the page, so this only has to catch the rest.

export const maxDuration = 60;

/** Domains not checked for this long are due. */
const DUE_AFTER_MS = 5 * 60 * 1000;
const BATCH = 25;

export async function GET(request: Request) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const provider = domainProvider();
  if (!provider) return Response.json({ checked: 0, live: 0, released: 0 });

  const db = getDb();
  let released = 0;
  for (const claim of await listExpiredDomainClaims(db)) {
    if (await releaseDomainClaim(db, claim)) {
      await releaseFromProvider(claim, provider);
      released += 1;
    }
  }
  if (released) forgetDomainRouting();

  const due = await listDomainsToCheck(db, {
    before: new Date(Date.now() - DUE_AFTER_MS),
    limit: BATCH,
  });
  let live = 0;
  for (const row of due) {
    try {
      const view = await checkSiteDomain({
        row,
        subdomain: row.subdomain,
        owner: { email: row.ownerEmail },
        invalidate: (subdomain) => revalidateTag(siteCacheTag(subdomain), "max"),
      });
      if (view.stage === "connected") live += 1;
    } catch (error) {
      console.error(`Checking ${row.domain} failed`, error);
    }
  }
  return Response.json({ checked: due.length, live, released });
}
