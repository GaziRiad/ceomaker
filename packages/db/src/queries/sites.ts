import {
  buildStarterContent,
  readStoredAnswers,
  RECOMMENDED_TEMPLATE,
  isPro,
  planOf,
  type Plan,
  contrastRatio,
  CURRENT_SCHEMA_VERSION,
  emptyThemeSettings,
  isPublishableColors,
  isTemplateVersion,
  latestTemplateVersion,
  parseSiteContent,
  randomSubdomain,
  resolveSiteColors,
  subdomainSchema,
  suggestSubdomains,
  templateKeySchema,
  themeSettingsSchema,
  withResolvedColors,
  type DomainKind,
  type OnboardingAnswers,
  type SiteContentInput,
  type TemplateKey,
  type ThemeSettingsInput,
} from "@ceomaker/schema";
import { and, asc, count, eq, gt, inArray, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import type { Database } from "../client";
import {
  AddressLockedError,
  InvalidSiteDataError,
  isUniqueViolation,
  LowContrastError,
  SiteNotFoundError,
  SubdomainTakenError,
  VersionNotFoundError,
} from "../errors";
import {
  ADDRESS_HOLD_DAYS,
  media,
  retiredAddress,
  site,
  siteDomain,
  siteVersion,
  user,
} from "../schema";

// Every function that reads or writes a customer's site takes the acting userId and scopes the
// query to it. Authorization lives here, next to the data, not only in route handlers.

const HOLD_MS = ADDRESS_HOLD_DAYS * 24 * 60 * 60 * 1000;

/** True when a deleted site's address is still reserved for someone other than this user. */
async function isHeldForOthers(
  db: Pick<Database, "select">,
  subdomain: string,
  userId: string | null,
): Promise<boolean> {
  const [held] = await db
    .select({ subdomain: retiredAddress.subdomain })
    .from(retiredAddress)
    .where(
      and(
        eq(retiredAddress.subdomain, subdomain),
        gt(retiredAddress.retiredAt, new Date(Date.now() - HOLD_MS)),
        userId ? or(isNull(retiredAddress.userId), ne(retiredAddress.userId, userId)) : undefined,
      ),
    )
    .limit(1);
  return Boolean(held);
}

export interface PublishedSite {
  siteId: string;
  subdomain: string;
  versionId: string;
  templateKey: string;
  templateVersion: number;
  /** Raw stored JSON. Render through the tolerant parsers in @ceomaker/schema, never trust it. */
  theme: unknown;
  content: unknown;
  publishedAt: Date;
  /**
   * The site's live custom domain, if it has one and its owner is on Pro: its canonical address.
   * A domain whose owner left Pro stays connected but no longer serves the site.
   */
  customDomain: string | null;
  /** The owner's plan: free sites lose the premium template, the form, and get the badge. */
  ownerPlan: Plan;
}

/** What a public address should show: the live version, or why there isn't one. */
export type TenantSite =
  { status: "published"; site: PublishedSite } | { status: "draft" } | { status: "paused" };

/** Public read for the renderer. Null when no site has this address. */
export async function getTenantSiteBySubdomain(
  db: Database,
  subdomain: string,
): Promise<TenantSite | null> {
  const [row] = await db
    .select({
      status: site.status,
      siteId: site.id,
      subdomain: site.subdomain,
      versionId: siteVersion.id,
      templateKey: siteVersion.templateKey,
      templateVersion: siteVersion.templateVersion,
      theme: siteVersion.theme,
      content: siteVersion.content,
      publishedAt: siteVersion.publishedAt,
      customDomain: siteDomain.domain,
      ownerPlan: user.plan,
    })
    .from(site)
    .innerJoin(user, eq(user.id, site.userId))
    .leftJoin(
      siteVersion,
      and(eq(siteVersion.id, site.publishedVersionId), eq(siteVersion.siteId, site.id)),
    )
    .leftJoin(siteDomain, and(eq(siteDomain.siteId, site.id), eq(siteDomain.stage, "connected")))
    .where(eq(site.subdomain, subdomain))
    .limit(1);

  if (!row) return null;
  if (row.status === "draft") return { status: "draft" };
  if (row.status === "paused") return { status: "paused" };
  if (!row.versionId || !row.publishedAt || !row.templateKey) return { status: "draft" };
  return {
    status: "published",
    site: {
      siteId: row.siteId,
      subdomain: row.subdomain,
      versionId: row.versionId,
      templateKey: row.templateKey,
      templateVersion: row.templateVersion ?? 1,
      theme: row.theme,
      content: row.content,
      publishedAt: row.publishedAt,
      customDomain: isPro(planOf(row.ownerPlan)) ? (row.customDomain ?? null) : null,
      ownerPlan: planOf(row.ownerPlan),
    },
  };
}

/** The account's plan. Missing accounts are free. */
export async function getUserPlan(db: Database, userId: string): Promise<Plan> {
  const [row] = await db.select({ plan: user.plan }).from(user).where(eq(user.id, userId)).limit(1);
  return planOf(row?.plan);
}

/** The canvas size the owner last picked in the editor, or null before they pick one. */
export async function getEditorDevice(db: Database, userId: string): Promise<string | null> {
  const [row] = await db
    .select({ device: user.editorDevice })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row?.device ?? null;
}

export async function setEditorDevice(db: Database, userId: string, device: string) {
  await db.update(user).set({ editorDevice: device }).where(eq(user.id, userId));
}

export async function listSitesForUser(db: Database, userId: string) {
  return db
    .select({
      id: site.id,
      subdomain: site.subdomain,
      status: site.status,
      updatedAt: site.updatedAt,
    })
    .from(site)
    .where(eq(site.userId, userId))
    .orderBy(asc(site.createdAt));
}

/** The site the dashboard shows. Users have one site for now; this is their first. */
export async function getPrimarySiteId(db: Database, userId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: site.id })
    .from(site)
    .where(eq(site.userId, userId))
    .orderBy(asc(site.createdAt))
    .limit(1);
  return row?.id ?? null;
}

