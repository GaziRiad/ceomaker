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
}

export interface ModelWork {
  kind: string;
  title: string;
  meta: string;
  year: string;
  href: string | null;
}

export interface ModelQuote {
  quote: string;
  author: string;
  role: string;
  initials: string;
  /** "Jonas Weber, Chair, Meridian Freight Group" */
  attribution: string;
}

export interface ModelAbout {
  /** The large first paragraph. Emphasized spans are styled by each template. */
  lead: RichTextSpan[];
  /** Further paragraphs, as plain text. */
  rest: string[];
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
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    cta: ModelLink | null;
    image: ModelImage | null;
  };
  /** Visible, non-empty middle sections in the order the user arranged them. */
  order: MiddleKind[];
  stats: { value: string; label: string }[];
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

function quoteOf(item: { quote: string; author: string; role?: string | undefined }): ModelQuote {
  return {
    quote: item.quote,
    author: item.author,
    role: item.role ?? "",
    initials: initialsOf(item.author),
    attribution: item.role ? `${item.author}, ${item.role}` : item.author,
  };
}

export function buildSiteModel(content: RenderableSiteContent): SiteModel {
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

  const stats = impact?.items.map((item) => ({ value: item.value, label: item.label })) ?? [];
  const [leadParagraph, ...restParagraphs] = about?.body ?? [];
  const aboutModel: ModelAbout | null = leadParagraph
    ? {
        lead: leadParagraph.spans,
        rest: restParagraphs.map(plainText).filter(Boolean),
      }
    : null;
  const experienceItems: ModelExperience[] =
    experience?.items.map((item) => ({
      role: item.role,
      organization: item.organization,
      location: item.location ?? "",
      dates: [item.start, item.end].filter(Boolean).join(" – "),
      startYear: item.start?.split(/[\s–-]/)[0] ?? "",
      summary: item.summary ?? "",
      orgInitials: orgInitials(item.organization),
    })) ?? [];
  const workItems: ModelWork[] =
    work?.items.map((item) => ({
      kind: item.kind ?? "",
      title: item.title,
      meta: item.meta || item.description || "",
      year: item.year ?? "",
      href: item.href ?? null,
    })) ?? [];
  const quotes = testimonials?.items.map(quoteOf) ?? [];

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
    hero: {
      eyebrow: hero?.eyebrow ?? "",
      headline: hero?.headline ?? name,
      subheadline: hero?.subheadline ?? "",
      cta: hero?.primaryCta ? { label: hero.primaryCta.label, href: hero.primaryCta.href } : null,
      image: hero?.image ? { src: hero.image.src, alt: hero.image.alt || name } : null,
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
