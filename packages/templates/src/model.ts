import {
  FOCAL_DEFAULT,
  roleFromEyebrow,
  type ImageRef,
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

/** Everything between the hero and contact, with the sections only some templates show. */
export type SequenceKind = MiddleKind | "focus" | "cta";

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

export interface ModelContactLink extends ModelLink {
  /** What the link points at, for templates that show an icon: set by the owner, else guessed. */
  kind: SocialKind;
  field: FieldPath;
}

/** Sections with a title of their own: the middle ones and contact. */
export type HeadingKind = MiddleKind | "contact";

/** A piece of template wording, as the owner wrote it or the template's default. */
export interface ModelText {
  text: string;
  field: FieldPath;
}

export interface ModelImage {
  src: string;
  alt: string;
  /** CSS object-position that keeps the photo's subject in view when it's cropped: "50% 35%". */
  position: string;
}

export interface ModelExperience {
  role: string;
  organization: string;
  location: string;
  /** "2019 – Present" */
  dates: string;
  start: string;
  end: string;
  /** First token of the start date, for timelines: "2019". */
  startYear: string;
  summary: string;
  /** Monogram for the organization: "MF" for Meridian Freight. */
  orgInitials: string;
  fields: {
    role: FieldPath;
    organization: FieldPath;
    location: FieldPath;
    summary: FieldPath;
    start: FieldPath;
    end: FieldPath;
  };
}

export interface ModelWork {
  kind: string;
  title: string;
  meta: string;
  year: string;
  href: string | null;
  /** The one-line context alone, and the description alone, for templates that show both. */
  context: string;
  description: string;
  image: ModelImage | null;
  fields: {
    title: FieldPath;
    kind: FieldPath;
    meta: FieldPath;
    year: FieldPath;
    context: FieldPath;
    description: FieldPath;
  };
}

export interface ModelQuote {
  quote: string;
  author: string;
  role: string;
  initials: string;
  /** "Jonas Weber, Chair, Meridian Freight Group" */
  attribution: string;
  photo: ModelImage | null;
  fields: { quote: FieldPath; author: FieldPath; role: FieldPath };
}

/** The closing invitation before contact, for templates that have one. */
export interface ModelCta {
  headline: string;
  body: string;
  button: ModelLink | null;
  /** How many of `order` come before it: it sits between those and the rest. */
  after: number;
  fields: { headline: FieldPath; body: FieldPath; button: FieldPath };
}

export interface ModelFocusItem {
  title: string;
  description: string;
  fields: { title: FieldPath; description: FieldPath };
}

/** What the owner works on now, for templates that show it (Folio). */
export interface ModelFocus {
  /** The owner's title. Empty: the template's own label. */
  heading: string;
  headingField: FieldPath;
  items: ModelFocusItem[];
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
  image: ModelImage | null;
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
    /** One per entry of `keywords`. */
    keywords: FieldPath[];
  };
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    cta: ModelLink | null;
    image: ModelImage | null;
    fields: { eyebrow: FieldPath; headline: FieldPath; subheadline: FieldPath; cta: FieldPath };
  };
  /** More photos after the hero image, for templates that hang several. */
  gallery: ModelImage[];
  /** Visible, non-empty middle sections in the order the user arranged them. */
  order: MiddleKind[];
  /**
   * The same, with the focus areas and the closing section where they sit, for templates that
   * show those (Folio). Templates without them use `order`.
   */
  sequence: SequenceKind[];
  /** Section titles the owner wrote. Empty: the template's own label. */
  headings: Record<HeadingKind, string>;
  headingFields: Record<HeadingKind, FieldPath>;
  /** Template wording the owner rewrote, by key (see label()). */
  labels: Record<string, string>;
  stats: ModelStat[];
  about: ModelAbout | null;
  experience: ModelExperience[];
  work: ModelWork[];
  testimonials: ModelQuote[];
  /** The first testimonial, for templates that show a single pull-quote. */
  pullQuote: ModelQuote | null;
  /** Visible and filled in; null otherwise. Templates without a closing section ignore it. */
  cta: ModelCta | null;
  /** Visible with at least one area; null otherwise. Templates without it ignore it. */
  focus: ModelFocus | null;
  contact: {
    blurb: string;
    email: string;
    links: ModelContactLink[];
    /** The contact form. On unless the owner turned it off; topics may be empty. */
    form: { enabled: boolean; topics: string[] };
    fields: { blurb: FieldPath; topics: FieldPath[] };
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

const KIND_HOSTS: [RegExp, SocialKind][] = [
  [/(^|\.)linkedin\.com$/, "linkedin"],
  [/(^|\.)(x|twitter)\.com$/, "x"],
  [/(^|\.)github\.com$/, "github"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
];

/** The owner's choice, else guessed from the address: web pages are "website". */
function linkKind(link: { kind?: SocialKind | undefined; href: string }): SocialKind {
  if (link.kind) return link.kind;
  try {
    const url = new URL(link.href);
    const host = url.hostname.toLowerCase();
    const known = KIND_HOSTS.find(([pattern]) => pattern.test(host));
    if (known) return known[1];
    return url.protocol === "https:" || url.protocol === "http:" ? "website" : "other";
  } catch {
    return "other";
  }
}

/** A displayed image, with its focal point as an object-position. */
function imageOf(image: ImageRef | undefined, fallbackAlt: string): ModelImage | null {
  if (!image) return null;
  const focal = image.focal ?? FOCAL_DEFAULT;
  const percent = (value: number) => `${Math.round(value * 1000) / 10}%`;
  return {
    src: image.src,
    alt: image.alt || fallbackAlt,
    position: `${percent(focal.x)} ${percent(focal.y)}`,
  };
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
  item: { quote: string; author: string; role?: string | undefined; photo?: ImageRef | undefined },
  at: FieldPath,
): ModelQuote {
  return {
    quote: item.quote,
    author: item.author,
    role: item.role ?? "",
    initials: initialsOf(item.author),
    attribution: item.role ? `${item.author}, ${item.role}` : item.author,
    photo: imageOf(item.photo, item.author),
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
  const focus = firstVisible(sections, "focus");
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
          image: imageOf(about.image, name),
          fields: { lead: `${about.id}.body.0` },
        }
      : null;
  const experienceItems: ModelExperience[] =
    experience?.items.map((item, index) => ({
      role: item.role,
      organization: item.organization,
      location: item.location ?? "",
      dates: [item.start, item.end].filter(Boolean).join(" – "),
      start: item.start ?? "",
      end: item.end ?? "",
      startYear: item.start?.split(/[\s–-]/)[0] ?? "",
      summary: item.summary ?? "",
      orgInitials: orgInitials(item.organization),
      fields: {
        role: `${experience.id}.items.${index}.role`,
        organization: `${experience.id}.items.${index}.organization`,
        location: `${experience.id}.items.${index}.location`,
        summary: `${experience.id}.items.${index}.summary`,
        start: `${experience.id}.items.${index}.start`,
        end: `${experience.id}.items.${index}.end`,
      },
    })) ?? [];
  const workItems: ModelWork[] =
    work?.items.map((item, index) => ({
      kind: item.kind ?? "",
      title: item.title,
      meta: item.meta || item.description || "",
      year: item.year ?? "",
      href: item.href ?? null,
      context: item.meta ?? "",
      description: item.description ?? "",
      image: imageOf(item.image, item.title),
      fields: {
        title: `${work.id}.items.${index}.title`,
        context: `${work.id}.items.${index}.meta`,
        description: `${work.id}.items.${index}.description`,
        kind: `${work.id}.items.${index}.kind`,
        // The line shows the description when there's no meta, so edits go where the text came from.
        meta: `${work.id}.items.${index}.${!item.meta && item.description ? "description" : "meta"}`,
        year: `${work.id}.items.${index}.year`,
      },
    })) ?? [];
  const quotes =
    testimonials?.items.map((item, index) => quoteOf(item, `${testimonials.id}.items.${index}`)) ??
    [];
  const focusModel: ModelFocus | null =
    focus && focus.items.length
      ? {
          heading: focus.heading ?? "",
          headingField: `${focus.id}.heading`,
          items: focus.items.map((item, index) => ({
            title: item.title,
            description: item.description ?? "",
            fields: {
              title: `${focus.id}.items.${index}.title`,
              description: `${focus.id}.items.${index}.description`,
            },
          })),
        }
      : null;

  // Hidden or empty sections drop out, so templates never render an empty block.
  const present: Record<MiddleKind, boolean> = {
    impact: stats.length > 0,
    about: aboutModel !== null,
    experience: experienceItems.length > 0,
    work: workItems.length > 0,
    testimonials: quotes.length > 0,
  };
  const headed: Record<HeadingKind, { id: string; heading?: string | undefined } | undefined> = {
    impact,
    about,
    experience,
    work,
    testimonials,
    contact,
  };
  const headings = {} as Record<HeadingKind, string>;
  const headingFields = {} as Record<HeadingKind, FieldPath>;
  for (const [kind, section] of Object.entries(headed) as [HeadingKind, typeof contact][]) {
    headings[kind] = section?.heading ?? "";
    headingFields[kind] = `${section?.id ?? kind}.heading`;
  }
  const order: MiddleKind[] = [];
  const sequence: SequenceKind[] = [];
  const cta = firstVisible(sections, "cta");
  let ctaAfter = 0;
  for (const section of sections) {
    if (section === cta) {
      ctaAfter = order.length;
      sequence.push("cta");
    }
    if (section === focus && focusModel) sequence.push("focus");
    const kind = MIDDLE_KIND[section.type];
    if (kind && section.visible && present[kind] && !order.includes(kind)) {
      order.push(kind);
      sequence.push(kind);
    }
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
      keywords: (meta?.keywords ?? []).map((_, index) => `meta.keywords.${index}`),
    },
    hero: {
      eyebrow: hero?.eyebrow ?? "",
      // Older templates set the name as the headline; a draft shows a placeholder instead.
      headline: hero?.headline ?? (draft ? "" : name),
      subheadline: hero?.subheadline ?? "",
      cta: hero?.primaryCta ? { label: hero.primaryCta.label, href: hero.primaryCta.href } : null,
      image: imageOf(hero?.image, name),
      fields: {
        eyebrow: `${heroId}.eyebrow`,
        headline: `${heroId}.headline`,
        subheadline: `${heroId}.subheadline`,
        cta: `${heroId}.primaryCta.label`,
      },
    },
    gallery: (hero?.gallery ?? []).map((photo) => imageOf(photo, "")!),
    order,
    sequence,
    headings,
    headingFields,
    labels: meta?.labels ?? {},
    stats: present.impact ? stats : [],
    about: present.about ? aboutModel : null,
    experience: present.experience ? experienceItems : [],
    work: present.work ? workItems : [],
    testimonials: present.testimonials ? quotes : [],
    pullQuote: present.testimonials ? (quotes[0] ?? null) : null,
    cta: cta
      ? {
          headline: cta.headline,
          body: cta.body ?? "",
          button: cta.button ? { label: cta.button.label, href: cta.button.href } : null,
          after: ctaAfter,
          fields: {
            headline: `${cta.id}.headline`,
            body: `${cta.id}.body`,
            button: `${cta.id}.button.label`,
          },
        }
      : null,
    focus: focusModel,
    contact: {
      blurb: contact?.blurb ?? "",
      email: contact?.email ?? "",
      links: (contact?.links ?? []).map((link, index) => ({
        label: linkLabel(link),
        href: link.href,
        kind: linkKind(link),
        field: `${contact?.id ?? "contact"}.links.${index}.label`,
      })),
      form: {
        enabled: contact?.form?.enabled ?? true,
        topics: contact?.form?.topics ?? [],
      },
      fields: {
        blurb: `${contact?.id ?? "contact"}.blurb`,
        topics: (contact?.form?.topics ?? []).map(
          (_, index) => `${contact?.id ?? "contact"}.form.topics.${index}`,
        ),
      },
    },
  };
}

/** A section's title: the owner's, else the template's own label. */
export function headingOf(model: SiteModel, kind: HeadingKind, fallback: string): ModelText {
  return { text: model.headings[kind] || fallback, field: model.headingFields[kind] };
}

/** Template wording by key: the owner's rewrite, else the template's default. */
export function label(model: SiteModel, key: string, fallback: string): ModelText {
  return { text: model.labels[key] || fallback, field: `meta.labels.${key}` };
}

/** True when the section is visible and has something to show. */
export function shows(model: SiteModel, kind: MiddleKind): boolean {
  return model.order.includes(kind);
}