export interface OwnedSite {
  id: string;
  subdomain: string;
  status: "draft" | "published" | "paused";
  answers: OnboardingAnswers | null;
  createdAt: Date;
  /** Email the owner about new contact form messages. */
  notifyMessages: boolean;
  /** Raw stored JSON; parse before use. */
  draft: {
    templateKey: string;
    templateVersion: number;
    theme: unknown;
    content: unknown;
    updatedAt: Date;
  };
  published: {
    id: string;
    templateKey: string;
    templateVersion: number;
    theme: unknown;
    content: unknown;
    publishedAt: Date;
  } | null;
  /** Every published version, newest first. */
  versions: PublishedVersionSummary[];
  /** Number of published versions ever made. */
  versionCount: number;
}

/**
 * Loads one owned site with all its versions in a single round trip. Only the draft and the live
 * version carry their theme and content; older published versions come back as summaries.
 */
async function loadOwnedSite(db: Database, userId: string, which: SQL): Promise<OwnedSite | null> {
  const carriesContent = sql`(${siteVersion.kind} = 'draft' or ${siteVersion.id} = ${site.publishedVersionId})`;
  const rows = await db
    .select({
      site,
      version: {
        id: siteVersion.id,
        kind: siteVersion.kind,
        templateKey: siteVersion.templateKey,
        templateVersion: siteVersion.templateVersion,
        updatedAt: siteVersion.updatedAt,
        publishedAt: siteVersion.publishedAt,
        theme: sql`case when ${carriesContent} then ${siteVersion.theme} end`.mapWith(
          siteVersion.theme,
        ),
        content: sql`case when ${carriesContent} then ${siteVersion.content} end`.mapWith(
          siteVersion.content,
        ),
      },
    })
    .from(site)
    .innerJoin(siteVersion, eq(siteVersion.siteId, site.id))
    .where(and(eq(site.userId, userId), which))
    .orderBy(asc(siteVersion.createdAt), asc(siteVersion.id));

  const owned = rows[0]?.site;
  const draftRow = rows.find((row) => row.version.kind === "draft")?.version;
  if (!owned || !draftRow) return null;
  const publishedRows = rows
    .map((row) => row.version)
    .filter((version) => version.kind === "published");
  const liveRow = publishedRows.find((version) => version.id === owned.publishedVersionId);
  const versions = publishedRows
    .map((version, index) => ({
      id: version.id,
      number: index + 1,
      templateKey: version.templateKey,
      templateVersion: version.templateVersion,
      publishedAt: version.publishedAt ?? new Date(0),
      isCurrent: owned.status === "published" && version.id === owned.publishedVersionId,
    }))
    .reverse();

  return {
    id: owned.id,
    subdomain: owned.subdomain,
    status: owned.status,
    answers: readStoredAnswers(owned.answers),
    createdAt: owned.createdAt,
    notifyMessages: owned.notifyMessages,
    draft: {
      templateKey: draftRow.templateKey,
      templateVersion: draftRow.templateVersion,
      theme: draftRow.theme,
      content: draftRow.content,
      updatedAt: draftRow.updatedAt,
    },
    published:
      liveRow?.publishedAt != null
        ? {
            id: liveRow.id,
            templateKey: liveRow.templateKey,
            templateVersion: liveRow.templateVersion,
            theme: liveRow.theme,
            content: liveRow.content,
            publishedAt: liveRow.publishedAt,
          }
        : null,
    versions,
    versionCount: versions.length,
  };
}

