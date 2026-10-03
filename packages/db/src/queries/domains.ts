import {
  DOMAIN_CLAIM_DAYS,
  type DomainDiagnosis,
  type DomainKind,
  type DomainStage,
  planOf,
  type Plan,
} from "@ceomaker/schema";
import { and, asc, eq, inArray, isNull, lt, ne, or } from "drizzle-orm";
import type { Database } from "../client";
import { DomainTakenError, isUniqueViolation, SiteNotFoundError } from "../errors";
import { site, siteDomain, user } from "../schema";

// Custom domains. Owner-facing functions take the acting userId and scope to it; the routing
// and background-check functions are internal and read by domain or by schedule.

const CLAIM_MS = DOMAIN_CLAIM_DAYS * 24 * 60 * 60 * 1000;

export interface SiteDomainRow {
  siteId: string;
  domain: string;
  kind: DomainKind;
  stage: DomainStage;
  aValue: string;
  cnameValue: string;
  diagnosis: DomainDiagnosis | null;
  shareToken: string;
  createdAt: Date;
  checkedAt: Date | null;
  connectedAt: Date | null;
}

const columns = {
  siteId: siteDomain.siteId,
  domain: siteDomain.domain,
  kind: siteDomain.kind,
  stage: siteDomain.stage,
  aValue: siteDomain.aValue,
  cnameValue: siteDomain.cnameValue,
  diagnosis: siteDomain.diagnosis,
  shareToken: siteDomain.shareToken,
  createdAt: siteDomain.createdAt,
  checkedAt: siteDomain.checkedAt,
  connectedAt: siteDomain.connectedAt,
};

/** The domain on a site the user owns, or null. */
export async function getSiteDomain(
  db: Database,
  input: { userId: string; siteId: string },
): Promise<SiteDomainRow | null> {
  const [row] = await db
    .select(columns)
    .from(siteDomain)
    .innerJoin(site, eq(site.id, siteDomain.siteId))
    .where(and(eq(siteDomain.siteId, input.siteId), eq(site.userId, input.userId)))
    .limit(1);
  return row ?? null;
}

/**
 * Reserves a domain for a site the user owns, replacing the site's previous one (the caller
 * removes that from the hosting provider first). A domain another site is connecting stays
 * theirs until their claim expires unconnected after DOMAIN_CLAIM_DAYS.
 */
export async function claimSiteDomain(
  db: Database,
  input: {
    userId: string;
    siteId: string;
    domain: string;
    kind: DomainKind;
    aValue: string;
    cnameValue: string;
    shareToken: string;
    now?: Date;
  },
): Promise<SiteDomainRow> {
  const now = input.now ?? new Date();
  try {
    return await db.transaction(async (tx) => {
      const [owned] = await tx
        .select({ id: site.id })
        .from(site)
        .where(and(eq(site.id, input.siteId), eq(site.userId, input.userId)))
        .for("update")
        .limit(1);
      if (!owned) throw new SiteNotFoundError();
      // Expired claims on this domain by other sites, and this site's previous domain.
      await tx
        .delete(siteDomain)
        .where(
          or(
            eq(siteDomain.siteId, owned.id),
            and(
              eq(siteDomain.domain, input.domain),
              ne(siteDomain.stage, "connected"),
              lt(siteDomain.createdAt, new Date(now.getTime() - CLAIM_MS)),
            ),
          ),
        );
      const [row] = await tx
        .insert(siteDomain)
        .values({
          siteId: owned.id,
          domain: input.domain,
          kind: input.kind,
          aValue: input.aValue,
          cnameValue: input.cnameValue,
          shareToken: input.shareToken,
          createdAt: now,
        })
        .returning(columns);
      return row!;
    });
  } catch (error) {
    if (isUniqueViolation(error, "site_domain_domain_unique")) {
      throw new DomainTakenError(input.domain);
    }
    throw error;
  }
}

/** Removes the domain from a site the user owns. Returns what was removed, or null. */
export async function removeSiteDomain(
  db: Database,
  input: { userId: string; siteId: string },
): Promise<{ domain: string; kind: DomainKind; subdomain: string } | null> {
  const [owned] = await db
    .select({ subdomain: site.subdomain })
    .from(site)
    .where(and(eq(site.id, input.siteId), eq(site.userId, input.userId)))
    .limit(1);
  if (!owned) return null;
  const [removed] = await db
    .delete(siteDomain)
    .where(eq(siteDomain.siteId, input.siteId))
    .returning({ domain: siteDomain.domain, kind: siteDomain.kind });
  return removed ? { ...removed, subdomain: owned.subdomain } : null;
}

/** Records the owner saying they've added the records: from here we check until it works. */
export async function markDomainRecordsAdded(
  db: Database,
  input: { userId: string; siteId: string },
): Promise<boolean> {
  const updated = await db
    .update(siteDomain)
    .set({ stage: "waiting" })
    .where(
      and(
        eq(siteDomain.siteId, input.siteId),
        eq(siteDomain.stage, "records"),
        inArray(
          siteDomain.siteId,
          db.select({ id: site.id }).from(site).where(eq(site.userId, input.userId)),
        ),
      ),
    )
    .returning({ siteId: siteDomain.siteId });
  return updated.length > 0;
}

