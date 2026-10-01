import {
  EDITABLE_SECTION_TYPES,
  FIXED_SECTION_TYPES,
  normalizeTemplateKey,
  parseSiteContent,
  parseThemeSettingsForRender,
  resolveSiteColors,
  resolveTemplateRef,
  sectionSchema,
  siteMetaSchema,
  themeSettingsSchema,
  type EditableSectionType,
  type RenderableSiteContent,
  type RichTextSpan,
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
  /** The template's design. Changes only when the owner picks a design, never on its own. */
  templateVersion: number;
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

type ListType = "achievements" | "experience" | "portfolio" | "testimonials";
type ItemOf<T extends ListType> = SectionOf<T>["items"][number];

/** Rows with anything typed in them; fully blank rows are dropped before saving and previewing. */
const KEEP: { [T in ListType]: (item: ItemOf<T>) => boolean } = {
  achievements: (item) => !blank(item.value) || !blank(item.label),
  experience: (item) =>
    [item.role, item.organization, item.start, item.end, item.summary].some(
      (value) => !blank(value),
    ),
  portfolio: (item) =>
    [item.title, item.kind, item.meta, item.year, item.href].some((value) => !blank(value)),
  testimonials: (item) => !blank(item.quote) || !blank(item.author),
};

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
      return { ...section, items: section.items.filter(KEEP.achievements) };
    case "experience":
      return {
        ...section,
        items: section.items.filter(KEEP.experience).map((item) => ({
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
        items: section.items.filter(KEEP.portfolio).map((item) => ({
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
          .filter(KEEP.testimonials)
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

function canonicalContent(raw: unknown): unknown {
  const content = parseSiteContent(raw);
  const prepared = content.success ? prepareForSave(normalizeForEditing(content.data)) : null;
  return prepared?.ok ? prepared.content : raw;
}

/** A canonical form of everything that's saved, for knowing whether the draft needs saving. */
export function fingerprint(draft: {
  templateKey: string;
  templateVersion: unknown;
  theme: unknown;
  content: unknown;
}): string {
  const theme = themeSettingsSchema.safeParse(draft.theme);
  return JSON.stringify([
    normalizeTemplateKey(draft.templateKey),
    draft.templateVersion,
    theme.success ? theme.data : null,
    canonicalContent(draft.content),
  ]);
}

/**
 * What visitors would see, for comparing the draft with the live site: the design, the colours
 * it renders with and the content. Colours saved for other templates don't show, so they don't
 * count, and a default written out at publish matches the same default left unset.
 */
export function liveFingerprint(draft: {
  templateKey: string;
  templateVersion: unknown;
  theme: unknown;
  content: unknown;
}): string {
  const { key, version } = resolveTemplateRef(draft.templateKey, draft.templateVersion);
  const colors = resolveSiteColors(parseThemeSettingsForRender(draft.theme), key, version);
  return JSON.stringify([key, version, colors, canonicalContent(draft.content)]);
}

export function sectionOf<T extends EditableSectionType>(content: SiteContent, type: T) {
  return content.sections.find((section): section is SectionOf<T> => section.type === type);
}

// In-place editing. Templates mark preview text with the content path it shows (FieldPath in
// @ceomaker/templates): "hero.headline", "experience.items.2.role", "about.body.0", "meta.name".
// Item indexes count rendered items, so they're mapped back past blank rows to the draft's.

const ITEM_FIELDS: { [T in ListType]: readonly (keyof ItemOf<T> & string)[] } = {
  achievements: ["value", "label"],
  experience: ["role", "organization", "location", "summary"],
  portfolio: ["title", "kind", "meta", "year", "description"],
  testimonials: ["quote", "author", "role"],
};
const HERO_FIELDS = ["eyebrow", "headline", "subheadline"] as const;
const META_FIELDS = [
  "name",
  "role",
  "company",
  "location",
  "availability",
  "availabilityShort",
] as const;

/** Typed text as a single line: pasted line breaks and runs of spaces become one space. */
function singleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** The draft index of the nth row the preview shows, skipping rows it doesn't. */
function draftIndex<T>(items: readonly T[], keep: (item: T) => boolean, shown: string) {
  if (!/^\d+$/.test(shown)) return -1;
  let seen = -1;
  return items.findIndex((item) => keep(item) && ++seen === Number(shown));
}

function includes<T extends string>(list: readonly T[], value: string | undefined): value is T {
  return (list as readonly string[]).includes(value ?? "");
}

/** The section whose form holds a preview field. Profile details live in the hero's form. */
export function sectionIdOfField(content: SiteContent, path: string): string | null {
  const [head] = path.split(".");
  if (head === "meta") return sectionOf(content, "hero")?.id ?? null;
  return content.sections.some((section) => section.id === head) ? (head ?? null) : null;
}

/**
 * Whether the preview shows this field straight from the draft. A section that doesn't validate
 * is previewed from its last valid version, whose text and rows can differ from the draft's.
 */
export function canEditInPlace(content: SiteContent, path: string): boolean {
  const [head] = path.split(".");
  if (head === "meta") return siteMetaSchema.safeParse(cleanMeta(content.meta)).success;
  const section = content.sections.find((candidate) => candidate.id === head);
  return !!section && sectionSchema.safeParse(cleanSection(section)).success;
}

function sameFormat(a: RichTextSpan, b: RichTextSpan) {
  return !!a.bold === !!b.bold && !!a.italic === !!b.italic && a.href === b.href;
}

/**
 * Applies an edit of a paragraph's plain text to its spans. Text outside the changed range keeps
 * its emphasis and links; new text takes the format of what it replaced, or of the text before
 * the caret. Returns no spans when the paragraph was emptied.
 */
export function respan(spans: RichTextSpan[], before: string, after: string): RichTextSpan[] {
  if (spans.map((span) => span.text).join("") !== before) {
    const text = singleLine(after);
    return text ? [{ text }] : [];
  }
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) {
    start += 1;
  }
  let end = 0;
  while (
    end < before.length - start &&
    end < after.length - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) {
    end += 1;
  }
  const cutEnd = before.length - end;
  const anchor = cutEnd > start ? start : Math.max(0, start - 1);
  const head: RichTextSpan[] = [];
  const tail: RichTextSpan[] = [];
  let format: RichTextSpan = spans[0] ?? { text: "" };
  let offset = 0;
  for (const span of spans) {
    const from = offset;
    offset += span.text.length;
    if (anchor >= from && anchor < offset) format = span;
    if (from < start)
      head.push({ ...span, text: span.text.slice(0, Math.min(offset, start) - from) });
    if (offset > cutEnd)
      tail.push({ ...span, text: span.text.slice(Math.max(from, cutEnd) - from) });
  }
  const pieces = [...head, { ...format, text: after.slice(start, after.length - end) }, ...tail];
  const merged: RichTextSpan[] = [];
  for (const piece of pieces) {
    const text = piece.text.replace(/\s+/g, " ");
    const last = merged.at(-1);
    if (!text) continue;
    if (last && sameFormat(last, piece)) last.text += text;
    else merged.push({ ...piece, text });
  }
  const first = merged[0];
  if (first) first.text = first.text.trimStart();
  const last = merged.at(-1);
  if (last) last.text = last.text.trimEnd();
  return merged.filter((span) => span.text);
}

function editSection(section: Section, rest: string[], before: string, after: string) {
  const [field, index, key] = rest;
  const value = singleLine(after);
  switch (section.type) {
    case "hero":
      if (rest.length === 1 && includes(HERO_FIELDS, field)) return { ...section, [field]: value };
      if (rest.join(".") === "primaryCta.label" && section.primaryCta) {
        return { ...section, primaryCta: { ...section.primaryCta, label: value } };
      }
      return null;
    case "contact":
      return rest.length === 1 && field === "blurb" ? { ...section, blurb: value } : null;
    case "about": {
      const paragraph = /^\d+$/.test(index ?? "") ? section.body[Number(index)] : undefined;
      if (field !== "body" || rest.length !== 2 || !paragraph) return null;
      const spans = respan(paragraph.spans, before, after);
      return {
        ...section,
        body: spans.length
          ? section.body.map((current) => (current === paragraph ? { spans } : current))
          : section.body.filter((current) => current !== paragraph),
      };
    }
    case "achievements":
    case "experience":
    case "portfolio":
    case "testimonials": {
      const keep = KEEP[section.type] as (item: ItemOf<ListType>) => boolean;
      const fields = ITEM_FIELDS[section.type] as readonly string[];
      const at = draftIndex<ItemOf<ListType>>(section.items, keep, index ?? "");
      if (field !== "items" || rest.length !== 3 || at < 0 || !fields.includes(key ?? "")) {
        return null;
      }
      return {
        ...section,
        items: section.items.map((item, i) => (i === at ? { ...item, [key!]: value } : item)),
      } as Section;
    }
    default:
      return null;
  }
}

/**
 * Applies text typed into the preview to the draft. `before` is the text the element showed when
 * editing began. Null when the path doesn't map to the draft, so the edit is dropped.
 */
export function editInPlace(
  content: SiteContent,
  path: string,
  before: string,
  after: string,
): SiteContent | null {
  if (!canEditInPlace(content, path)) return null;
  const [head, ...rest] = path.split(".");
  if (head === "meta") {
    const [field, index] = rest;
    const value = singleLine(after);
    if (rest.length === 1 && includes(META_FIELDS, field)) {
      return { ...content, meta: { ...content.meta, [field]: value } };
    }
    const affiliations = content.meta.affiliations;
    const at = draftIndex(affiliations, (item) => !blank(item), index ?? "");
    if (field !== "affiliations" || rest.length !== 2 || at < 0) return null;
    return {
      ...content,
      meta: {
        ...content.meta,
        affiliations: value
          ? affiliations.map((item, i) => (i === at ? value : item))
          : affiliations.filter((_, i) => i !== at),
      },
    };
  }
  const section = content.sections.find((candidate) => candidate.id === head);
  const next = section ? editSection(section, rest, before, after) : null;
  if (!next) return null;
  return {
    ...content,
    sections: content.sections.map((current) => (current === section ? next : current)),
  };
}