/** Everything the editor and dashboard need about one site, or null if the user doesn't own it. */
export async function getSiteForOwner(
  db: Database,
  input: { userId: string; siteId: string },
): Promise<OwnedSite | null> {
  return loadOwnedSite(db, input.userId, eq(site.id, input.siteId));
}

/** The user's first site, as getSiteForOwner returns it, or null when they have none yet. */
export async function getPrimarySiteForOwner(
  db: Database,
  userId: string,
): Promise<OwnedSite | null> {
  const first = db
    .select({ id: site.id })
    .from(site)
    .where(eq(site.userId, userId))
    .orderBy(asc(site.createdAt))
    .limit(1);
  return loadOwnedSite(db, userId, inArray(site.id, first));
}

interface DraftInput {
  templateKey: TemplateKey | string;
  /** Which design of the template (TEMPLATE_VERSIONS). Always explicit, never assumed. */
  templateVersion: number;
  theme: ThemeSettingsInput;
  content: SiteContentInput;
}

function validateDraft(input: DraftInput) {
  const templateKey = templateKeySchema.safeParse(input.templateKey);
  const theme = themeSettingsSchema.safeParse(input.theme);
  const content = parseSiteContent(input.content);
  const versionOk =
    templateKey.success && isTemplateVersion(templateKey.data, input.templateVersion);
  const issues = [
    ...(templateKey.error?.issues ?? []),
    ...(templateKey.success && !versionOk
      ? [
          {
            code: "custom" as const,
            message: `Unknown design ${String(input.templateVersion)} of ${templateKey.data}`,
            path: ["templateVersion"],
            input: input.templateVersion,
          },
        ]
      : []),
    ...(theme.error?.issues ?? []),
    ...(content.error?.issues ?? []),
  ];
  if (!templateKey.success || !versionOk || !theme.success || !content.success) {
    throw new InvalidSiteDataError(issues);
  }
  return {
    templateKey: templateKey.data,
    templateVersion: input.templateVersion,
    theme: theme.data,
    content: content.data,
  };
}

/** Creates a site with its initial draft. The subdomain is validated and claimed atomically. */
export async function createSite(
  db: Database,
  input: DraftInput & { userId: string; subdomain: string; answers?: OnboardingAnswers },
) {
  const subdomain = subdomainSchema.safeParse(input.subdomain);
  if (!subdomain.success) throw new InvalidSiteDataError(subdomain.error.issues);
  const draft = validateDraft(input);

  try {
    return await db.transaction(async (tx) => {
      if (await isHeldForOthers(tx, subdomain.data, input.userId)) {
        throw new SubdomainTakenError(subdomain.data);
      }
      const [created] = await tx
        .insert(site)
        .values({ userId: input.userId, subdomain: subdomain.data, answers: input.answers })
        .returning({ id: site.id, subdomain: site.subdomain });
      if (!created) throw new Error("Site insert returned no row");
      // The owner took their old address back, or an expired hold is no longer needed.
      await tx.delete(retiredAddress).where(eq(retiredAddress.subdomain, subdomain.data));

      await tx.insert(siteVersion).values({
        siteId: created.id,
        kind: "draft",
        schemaVersion: CURRENT_SCHEMA_VERSION,
        createdBy: input.userId,
        ...draft,
      });
      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error, "site_subdomain_unique")) {
      throw new SubdomainTakenError(subdomain.data);
    }
    throw error;
  }
}

