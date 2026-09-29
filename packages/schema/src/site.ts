import { z } from "zod";
import { longText, requiredText } from "./primitives";
import { sectionSchema, type Section } from "./sections";

export const CURRENT_SCHEMA_VERSION = 1;

/** Search/social metadata. Part of the versioned content so publishing updates it too. */
export const siteMetaSchema = z.object({
  /** The person's display name: the site's brand in navigation and footer. */
  name: requiredText(60),
  title: requiredText(70),
  description: longText(160).optional(),
});

export type SiteMeta = z.output<typeof siteMetaSchema>;

export const siteContentSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    meta: siteMetaSchema,
    sections: z.array(sectionSchema).min(1).max(30),
  })
  .superRefine((content, ctx) => {
    const seen = new Set<string>();
    content.sections.forEach((section, index) => {
      if (seen.has(section.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate section id "${section.id}"`,
          path: ["sections", index, "id"],
        });
      }
      seen.add(section.id);
    });
  });

export type SiteContent = z.output<typeof siteContentSchema>;
export type SiteContentInput = z.input<typeof siteContentSchema>;

type Upcaster = (content: Record<string, unknown>) => Record<string, unknown>;

/**
 * Migrations from version N to N+1, keyed by N. Published versions are immutable,
 * so old snapshots are upgraded on read instead of rewritten in the database.
 */
const upcasters: Record<number, Upcaster> = {};

export function upcastSiteContent(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  let content = raw as Record<string, unknown>;
  let version = typeof content.schemaVersion === "number" ? content.schemaVersion : 1;
  while (version < CURRENT_SCHEMA_VERSION) {
    const upcast = upcasters[version];
    if (!upcast) throw new Error(`No upcaster from site schema version ${version}`);
    content = upcast(content);
    version += 1;
  }
  return { ...content, schemaVersion: version };
}

/** Strict parse for writes (editor saves, AI output). Any invalid section rejects the whole document. */
export function parseSiteContent(raw: unknown) {
  return siteContentSchema.safeParse(upcastSiteContent(raw));
}

export interface RenderableSiteContent {
  /** Null when the stored metadata is invalid; callers fall back to a neutral title. */
  meta: SiteMeta | null;
  sections: Section[];
  /** Sections that failed validation and were skipped (unknown type, newer schema, corrupt data). */
  droppedSections: number;
}

/**
 * Tolerant parse for rendering published sites. A bad or unknown section is skipped rather than
 * taking the whole site down, so a schema change can never blank a customer's live website.
 */
export function parseSiteContentForRender(raw: unknown): RenderableSiteContent {
  const upcast = upcastSiteContent(raw);
  const document =
    typeof upcast === "object" && upcast !== null ? (upcast as Record<string, unknown>) : {};
  const meta = siteMetaSchema.safeParse(document.meta);
  const rawSections = Array.isArray(document.sections) ? (document.sections as unknown[]) : [];
  const sections: Section[] = [];
  let droppedSections = 0;
  const seen = new Set<string>();
  for (const candidate of rawSections) {
    const result = sectionSchema.safeParse(candidate);
    if (result.success && !seen.has(result.data.id)) {
      seen.add(result.data.id);
      sections.push(result.data);
    } else {
      droppedSections += 1;
    }
  }
  return { meta: meta.success ? meta.data : null, sections, droppedSections };
}
