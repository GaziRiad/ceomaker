import { z } from "zod";
import {
  callToAction,
  imageRef,
  longText,
  requiredText,
  safeLinkUrl,
  sectionId,
  text,
} from "./primitives";
import { richText } from "./rich-text";

const base = {
  id: sectionId,
  visible: z.boolean().default(true),
};

/**
 * The owner's own title for the section ("Contact us"). Templates that support it show it in
 * place of their own label and in the navigation; others keep their wording.
 */
const heading = text(80).optional();

export const MAX_GALLERY_PHOTOS = 12;
export const GALLERY_CAPTION_LIMIT = 120;

export const heroSection = z.object({
  ...base,
  type: z.literal("hero"),
  eyebrow: text(80).optional(),
  headline: requiredText(120),
  subheadline: longText(280).optional(),
  primaryCta: callToAction.optional(),
  image: imageRef.optional(),
  /**
   * More photos: events, products, press. Templates that hang several pictures (Salon) show them
   * after the hero image; others ignore them. The alt text is the photo's caption.
   */
  gallery: z
    .array(imageRef.extend({ alt: text(GALLERY_CAPTION_LIMIT) }))
    .max(MAX_GALLERY_PHOTOS)
    .optional(),
});

export const aboutSection = z.object({
  ...base,
  type: z.literal("about"),
  heading,
  /** First paragraph is the large lead; emphasized spans are the template's highlight. */
  body: richText,
  image: imageRef.optional(),
});

export const experienceItem = z.object({
  role: requiredText(100),
  organization: requiredText(100),
  location: text(80).optional(),
  start: text(20).optional(),
  end: text(20).optional(),
  summary: longText(500).optional(),
});

// List sections may be empty: a new site keeps them hidden and empty until the user adds
// something true. Templates never render an empty list.
export const experienceSection = z.object({
  ...base,
  type: z.literal("experience"),
  heading,
  items: z.array(experienceItem).max(20),
});

export const achievementItem = z.object({
  value: requiredText(20),
  label: requiredText(80),
});

export const achievementsSection = z.object({
  ...base,
  type: z.literal("achievements"),
  heading,
  items: z.array(achievementItem).max(8),
});

export const portfolioItem = z.object({
  title: requiredText(120),
  /** Short category label: "Keynote", "Essay", "Board". */
  kind: text(30).optional(),
  /** One line of context: venue, publication or role. */
  meta: text(120).optional(),
  year: text(20).optional(),
  description: longText(300).optional(),
  href: safeLinkUrl.optional(),
  image: imageRef.optional(),
});

export const portfolioSection = z.object({
  ...base,
  type: z.literal("portfolio"),
  heading,
  items: z.array(portfolioItem).max(12),
});

export const testimonialItem = z.object({
  quote: requiredText(500),
  author: requiredText(80),
  role: text(100).optional(),
  /** The person quoted. Shown by templates that pair a quote with a face (Salon). */
  photo: imageRef.optional(),
});

export const testimonialsSection = z.object({
  ...base,
  type: z.literal("testimonials"),
  heading,
  items: z.array(testimonialItem).max(10),
});

export const SOCIAL_KINDS = [
  "linkedin",
  "x",
  "github",
  "website",
  "instagram",
  "youtube",
  "other",
] as const;
export type SocialKind = (typeof SOCIAL_KINDS)[number];

export const socialLink = z.object({
  /** What the visitor reads. When missing, templates fall back to the kind or the host name. */
  label: text(40).optional(),
  href: safeLinkUrl,
  kind: z.enum(SOCIAL_KINDS).optional(),
});

/**
 * The form visitors can write through instead of copying an email address. Messages land in the
 * owner's dashboard. Missing settings mean the form is on, without the topic question.
 */
export const contactFormSettings = z.object({
  enabled: z.boolean().default(true),
  /** Choices for "What is it about?". Seeded from the onboarding goals plus "Something else". */
  topics: z.array(requiredText(40)).max(8).default([]),
});

export const contactSection = z.object({
  ...base,
  type: z.literal("contact"),
  heading,
  /** The invitation line, shown as the section's headline. */
  blurb: longText(280).optional(),
  email: z.email().max(254).optional(),
  links: z.array(socialLink).max(10).default([]),
  form: contactFormSettings.optional(),
});

/**
 * A closing invitation before the contact section. Templates that have one (Salon) show it;
 * others leave it out.
 */
export const ctaSection = z.object({
  ...base,
  type: z.literal("cta"),
  headline: requiredText(120),
  body: longText(280).optional(),
  button: callToAction.optional(),
});

export const sectionSchema = z.discriminatedUnion("type", [
  heroSection,
  aboutSection,
  experienceSection,
  achievementsSection,
  portfolioSection,
  testimonialsSection,
  contactSection,
  ctaSection,
]);

export type Section = z.output<typeof sectionSchema>;
export type SectionInput = z.input<typeof sectionSchema>;
export type SectionType = Section["type"];
export type SectionOf<T extends SectionType> = Extract<Section, { type: T }>;
export type ExperienceItem = z.output<typeof experienceItem>;
export type AchievementItem = z.output<typeof achievementItem>;
export type PortfolioItem = z.output<typeof portfolioItem>;
export type TestimonialItem = z.output<typeof testimonialItem>;
export type SocialLink = z.output<typeof socialLink>;
export type ContactFormSettings = z.output<typeof contactFormSettings>;

export const SECTION_TYPES = [
  "hero",
  "about",
  "experience",
  "achievements",
  "portfolio",
  "testimonials",
  "contact",
  "cta",
] as const satisfies readonly SectionType[];

/** Sections the editor offers, in the default order of a new site. Hero and contact are fixed. */
export const EDITABLE_SECTION_TYPES = [
  "hero",
  "achievements",
  "about",
  "experience",
  "portfolio",
  "testimonials",
  "cta",
  "contact",
] as const satisfies readonly SectionType[];

export type EditableSectionType = (typeof EDITABLE_SECTION_TYPES)[number];

/** Pinned at the top and bottom of every site; they can't be hidden or moved. */
export const FIXED_SECTION_TYPES: ReadonlySet<SectionType> = new Set(["hero", "contact"]);