/**
 * Creates a user's site from their guided answers, with an honest starter draft on the design
 * recommended for their goal, and the best
 * free address derived from their name ("amelia", then "amelia-hart", ...).
 */
export async function createSiteFromAnswers(
  db: Database,
  input: { userId: string; answers: OnboardingAnswers; email?: string },
) {
  // The site starts on the design recommended for its goal; the picker offers all of them.
  const templateKey = RECOMMENDED_TEMPLATE[input.answers.goal];
  const draft = {
    templateKey,
    templateVersion: latestTemplateVersion(templateKey),
    theme: emptyThemeSettings,
    content: buildStarterContent(input.answers, { email: input.email }),
  };
  const suggestions = suggestSubdomains(input.answers.name);
  const taken = suggestions.length
    ? new Set(
        (
          await db
            .select({ subdomain: site.subdomain })
            .from(site)
            .where(inArray(site.subdomain, suggestions))
        ).map((row) => row.subdomain),
      )
    : new Set<string>();
  const candidates = [
    ...suggestions.filter((candidate) => !taken.has(candidate)),
    randomSubdomain(input.answers.name),
    randomSubdomain(input.answers.name),
  ];

  // Another sign-up can claim a free name between the check and the insert; move on if so.
  for (const subdomain of candidates) {
    try {
      return await createSite(db, { ...draft, ...input, subdomain });
    } catch (error) {
      if (!(error instanceof SubdomainTakenError)) throw error;
    }
  }
  throw new SubdomainTakenError(candidates.at(-1) ?? "");
}

/** Records new guided answers on a site the user owns. The draft is left as it is. */
export async function saveSiteAnswers(
  db: Database,
  input: { userId: string; siteId: string; answers: OnboardingAnswers },
) {
  const [updated] = await db
    .update(site)
    .set({ answers: input.answers })
    .where(and(eq(site.id, input.siteId), eq(site.userId, input.userId)))
    .returning({ id: site.id });
  if (!updated) throw new SiteNotFoundError();
}

/** Replaces the draft of a site the user owns. Published versions are untouched. */
export async function saveDraft(
  db: Database,
  input: DraftInput & { userId: string; siteId: string },
) {
  const draft = validateDraft(input);
  const owned = await db
    .select({ id: site.id })
    .from(site)
    .where(and(eq(site.id, input.siteId), eq(site.userId, input.userId)))
    .limit(1);
  if (owned.length === 0) throw new SiteNotFoundError();

  const [updated] = await db
    .update(siteVersion)
    .set({ ...draft, schemaVersion: CURRENT_SCHEMA_VERSION, createdBy: input.userId })
    .where(and(eq(siteVersion.siteId, input.siteId), eq(siteVersion.kind, "draft")))
    .returning({ id: siteVersion.id, updatedAt: siteVersion.updatedAt });
  if (!updated) throw new SiteNotFoundError();
  return updated;
}

/**
 * Snapshots the current draft into a new immutable published version and makes it live.
 * The draft is re-validated so nothing that bypassed the editor can go live, and its colours
 * must give readable text. Billing entitlement is checked by the caller before this runs.
 */
