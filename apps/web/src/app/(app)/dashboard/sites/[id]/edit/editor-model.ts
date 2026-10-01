import {
  EDITABLE_SECTION_TYPES,
  FIXED_SECTION_TYPES,
  normalizeTemplateKey,
  parseSiteContent,
  sectionSchema,
  siteMetaSchema,
  themeSettingsSchema,
  type EditableSectionType,
  type RenderableSiteContent,
  type Section,
  type SectionOf,
  type SiteContent,
  type SiteMeta,
  type TemplateKey,
  type ThemeSettings,
} from "@ceomaker/schema";

export const SECTION_LABELS: Record<EditableSectionType, string> = {
  hero: "Hero",
  achievements: "Impact",
  about: "About",
  experience: "Experience",
  portfolio: "Selected work",
  testimonials: "What colleagues say",
  contact: "Let's talk",
};

const DEFAULT_IDS: Record<EditableSectionType, string> = {
  hero: "hero",
  achievements: "impact",
  about: "about",
  experience: "experience",
  portfolio: "work",
  testimonials: "testimonials",
  contact: "contact",
};

export interface Draft {
  templateKey: TemplateKey;
  theme: ThemeSettings;
  content: SiteContent;
}

function emptySection(type: EditableSectionType, meta: SiteMeta): Section {
  const id = DEFAULT_IDS[type];
  switch (type) {
    case "hero":
      return { id, type, visible: true, headline: meta.name || "Your headline" };
    case "about":
      return { id, type, visible: false, body: [] };
    case "contact":
      return { id, type, visible: true, links: [] };
    case "achievements":
    case "experience":
    case "portfolio":
    case "testimonials":
      return { id, type, visible: false, items: [] };
  }
}

function isEditable(section: Section): section is Extract<Section, { type: EditableSectionType }> {
  return (EDITABLE_SECTION_TYPES as readonly string[]).includes(section.type);
}

/**
 * The editor works on one section of each kind, hero first and contact last, with every kind
 * present (missing ones are added hidden and empty). Retired section types are dropped.
 */
export function normalizeForEditing(content: SiteContent): SiteContent {
  const seen = new Set<string>();
  const middle: Section[] = [];
  let hero: Section | undefined;
  let contact: Section | undefined;
  const usedIds = new Set<string>();
  for (const section of content.sections) {
    if (!isEditable(section) || seen.has(section.type)) continue;
    seen.add(section.type);
    usedIds.add(section.id);
    if (section.type === "hero") hero = section;
    else if (section.type === "contact") contact = section;
    else middle.push(section);
  }
  for (const type of EDITABLE_SECTION_TYPES) {
    if (seen.has(type) || FIXED_SECTION_TYPES.has(type)) continue;
    let section = emptySection(type, content.meta);
    if (usedIds.has(section.id)) section = { ...section, id: `${section.id}-${type}` };
    middle.push(section);
  }
  return {
    ...content,
    sections: [
      hero ?? emptySection("hero", content.meta),
      ...middle,
      contact ?? emptySection("contact", content.meta),
    ],
  };
}

const blank = (value: string | undefined) => !value || !value.trim();
const optional = (value: string | undefined) => (blank(value) ? undefined : value);

function cleanSection(section: Section): Section {
  switch (section.type) {
    case "hero": {
      const cta = section.primaryCta;
      return {
        ...section,
        eyebrow: optional(section.eyebrow),
        subheadline: optional(section.subheadline),
        primaryCta: cta && (!blank(cta.label) || !blank(cta.href)) ? cta : undefined,
      };
    }
    case "achievements":
      return {
        ...section,
        items: section.items.filter((item) => !blank(item.value) || !blank(item.label)),
      };
    case "experience":
      return {
        ...section,
        items: section.items
          .filter((item) =>
            [item.role, item.organization, item.start, item.end, item.summary].some(
              (value) => !blank(value),
            ),
          )
          .map((item) => ({
            ...item,
            location: optional(item.location),
            start: optional(item.start),
            end: optional(item.end),
            summary: optional(item.summary),
          })),
      };
    case "portfolio":
      return {
        ...section,
        items: section.items
          .filter((item) =>
            [item.title, item.kind, item.meta, item.year, item.href].some((value) => !blank(value)),
          )
          .map((item) => ({
            ...item,
            kind: optional(item.kind),
            meta: optional(item.meta),
            year: optional(item.year),
            description: optional(item.description),
            href: optional(item.href),
          })),
      };
    case "testimonials":
      return {
        ...section,
        items: section.items
          .filter((item) => !blank(item.quote) || !blank(item.author))
          .map((item) => ({ ...item, role: optional(item.role) })),
      };
    case "contact":
      return {
        ...section,
        blurb: optional(section.blurb),
        email: optional(section.email),
        links: section.links
          .filter((link) => !blank(link.label) || !blank(link.href))
          .map((link) => ({ ...link, label: optional(link.label) })),
      };
    default:
      return section;
  }
}

