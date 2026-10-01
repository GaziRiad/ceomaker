import {
  roleFromEyebrow,
  type RenderableSiteContent,
  type RichTextParagraph,
  type RichTextSpan,
  type Section,
  type SectionOf,
  type SocialKind,
} from "@ceomaker/schema";
import { initialsOf } from "./monogram";

/** The middle sections a template lays out between the hero and the contact block. */
export type MiddleKind = "impact" | "about" | "experience" | "work" | "testimonials";

/**
 * Where a piece of displayed text lives in the content, for editing it in place in the editor's
 * preview: "hero.headline", "work.items.2.title", "about.body.0", "meta.name". Item indexes count
 * the rendered items; the editor maps them back to its draft.
 */
export type FieldPath = string;

export interface ModelLink {
  label: string;
  href: string;
}

export interface ModelImage {
  src: string;
  alt: string;
}

export interface ModelExperience {
  role: string;
  organization: string;
  location: string;
  /** "2019 – Present" */
  dates: string;
  /** First token of the start date, for timelines: "2019". */
  startYear: string;
  summary: string;
  /** Monogram for the organization: "MF" for Meridian Freight. */
  orgInitials: string;
  fields: { role: FieldPath; organization: FieldPath; location: FieldPath; summary: FieldPath };
}

export interface ModelWork {
  kind: string;
  title: string;
  meta: string;
  year: string;
  href: string | null;
  fields: { title: FieldPath; kind: FieldPath; meta: FieldPath; year: FieldPath };
}

export interface ModelQuote {
  quote: string;
  author: string;
  role: string;
  initials: string;
  /** "Jonas Weber, Chair, Meridian Freight Group" */
  attribution: string;
  fields: { quote: FieldPath; author: FieldPath; role: FieldPath };
}

export interface ModelStat {
  value: string;
  label: string;
  fields: { value: FieldPath; label: FieldPath };
}

export interface ModelAbout {
  /** The large first paragraph. Emphasized spans are styled by each template. */
  lead: RichTextSpan[];
  /** Further paragraphs, as plain text. */
  rest: { text: string; field: FieldPath }[];
  fields: { lead: FieldPath };
}

/**
 * Everything a template needs, derived once from validated content. Templates only lay this
 * out; they never touch raw content, so all of them agree on what is shown and when.
 */
export interface SiteModel {
  name: string;
  first: string;
  last: string;
  initials: string;
  role: string;
  company: string;
  location: string;
  availability: string;
  availabilityShort: string;
  affiliations: string[];
  keywords: string[];
  /** True in the editor's preview, where templates mark text that can be edited in place. */
  editable: boolean;
  /**
   * The questions screen's preview: only what the person has chosen or typed so far. Templates
   * that support it show soft placeholder lines where copy will be written.
   */
  draft: boolean;
  fields: {
    name: FieldPath;
    role: FieldPath;
    company: FieldPath;
    location: FieldPath;
    availability: FieldPath;
    availabilityShort: FieldPath;
    /** One per entry of `affiliations`. */
    affiliations: FieldPath[];
  };
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    cta: ModelLink | null;
    image: ModelImage | null;
    fields: { eyebrow: FieldPath; headline: FieldPath; subheadline: FieldPath; cta: FieldPath };
  };
  /** Visible, non-empty middle sections in the order the user arranged them. */
  order: MiddleKind[];
  stats: ModelStat[];
  about: ModelAbout | null;
  experience: ModelExperience[];
  work: ModelWork[];
  testimonials: ModelQuote[];
  /** The first testimonial, for templates that show a single pull-quote. */
  pullQuote: ModelQuote | null;
  contact: {
    blurb: string;
    email: string;
    links: ModelLink[];
    /** The contact form. On unless the owner turned it off; topics may be empty. */
    form: { enabled: boolean; topics: string[] };
    fields: { blurb: FieldPath };
  };
}

const KIND_LABELS: Record<SocialKind, string> = {
  linkedin: "LinkedIn",
  x: "X",
  github: "GitHub",
  website: "Website",
  instagram: "Instagram",
  youtube: "YouTube",
  other: "Link",
};