export async function publishSite(db: Database, input: { userId: string; siteId: string }) {
  return db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: site.id, subdomain: site.subdomain })
      .from(site)
      .where(and(eq(site.id, input.siteId), eq(site.userId, input.userId)))
      .for("update")
      .limit(1);
    if (!owned) throw new SiteNotFoundError();

    const [draft] = await tx
      .select()
      .from(siteVersion)
      .where(and(eq(siteVersion.siteId, owned.id), eq(siteVersion.kind, "draft")))
      .limit(1);
    if (!draft) throw new SiteNotFoundError();

    const validated = validateDraft({
      templateKey: draft.templateKey,
      templateVersion: draft.templateVersion,
      theme: draft.theme,
      content: draft.content,
    });
    const colors = resolveSiteColors(
      validated.theme,
      validated.templateKey,
      validated.templateVersion,
    );
    if (!isPublishableColors(colors)) {
      throw new LowContrastError(contrastRatio(colors.ink, colors.bg));
    }

    const [published] = await tx
      .insert(siteVersion)
      .values({
        siteId: owned.id,
        kind: "published",
        schemaVersion: CURRENT_SCHEMA_VERSION,
        createdBy: input.userId,
        publishedAt: new Date(),
        ...validated,
        // Colours are written out, so a later change to a template's default can't recolour
        // a published site.
        theme: withResolvedColors(
          validated.theme,
          validated.templateKey,
          validated.templateVersion,
        ),
      })
      .returning({ id: siteVersion.id });
    if (!published) throw new Error("Published version insert returned no row");

    await tx
      .update(site)
      .set({ status: "published", publishedVersionId: published.id })
      .where(eq(site.id, owned.id));

    const [{ value: versionNumber } = { value: 1 }] = await tx
      .select({ value: count() })
      .from(siteVersion)
      .where(and(eq(siteVersion.siteId, owned.id), eq(siteVersion.kind, "published")));

    return {
      siteId: owned.id,
      subdomain: owned.subdomain,
      versionId: published.id,
      versionNumber,
    };
  });
}

export interface PublishedVersionSummary {
  id: string;
  /** 1 for the first publish, counting up. */
  number: number;
  templateKey: string;
  templateVersion: number;
  publishedAt: Date;
  isCurrent: boolean;
}

/** Newest first. */
export async function listPublishedVersions(
  db: Database,
  input: { userId: string; siteId: string },
): Promise<PublishedVersionSummary[]> {
  const owned = await getSiteForOwner(db, input);
  if (!owned) throw new SiteNotFoundError();
  return owned.versions;
}

/** One published version of a site the user owns, as stored, or null. */
export async function getPublishedVersion(
  db: Database,
  input: { userId: string; siteId: string; versionId: string },
): Promise<{
  id: string;
  templateKey: string;
  templateVersion: number;
  theme: unknown;
  content: unknown;
  publishedAt: Date;
} | null> {
  const [row] = await db
    .select({
      id: siteVersion.id,
      templateKey: siteVersion.templateKey,
      templateVersion: siteVersion.templateVersion,
      theme: siteVersion.theme,
      content: siteVersion.content,
      publishedAt: siteVersion.publishedAt,
    })
    .from(siteVersion)
    .innerJoin(site, eq(site.id, siteVersion.siteId))
    .where(
      and(
        eq(siteVersion.id, input.versionId),
        eq(siteVersion.siteId, input.siteId),
        eq(siteVersion.kind, "published"),
        eq(site.userId, input.userId),
      ),
    )
    .limit(1);
  return row ? { ...row, publishedAt: row.publishedAt ?? new Date(0) } : null;
}

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Locks the user's site and finds one of its published versions, or throws. */
async function lockOwnedVersion(
  tx: Transaction,
  input: { userId: string; siteId: string; versionId: string },
) {
  const [owned] = await tx
    .select({ id: site.id, subdomain: site.subdomain })
    .from(site)
    .where(and(eq(site.id, input.siteId), eq(site.userId, input.userId)))
    .for("update")
    .limit(1);
  if (!owned) throw new SiteNotFoundError();

  const [version] = await tx
    .select()
    .from(siteVersion)
    .where(
      and(
        eq(siteVersion.id, input.versionId),
        eq(siteVersion.siteId, owned.id),
        eq(siteVersion.kind, "published"),
      ),
    )
    .limit(1);
  if (!version) throw new VersionNotFoundError();
  return { owned, version };
}