function cleanMeta(meta: SiteMeta): SiteMeta {
  return {
    ...meta,
    title: optional(meta.title),
    description: optional(meta.description),
    role: optional(meta.role),
    company: optional(meta.company),
    location: optional(meta.location),
    availability: optional(meta.availability),
    availabilityShort: optional(meta.availabilityShort),
    affiliations: meta.affiliations.map((item) => item.trim()).filter(Boolean),
    keywords: meta.keywords.map((item) => item.trim()).filter(Boolean),
  };
}

export type FieldErrors = Map<string, string>;

export type Prepared = { ok: true; content: SiteContent } | { ok: false; errors: FieldErrors };

/** Blank rows and fields are dropped, then the result must pass the same schema as the server. */
export function prepareForSave(content: SiteContent): Prepared {
  const cleaned = {
    ...content,
    meta: cleanMeta(content.meta),
    sections: content.sections.map(cleanSection),
  };
  const parsed = parseSiteContent(cleaned);
  if (parsed.success) return { ok: true, content: parsed.data };
  const errors: FieldErrors = new Map();
  for (const issue of parsed.error.issues) {
    const path = issue.path.map(String);
    // Paths point into the cleaned content; map section indexes back to stable section ids.
    if (path[0] === "sections" && path[1] !== undefined) {
      const section = cleaned.sections[Number(path[1])];
      if (section) path.splice(0, 2, section.id);
    }
    const key = path.join(".");
    if (!errors.has(key)) errors.set(key, issue.message);
  }
  return { ok: false, errors };
}

/** Remembers the latest valid version of each section, for the preview below. */
export function updateLastValid(
  previous: ReadonlyMap<string, Section>,
  content: SiteContent,
): ReadonlyMap<string, Section> {
  const next = new Map(previous);
  for (const section of content.sections) {
    const parsed = sectionSchema.safeParse(cleanSection(section));
    if (parsed.success) next.set(section.id, parsed.data);
  }
  return next;
}

/**
 * What the preview shows while typing: each section as edited if it's valid, otherwise its
 * last valid version, so a half-typed field never blanks part of the page.
 */
export function previewContent(
  content: SiteContent,
  lastValid: ReadonlyMap<string, Section>,
): RenderableSiteContent {
  const sections: Section[] = [];
  for (const section of content.sections) {
    const parsed = sectionSchema.safeParse(cleanSection(section));
    const fallback = lastValid.get(section.id);
    if (parsed.success) sections.push(parsed.data);
    else if (fallback) sections.push({ ...fallback, visible: section.visible });
  }
  const meta = siteMetaSchema.safeParse(cleanMeta(content.meta));
  return { meta: meta.success ? meta.data : null, sections, droppedSections: 0 };
}

/** A canonical form for comparing the draft with the published version. */
export function fingerprint(draft: {
  templateKey: string;
  theme: unknown;
  content: unknown;
}): string {
  const content = parseSiteContent(draft.content);
  const theme = themeSettingsSchema.safeParse(draft.theme);
  const prepared = content.success ? prepareForSave(normalizeForEditing(content.data)) : null;
  return JSON.stringify([
    normalizeTemplateKey(draft.templateKey),
    theme.success ? theme.data : null,
    prepared?.ok ? prepared.content : draft.content,
  ]);
}

export function sectionOf<T extends EditableSectionType>(content: SiteContent, type: T) {
  return content.sections.find((section): section is SectionOf<T> => section.type === type);
}