/** Stores the result of a check. Internal: callers have already scoped the site. */
export async function saveDomainCheck(
  db: Database,
  input: {
    siteId: string;
    domain: string;
    stage: DomainStage;
    diagnosis: DomainDiagnosis;
    now?: Date;
  },
): Promise<SiteDomainRow | null> {
  const now = input.now ?? new Date();
  const [row] = await db
    .update(siteDomain)
    .set({
      stage: input.stage,
      diagnosis: input.diagnosis,
      checkedAt: now,
      ...(input.stage === "connected" ? { connectedAt: now } : {}),
    })
    // The domain must still be the one that was checked (the owner may have changed it).
    .where(and(eq(siteDomain.siteId, input.siteId), eq(siteDomain.domain, input.domain)))
    .returning(columns);
  return row ?? null;
}

export interface DomainToCheck extends SiteDomainRow {
  subdomain: string;
  ownerEmail: string;
  ownerName: string;
}

/** Unconnected domains not checked since `before`, oldest first, for the background check. */
export async function listDomainsToCheck(
  db: Database,
  input: { before: Date; limit: number },
): Promise<DomainToCheck[]> {
  return db
    .select({
      ...columns,
      subdomain: site.subdomain,
      ownerEmail: user.email,
      ownerName: user.name,
    })
    .from(siteDomain)
    .innerJoin(site, eq(site.id, siteDomain.siteId))
    .innerJoin(user, eq(user.id, site.userId))
    .where(
      and(
        ne(siteDomain.stage, "connected"),
        or(isNull(siteDomain.checkedAt), lt(siteDomain.checkedAt, input.before)),
      ),
    )
    .orderBy(asc(siteDomain.checkedAt))
    .limit(input.limit);
}

/** Unconnected claims older than DOMAIN_CLAIM_DAYS, to release. */
export async function listExpiredDomainClaims(
  db: Database,
  now: Date = new Date(),
): Promise<{ siteId: string; domain: string; kind: DomainKind }[]> {
  return db
    .select({ siteId: siteDomain.siteId, domain: siteDomain.domain, kind: siteDomain.kind })
    .from(siteDomain)
    .where(
      and(
        ne(siteDomain.stage, "connected"),
        lt(siteDomain.createdAt, new Date(now.getTime() - CLAIM_MS)),
      ),
    );
}

/** Deletes one expired claim, if it's still unconnected. */
export async function releaseDomainClaim(
  db: Database,
  input: { siteId: string; domain: string },
): Promise<boolean> {
  const deleted = await db
    .delete(siteDomain)
    .where(
      and(
        eq(siteDomain.siteId, input.siteId),
        eq(siteDomain.domain, input.domain),
        ne(siteDomain.stage, "connected"),
      ),
    )
    .returning({ siteId: siteDomain.siteId });
  return deleted.length > 0;
}

/** The public page that lists the records, for someone the owner sent it to. */
export async function getDomainByShareToken(
  db: Database,
  token: string,
): Promise<Pick<
  SiteDomainRow,
  "domain" | "kind" | "aValue" | "cnameValue" | "stage" | "diagnosis"
> | null> {
  const [row] = await db
    .select({
      domain: siteDomain.domain,
      kind: siteDomain.kind,
      aValue: siteDomain.aValue,
      cnameValue: siteDomain.cnameValue,
      stage: siteDomain.stage,
      diagnosis: siteDomain.diagnosis,
    })
    .from(siteDomain)
    .where(eq(siteDomain.shareToken, token))
    .limit(1);
  return row ?? null;
}

/**
 * Routing: which site a request's host belongs to. Matches the domain itself and, for an apex
 * domain, its www host (which forwards to the domain). Every stage routes, so the certificate
 * check can reach the site before it's announced as live.
 */
export async function findSiteByHost(
  db: Database,
  host: string,
): Promise<{
  subdomain: string;
  domain: string;
  stage: DomainStage;
  isWww: boolean;
  ownerPlan: Plan;
} | null> {
  const bare = host.startsWith("www.") ? host.slice(4) : null;
  const rows = await db
    .select({
      subdomain: site.subdomain,
      domain: siteDomain.domain,
      kind: siteDomain.kind,
      stage: siteDomain.stage,
      ownerPlan: user.plan,
    })
    .from(siteDomain)
    .innerJoin(site, eq(site.id, siteDomain.siteId))
    .innerJoin(user, eq(user.id, site.userId))
    .where(bare ? inArray(siteDomain.domain, [host, bare]) : eq(siteDomain.domain, host))
    .limit(2);
  // An exact match beats the www form (a "www.x.com" domain added as a subdomain).
  const row = rows.find((candidate) => candidate.domain === host) ?? rows[0];
  if (!row) return null;
  const isWww = row.domain !== host;
  if (isWww && row.kind !== "apex") return null;
  return {
    subdomain: row.subdomain,
    domain: row.domain,
    stage: row.stage,
    isWww,
    ownerPlan: planOf(row.ownerPlan),
  };
}

/**
 * Routing: the live custom domain of a site, which its own address forwards to. Only while the
 * owner is on Pro; otherwise the site stays on its own address.
 */
export async function findConnectedDomain(db: Database, subdomain: string): Promise<string | null> {
  const [row] = await db
    .select({ domain: siteDomain.domain })
    .from(siteDomain)
    .innerJoin(site, eq(site.id, siteDomain.siteId))
    .innerJoin(user, eq(user.id, site.userId))
    .where(
      and(eq(site.subdomain, subdomain), eq(siteDomain.stage, "connected"), eq(user.plan, "pro")),
    )
    .limit(1);
  return row?.domain ?? null;
}