/**
 * Puts an earlier published version live again, at once. The draft keeps the user's latest
 * edits, so the editor then shows them as unpublished changes.
 */
export async function makeVersionLive(
  db: Database,
  input: { userId: string; siteId: string; versionId: string },
) {
  return db.transaction(async (tx) => {
    const { owned, version } = await lockOwnedVersion(tx, input);
    await tx
      .update(site)
      .set({ status: "published", publishedVersionId: version.id })
      .where(eq(site.id, owned.id));
    return { subdomain: owned.subdomain };
  });
}

/** Loads a published version into the draft to keep working from it. The live site is untouched. */
export async function copyVersionToDraft(
  db: Database,
  input: { userId: string; siteId: string; versionId: string },
) {
  return db.transaction(async (tx) => {
    const { owned, version } = await lockOwnedVersion(tx, input);
    await tx
      .update(siteVersion)
      .set({
        templateKey: templateKeySchema.parse(version.templateKey),
        templateVersion: version.templateVersion,
        theme: themeSettingsSchema.safeParse(version.theme).data ?? emptyThemeSettings,
        content: version.content,
        schemaVersion: version.schemaVersion,
        createdBy: input.userId,
      })
      .where(and(eq(siteVersion.siteId, owned.id), eq(siteVersion.kind, "draft")));
  });
}

/**
 * True when the address is valid, no other site holds it, and it isn't reserved for someone
 * else after a deletion. Pass the asking user, so their own reserved address counts as free.
 */
export async function isSubdomainAvailable(
  db: Database,
  subdomain: string,
  options: { exceptSiteId?: string; userId?: string } = {},
): Promise<boolean> {
  const parsed = subdomainSchema.safeParse(subdomain);
  if (!parsed.success || parsed.data !== subdomain) return false;
  if (await isHeldForOthers(db, subdomain, options.userId ?? null)) return false;
  const [row] = await db
    .select({ id: site.id })
    .from(site)
    .where(
      options.exceptSiteId
        ? and(eq(site.subdomain, subdomain), ne(site.id, options.exceptSiteId))
        : eq(site.subdomain, subdomain),
    )
    .limit(1);
  return !row;
}

/** Renames a site's address. Only allowed before its first publish. */
export async function changeSubdomain(
  db: Database,
  input: { userId: string; siteId: string; subdomain: string },
) {
  const subdomain = subdomainSchema.safeParse(input.subdomain);
  if (!subdomain.success) throw new InvalidSiteDataError(subdomain.error.issues);

  try {
    return await db.transaction(async (tx) => {
      const [owned] = await tx
        .select({ id: site.id, subdomain: site.subdomain, status: site.status })
        .from(site)
        .where(and(eq(site.id, input.siteId), eq(site.userId, input.userId)))
        .for("update")
        .limit(1);
      if (!owned) throw new SiteNotFoundError();
      if (owned.subdomain === subdomain.data) return { subdomain: owned.subdomain };

      const [published] = await tx
        .select({ id: siteVersion.id })
        .from(siteVersion)
        .where(and(eq(siteVersion.siteId, owned.id), eq(siteVersion.kind, "published")))
        .limit(1);
      if (owned.status !== "draft" || published) throw new AddressLockedError();
      if (await isHeldForOthers(tx, subdomain.data, input.userId)) {
        throw new SubdomainTakenError(subdomain.data);
      }

      await tx.update(site).set({ subdomain: subdomain.data }).where(eq(site.id, owned.id));
      await tx.delete(retiredAddress).where(eq(retiredAddress.subdomain, subdomain.data));
      return { subdomain: subdomain.data };
    });
  } catch (error) {
    if (isUniqueViolation(error, "site_subdomain_unique")) {
      throw new SubdomainTakenError(subdomain.data);
    }
    throw error;
  }
}

/**
 * Deletes a site the user owns, with its draft, every published version and the user's uploaded
 * images (one site per account). The live page stops at once; callers invalidate its cache.
 * If the site was ever published, its address is reserved for the owner for ADDRESS_HOLD_DAYS.
 * AI usage rows stay, so deleting and starting again doesn't reset drafting limits.
 */
