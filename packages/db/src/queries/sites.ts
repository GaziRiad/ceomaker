import {
  CURRENT_SCHEMA_VERSION,
  parseSiteContent,
  subdomainSchema,
  templateKeySchema,
  themeSchema,
  type SiteContentInput,
  type TemplateKey,
  type Theme,
} from "@ceomaker/schema";
import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../client";
import {
  InvalidSiteDataError,
  isUniqueViolation,
  SiteNotFoundError,
  SubdomainTakenError,
} from "../errors";
import { site, siteVersion } from "../schema";

// Every function that reads or writes a customer's site takes the acting userId and scopes the
// query to it. Authorization lives here, next to the data, not only in route handlers.

export interface PublishedSite {
  siteId: string;
  subdomain: string;
  versionId: string;
  templateKey: string;
  /** Raw stored JSON. Render through parseSiteContentForRender and themeSchema, never trust it. */
  theme: unknown;
  content: unknown;
  publishedAt: Date;
}

/** Public read for the renderer. Returns null unless the site is live. */
export async function getPublishedSiteBySubdomain(
  db: Database,
  subdomain: string,
): Promise<PublishedSite | null> {
  const [row] = await db
    .select({
      siteId: site.id,
      subdomain: site.subdomain,
      versionId: siteVersion.id,
      templateKey: siteVersion.templateKey,
      theme: siteVersion.theme,
      content: siteVersion.content,
      publishedAt: siteVersion.publishedAt,
    })
    .from(site)
    .innerJoin(
      siteVersion,
      and(eq(siteVersion.id, site.publishedVersionId), eq(siteVersion.siteId, site.id)),
    )
    .where(and(eq(site.subdomain, subdomain), eq(site.status, "published")))
    .limit(1);

  if (!row?.publishedAt) return null;
  return { ...row, publishedAt: row.publishedAt };
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
    .orderBy(desc(site.createdAt));
}

interface DraftInput {
  templateKey: TemplateKey;
  theme: Theme;
  content: SiteContentInput;
}

function validateDraft(input: DraftInput) {
  const templateKey = templateKeySchema.safeParse(input.templateKey);
  const theme = themeSchema.safeParse(input.theme);
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
  input: DraftInput & { userId: string; subdomain: string },
) {
  const subdomain = subdomainSchema.safeParse(input.subdomain);
  if (!subdomain.success) throw new InvalidSiteDataError(subdomain.error.issues);
  const draft = validateDraft(input);

  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(site)
        .values({ userId: input.userId, subdomain: subdomain.data })
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
    .returning({ id: siteVersion.id });
  if (!updated) throw new SiteNotFoundError();
  return updated;
}

/**
 * Snapshots the current draft into a new immutable published version and makes it live.
 * The draft is re-validated so nothing that bypassed the editor can go live.
 * Billing entitlement is checked by the caller before this runs.
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

    return { siteId: owned.id, subdomain: owned.subdomain, versionId: published.id };
  });
}