const ORG_STOPWORDS = /^(and|of|the|&)$/i;

/** Two letters for an organization tile: "Meridian Freight Group" -> "MF". */
export function orgInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => /^\p{L}/u.test(word) && !ORG_STOPWORDS.test(word))
    .map((word) => Array.from(word)[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function linkLabel(link: {
  label?: string | undefined;
  kind?: SocialKind | undefined;
  href: string;
}) {
  if (link.label) return link.label;
  if (link.kind && link.kind !== "other") return KIND_LABELS[link.kind];
  try {
    return new URL(link.href).hostname.replace(/^www\./, "");
  } catch {
    return link.href;
  }
}

function plainText(paragraph: RichTextParagraph): string {
  return paragraph.spans.map((span) => span.text).join("");
}

function firstOf<T extends Section["type"]>(
  sections: Section[],
  type: T,
): SectionOf<T> | undefined {
  return sections.find((section): section is SectionOf<T> => section.type === type);
}

function firstVisible<T extends Section["type"]>(
  sections: Section[],
  type: T,
): SectionOf<T> | undefined {
  return sections.find(
    (section): section is SectionOf<T> => section.type === type && section.visible,
  );
}

const MIDDLE_KIND: Partial<Record<Section["type"], MiddleKind>> = {
  achievements: "impact",
  about: "about",
  experience: "experience",
  portfolio: "work",
  testimonials: "testimonials",
};

function quoteOf(
  item: { quote: string; author: string; role?: string | undefined },
  at: FieldPath,
): ModelQuote {
  return {
    quote: item.quote,
    author: item.author,
    role: item.role ?? "",
    initials: initialsOf(item.author),
    attribution: item.role ? `${item.author}, ${item.role}` : item.author,
    fields: { quote: `${at}.quote`, author: `${at}.author`, role: `${at}.role` },
  };
}

export function buildSiteModel(
  content: RenderableSiteContent,
  { editable = false, draft = false }: { editable?: boolean; draft?: boolean } = {},
): SiteModel {
  const { sections } = content;
  const meta = content.meta;
  const hero = firstOf(sections, "hero");
  const name = meta?.name ?? hero?.headline ?? "";
  const words = name.trim().split(/\s+/).filter(Boolean);

  const impact = firstVisible(sections, "achievements");
  const about = firstVisible(sections, "about");
  const experience = firstVisible(sections, "experience");
  const work = firstVisible(sections, "portfolio");
  const testimonials = firstVisible(sections, "testimonials");
  const contact = firstOf(sections, "contact");
  const heroId = hero?.id ?? "hero";

  const stats: ModelStat[] =
    impact?.items.map((item, index) => ({
      value: item.value,
      label: item.label,
      fields: {
        value: `${impact.id}.items.${index}.value`,
        label: `${impact.id}.items.${index}.label`,
      },
    })) ?? [];
  const [leadParagraph, ...restParagraphs] = about?.body ?? [];
  const aboutModel: ModelAbout | null =
    about && leadParagraph
      ? {
          lead: leadParagraph.spans,
          rest: restParagraphs
            .map((paragraph, index) => ({
              text: plainText(paragraph),
              field: `${about.id}.body.${index + 1}`,
            }))
            .filter((paragraph) => paragraph.text),
          fields: { lead: `${about.id}.body.0` },
        }
      : null;
  const experienceItems: ModelExperience[] =
    experience?.items.map((item, index) => ({
      role: item.role,
      organization: item.organization,
      location: item.location ?? "",
      dates: [item.start, item.end].filter(Boolean).join(" – "),
      startYear: item.start?.split(/[\s–-]/)[0] ?? "",
      summary: item.summary ?? "",
      orgInitials: orgInitials(item.organization),
      fields: {
        role: `${experience.id}.items.${index}.role`,
        organization: `${experience.id}.items.${index}.organization`,
        location: `${experience.id}.items.${index}.location`,
        summary: `${experience.id}.items.${index}.summary`,
      },
    })) ?? [];
  const workItems: ModelWork[] =
    work?.items.map((item, index) => ({
      kind: item.kind ?? "",
      title: item.title,
      meta: item.meta || item.description || "",
      year: item.year ?? "",
      href: item.href ?? null,
      fields: {
        title: `${work.id}.items.${index}.title`,
        kind: `${work.id}.items.${index}.kind`,
        // The line shows the description when there's no meta, so edits go where the text came from.
        meta: `${work.id}.items.${index}.${!item.meta && item.description ? "description" : "meta"}`,
        year: `${work.id}.items.${index}.year`,
      },
    })) ?? [];
  const quotes =
    testimonials?.items.map((item, index) => quoteOf(item, `${testimonials.id}.items.${index}`)) ??
    [];

  // Hidden or empty sections drop out, so templates never render an empty block.
  const present: Record<MiddleKind, boolean> = {
    impact: stats.length > 0,
    about: aboutModel !== null,
    experience: experienceItems.length > 0,
    work: workItems.length > 0,
    testimonials: quotes.length > 0,
  };
  const order: MiddleKind[] = [];
  for (const section of sections) {
    const kind = MIDDLE_KIND[section.type];
    if (kind && section.visible && present[kind] && !order.includes(kind)) order.push(kind);
  }

  return {
    name,
    first: words[0] ?? "",
    last: words.slice(1).join(" "),
    initials: initialsOf(name),
    role: meta?.role || roleFromEyebrow(hero?.eyebrow),
    company: meta?.company ?? "",
    location: meta?.location ?? "",
    availability: meta?.availability ?? "",
    availabilityShort: meta?.availabilityShort || meta?.availability || "",
    affiliations: meta?.affiliations ?? [],
    keywords: meta?.keywords ?? [],
    editable,
    draft,
    fields: {
      name: "meta.name",
      role: "meta.role",
      company: "meta.company",
      location: "meta.location",
      availability: "meta.availability",
      availabilityShort: "meta.availabilityShort",
      affiliations: (meta?.affiliations ?? []).map((_, index) => `meta.affiliations.${index}`),
    },
    hero: {
      eyebrow: hero?.eyebrow ?? "",
      // Older templates set the name as the headline; a draft shows a placeholder instead.
      headline: hero?.headline ?? (draft ? "" : name),
      subheadline: hero?.subheadline ?? "",
      cta: hero?.primaryCta ? { label: hero.primaryCta.label, href: hero.primaryCta.href } : null,
      image: hero?.image ? { src: hero.image.src, alt: hero.image.alt || name } : null,
      fields: {
        eyebrow: `${heroId}.eyebrow`,
        headline: `${heroId}.headline`,
        subheadline: `${heroId}.subheadline`,
        cta: `${heroId}.primaryCta.label`,
      },
    },
    order,
    stats: present.impact ? stats : [],
    about: present.about ? aboutModel : null,
    experience: present.experience ? experienceItems : [],
    work: present.work ? workItems : [],
    testimonials: present.testimonials ? quotes : [],
    pullQuote: present.testimonials ? (quotes[0] ?? null) : null,
    contact: {
      blurb: contact?.blurb ?? "",
      email: contact?.email ?? "",
      links: (contact?.links ?? []).map((link) => ({ label: linkLabel(link), href: link.href })),
      form: {
        enabled: contact?.form?.enabled ?? true,
        topics: contact?.form?.topics ?? [],
      },
      fields: { blurb: `${contact?.id ?? "contact"}.blurb` },
    },
  };
}

/** True when the section is visible and has something to show. */
export function shows(model: SiteModel, kind: MiddleKind): boolean {
  return model.order.includes(kind);
}

/** The first span of the lead paragraph split for a drop cap: "I" + "joined Meridian…". */
export function dropCap(spans: RichTextSpan[]): { letter: string; spans: RichTextSpan[] } | null {
  const [first, ...rest] = spans;
  if (!first || first.bold || first.italic || first.href) return null;
  const characters = Array.from(first.text.trimStart());
  const letter = characters[0];
  if (!letter) return null;
  return { letter, spans: [{ ...first, text: characters.slice(1).join("") }, ...rest] };
}