export async function deleteSite(
  db: Database,
  input: { userId: string; siteId: string },
): Promise<{
  subdomain: string;
  addressHeld: boolean;
  /** Its custom domain, for the caller to remove from the hosting provider. */
  domain: { domain: string; kind: DomainKind } | null;
  /** The account's images, for the caller to remove from storage. */
  mediaIds: string[];
}> {
  return db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: site.id, subdomain: site.subdomain })
      .from(site)
      .where(and(eq(site.id, input.siteId), eq(site.userId, input.userId)))
      .for("update")
      .limit(1);
    if (!owned) throw new SiteNotFoundError();

    const [published] = await tx
      .select({ id: siteVersion.id })
      .from(siteVersion)
      .where(and(eq(siteVersion.siteId, owned.id), eq(siteVersion.kind, "published")))
      .limit(1);
    if (published) {
      const retiredAt = new Date();
      await tx
        .insert(retiredAddress)
        .values({ subdomain: owned.subdomain, userId: input.userId, retiredAt })
        .onConflictDoUpdate({
          target: retiredAddress.subdomain,
          set: { userId: input.userId, retiredAt },
        });
    }
    const [domain] = await tx
      .select({ domain: siteDomain.domain, kind: siteDomain.kind })
      .from(siteDomain)
      .where(eq(siteDomain.siteId, owned.id))
      .limit(1);
    // Versions, messages, analytics and the domain go with the site (foreign key cascade).
    await tx.delete(site).where(eq(site.id, owned.id));
    // The account's images go too; the caller removes their files from storage.
    const removed = await tx
      .delete(media)
      .where(eq(media.userId, input.userId))
      .returning({ id: media.id });
    return {
      subdomain: owned.subdomain,
      addressHeld: Boolean(published),
      domain: domain ?? null,
      mediaIds: removed.map((row) => row.id),
    };
  });
}

/** Turns message emails on or off for a site the user owns. */
export async function setSiteNotifications(
  db: Database,
  input: { userId: string; siteId: string; notify: boolean },
) {
  const [updated] = await db
    .update(site)
    .set({ notifyMessages: input.notify })
    .where(and(eq(site.id, input.siteId), eq(site.userId, input.userId)))
    .returning({ id: site.id });
  if (!updated) throw new SiteNotFoundError();
}

/**
 * Deletes a user and everything they own: sites, versions, messages, images, sessions. Addresses
 * of sites that were ever published stay held for ADDRESS_HOLD_DAYS (for nobody, since the
 * account is gone), so no one else can show a page at links that may still be out there.
 */
export async function deleteAccount(db: Database, input: { userId: string }) {
  return db.transaction(async (tx) => {
    const published = await tx
      .selectDistinct({ subdomain: site.subdomain })
      .from(site)
      .innerJoin(
        siteVersion,
        and(eq(siteVersion.siteId, site.id), eq(siteVersion.kind, "published")),
      )
      .where(eq(site.userId, input.userId));
    const retiredAt = new Date();
    for (const { subdomain } of published) {
      await tx
        .insert(retiredAddress)
        .values({ subdomain, userId: input.userId, retiredAt })
        .onConflictDoUpdate({
          target: retiredAddress.subdomain,
          set: { userId: input.userId, retiredAt },
        });
    }
    const domains = await tx
      .select({ domain: siteDomain.domain, kind: siteDomain.kind })
      .from(siteDomain)
      .innerJoin(site, eq(site.id, siteDomain.siteId))
      .where(eq(site.userId, input.userId));
    // The caller removes the images' files from storage.
    const images = await tx
      .select({ id: media.id })
      .from(media)
      .where(eq(media.userId, input.userId));
    // Sites, versions, messages, domains, media, sessions and AI usage go with the user
    // (cascades); the address holds stay and lose their owner.
    const deleted = await tx
      .delete(user)
      .where(eq(user.id, input.userId))
      .returning({ id: user.id });
    if (!deleted.length) throw new SiteNotFoundError();
    return {
      heldAddresses: published.map((row) => row.subdomain),
      domains,
      mediaIds: images.map((row) => row.id),
    };
  });
}
