import {
  buildStarterContent,
  contrastRatio,
  CURRENT_SCHEMA_VERSION,
  DEFAULT_TEMPLATE_KEY,
  emptyThemeSettings,
  isPublishableColors,
  parseSiteContent,
  randomSubdomain,
  resolveSiteColors,
  subdomainSchema,
  suggestSubdomains,
  templateKeySchema,
  themeSettingsSchema,
  type OnboardingAnswers,
  type SiteContentInput,
  type TemplateKey,
  type ThemeSettingsInput,
} from "@ceomaker/schema";
import { and, asc, count, eq, inArray, ne, sql, type SQL } from "drizzle-orm";
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
import { site, siteVersion } from "../schema";

// Every function that reads or writes a customer's site takes the acting userId and scopes the
// query to it. Authorization lives here, next to the data, not only in route handlers.

export interface PublishedSite {
  siteId: string;
  subdomain: string;
  versionId: string;
  templateKey: string;
  /** Raw stored JSON. Render through the tolerant parsers in @ceomaker/schema, never trust it. */
  theme: unknown;
  content: unknown;
  publishedAt: Date;
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
      theme: siteVersion.theme,
      content: siteVersion.content,
      publishedAt: siteVersion.publishedAt,
    })
    .from(site)
    .leftJoin(
      siteVersion,
      and(eq(siteVersion.id, site.publishedVersionId), eq(siteVersion.siteId, site.id)),
    )
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
      theme: row.theme,
      content: row.content,
      publishedAt: row.publishedAt,
    },
  };
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
  /** Raw stored JSON; parse before use. */
  draft: { templateKey: string; theme: unknown; content: unknown; updatedAt: Date };
  published: {
    id: string;
    templateKey: string;
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
      publishedAt: version.publishedAt ?? new Date(0),
      isCurrent: owned.status === "published" && version.id === owned.publishedVersionId,
    }))
    .reverse();

  return {
    id: owned.id,
    subdomain: owned.subdomain,
    status: owned.status,
    answers: owned.answers ?? null,
    createdAt: owned.createdAt,
    draft: {
      templateKey: draftRow.templateKey,
      theme: draftRow.theme,
      content: draftRow.content,
      updatedAt: draftRow.updatedAt,
    },
    published:
      liveRow?.publishedAt != null
        ? {
            id: liveRow.id,
            templateKey: liveRow.templateKey,
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
  theme: ThemeSettingsInput;
  content: SiteContentInput;
}

function validateDraft(input: DraftInput) {
  const templateKey = templateKeySchema.safeParse(input.templateKey);
  const theme = themeSettingsSchema.safeParse(input.theme);
  const content = parseSiteContent(input.content);
  const issues = [
    ...(templateKey.error?.issues ?? []),
    ...(theme.error?.issues ?? []),
    ...(content.error?.issues ?? []),
  ];
  if (!templateKey.success || !theme.success || !content.success) {
    throw new InvalidSiteDataError(issues);
  }
  return { templateKey: templateKey.data, theme: theme.data, content: content.data };
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
      const [created] = await tx
        .insert(site)
        .values({ userId: input.userId, subdomain: subdomain.data, answers: input.answers })
        .returning({ id: site.id, subdomain: site.subdomain });
      if (!created) throw new Error("Site insert returned no row");

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
 * Creates a user's site from their guided answers, with an honest starter draft and the best
 * free address derived from their name ("amelia", then "amelia-hart", ...).
 */
export async function createSiteFromAnswers(
  db: Database,
  input: { userId: string; answers: OnboardingAnswers; email?: string },
) {
  const draft = {
    templateKey: DEFAULT_TEMPLATE_KEY,
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
      theme: draft.theme,
      content: draft.content,
    });
    const colors = resolveSiteColors(validated.theme, validated.templateKey);
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

/**
 * Puts an earlier version back live and loads it into the draft, so the editor and the live
 * site match again. Unpublished draft edits are replaced; the caller confirms that first.
 */
export async function restoreVersion(
  db: Database,
  input: { userId: string; siteId: string; versionId: string },
) {
  return db.transaction(async (tx) => {
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

    await tx
      .update(siteVersion)
      .set({
        templateKey: templateKeySchema.parse(version.templateKey),
        theme: themeSettingsSchema.safeParse(version.theme).data ?? emptyThemeSettings,
        content: version.content,
        schemaVersion: version.schemaVersion,
        createdBy: input.userId,
      })
      .where(and(eq(siteVersion.siteId, owned.id), eq(siteVersion.kind, "draft")));

    await tx
      .update(site)
      .set({ status: "published", publishedVersionId: version.id })
      .where(eq(site.id, owned.id));

    return { subdomain: owned.subdomain };
  });
}

/** True when the address is valid and no other site holds it. */
export async function isSubdomainAvailable(
  db: Database,
  subdomain: string,
  options: { exceptSiteId?: string } = {},
): Promise<boolean> {
  const parsed = subdomainSchema.safeParse(subdomain);
  if (!parsed.success || parsed.data !== subdomain) return false;
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

      await tx.update(site).set({ subdomain: subdomain.data }).where(eq(site.id, owned.id));
      return { subdomain: subdomain.data };
    });
  } catch (error) {
    if (isUniqueViolation(error, "site_subdomain_unique")) {
      throw new SubdomainTakenError(subdomain.data);
    }
    throw error;
  }
}
