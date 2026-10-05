import { planOf, type Plan } from "@ceomaker/schema";
import { and, asc, count, desc, eq, gt, gte, ilike, inArray, max, not, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Database } from "../client";
import {
  analyticsEvent,
  session,
  site,
  siteDomain,
  siteVersion,
  subscription,
  user,
} from "../schema";
import { PAYING_STATUSES, paysForPro } from "./plan-state";

// What the admin page shows: every account, its plan and gift, and its site. Read-only, across
// all accounts, so only the admin page may call these (it checks ADMIN_EMAILS first).

const DAY_MS = 24 * 60 * 60 * 1000;

/** The draft row, next to the live version's row in the same query. */
const draftVersion = alias(siteVersion, "draft_version");

export interface AdminOverview {
  accounts: number;
  /** Signed up in the last 7 days. */
  newAccounts: number;
  published: number;
  /** Accounts with a subscription paying for Pro. */
  paying: number;
  /** Accounts on a gift that hasn't ended and that don't also pay. */
  gifted: number;
}

export async function getAdminOverview(
  db: Database,
  now: Date = new Date(),
): Promise<AdminOverview> {
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const paying = paysForPro(db);
  const [[accounts], [sites]] = await Promise.all([
    db
      .select({
        accounts: count(),
        newAccounts: count(sql`case when ${gt(user.createdAt, weekAgo)} then 1 end`),
        paying: count(sql`case when ${paying} then 1 end`),
        gifted: count(sql`case when ${and(gt(user.proUntil, now), not(paying))} then 1 end`),
      })
      .from(user),
    db.select({ published: count() }).from(site).where(eq(site.status, "published")),
  ]);
  return {
    accounts: accounts?.accounts ?? 0,
    newAccounts: accounts?.newAccounts ?? 0,
    published: sites?.published ?? 0,
    paying: accounts?.paying ?? 0,
    gifted: accounts?.gifted ?? 0,
  };
}

export interface AdminSite {
  id: string;
  subdomain: string;
  status: "draft" | "published" | "paused";
  /** The live version's template, or the draft's before the first publish. */
  templateKey: string;
  /** When the live version was published. */
  publishedAt: Date | null;
  /** The owner's own domain, once connected. */
  domain: string | null;
  /** Page views in the last 30 days. */
  views: number;
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  /** Latest activity of a session still on record (signing out removes it). */
  lastSeenAt: Date | null;
  plan: Plan;
  /** The paying subscription's state, if one pays for Pro. */
  paid: "active" | "past_due" | null;
  proUntil: Date | null;
  proNote: string | null;
  /** The account's first site (accounts have one for now), and how many more it has. */
  site: AdminSite | null;
  otherSites: number;
}

/** `%term%` for ILIKE, with the user's own % and _ matched literally. */
function containing(term: string): string {
  return `%${term.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

/**
 * Accounts newest first, optionally only those whose name, email or site address contains the
 * search. `more` says there were more than `limit`.
 */
export async function listAccountsForAdmin(
  db: Database,
  options: { search?: string; limit?: number; now?: Date } = {},
): Promise<{ accounts: AdminAccount[]; more: boolean }> {
  const limit = options.limit ?? 100;
  const now = options.now ?? new Date();
  const term = options.search?.trim();
  const pattern = term ? containing(term) : null;

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      plan: user.plan,
      proUntil: user.proUntil,
      proNote: user.proNote,
      lastSeenAt: sql`(${db
        .select({ at: max(session.updatedAt) })
        .from(session)
        .where(eq(session.userId, user.id))})`.mapWith(session.updatedAt),
      paid: sql<string | null>`(${db
        .select({ status: subscription.status })
        .from(subscription)
        .where(and(eq(subscription.userId, user.id), inArray(subscription.status, PAYING_STATUSES)))
        .orderBy(sql`${subscription.status} = 'past_due' desc`)
        .limit(1)})`,
    })
    .from(user)
    .where(
      pattern
        ? or(
            ilike(user.name, pattern),
            ilike(user.email, pattern),
            sql`exists (select 1 from ${site} where ${site.userId} = ${user.id} and ${ilike(site.subdomain, pattern)})`,
          )
        : undefined,
    )
    .orderBy(desc(user.createdAt), asc(user.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const ids = page.map((row) => row.id);

  const sites = ids.length
    ? await db
        .select({
          userId: site.userId,
          id: site.id,
          subdomain: site.subdomain,
          status: site.status,
          liveTemplate: siteVersion.templateKey,
          publishedAt: siteVersion.publishedAt,
          draftTemplate: sql<string | null>`(${db
            .select({ key: draftVersion.templateKey })
            .from(draftVersion)
            .where(and(eq(draftVersion.siteId, site.id), eq(draftVersion.kind, "draft")))})`,
          domain: siteDomain.domain,
        })
        .from(site)
        .leftJoin(siteVersion, eq(siteVersion.id, site.publishedVersionId))
        .leftJoin(
          siteDomain,
          and(eq(siteDomain.siteId, site.id), eq(siteDomain.stage, "connected")),
        )
        .where(inArray(site.userId, ids))
        .orderBy(asc(site.createdAt), asc(site.id))
    : [];
  const firstSites = new Map<string, (typeof sites)[number]>();
  const siteCounts = new Map<string, number>();
  for (const row of sites) {
    if (!firstSites.has(row.userId)) firstSites.set(row.userId, row);
    siteCounts.set(row.userId, (siteCounts.get(row.userId) ?? 0) + 1);
  }

  const siteIds = [...firstSites.values()].map((row) => row.id);
  const views = siteIds.length
    ? await db
        .select({ siteId: analyticsEvent.siteId, views: count() })
        .from(analyticsEvent)
        .where(
          and(
            inArray(analyticsEvent.siteId, siteIds),
            eq(analyticsEvent.kind, "pageview"),
            gte(analyticsEvent.createdAt, new Date(now.getTime() - 30 * DAY_MS)),
          ),
        )
        .groupBy(analyticsEvent.siteId)
    : [];
  const viewsBySite = new Map(views.map((row) => [row.siteId, row.views]));

  return {
    more: rows.length > limit,
    accounts: page.map((row) => {
      const first = firstSites.get(row.id);
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        createdAt: row.createdAt,
        lastSeenAt: row.lastSeenAt ?? null,
        plan: planOf(row.plan),
        paid: row.paid === "active" || row.paid === "past_due" ? row.paid : null,
        proUntil: row.proUntil,
        proNote: row.proNote,
        site: first
          ? {
              id: first.id,
              subdomain: first.subdomain,
              status: first.status,
              templateKey:
                (first.status === "draft" ? first.draftTemplate : first.liveTemplate) ??
                first.draftTemplate ??
                "meridian",
              publishedAt: first.status !== "draft" ? first.publishedAt : null,
              domain: first.domain,
              views: viewsBySite.get(first.id) ?? 0,
            }
          : null,
        otherSites: Math.max(0, (siteCounts.get(row.id) ?? 0) - 1),
      };
    }),
  };
}
