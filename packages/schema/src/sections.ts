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

export const heroSection = z.object({
  ...base,
  type: z.literal("hero"),
  eyebrow: text(60).optional(),
  headline: requiredText(120),
  subheadline: longText(280).optional(),
  primaryCta: callToAction.optional(),
  image: imageRef.optional(),
});

export const aboutSection = z.object({
  ...base,
  type: z.literal("about"),
  heading: requiredText(80),
  body: richText,
  image: imageRef.optional(),
});

export const experienceItem = z.object({
  role: requiredText(100),
  organization: requiredText(100),
  location: text(80).optional(),
  start: requiredText(20),
  end: text(20).optional(),
  summary: longText(500).optional(),
});

export const experienceSection = z.object({
  ...base,
  type: z.literal("experience"),
  heading: requiredText(80),
  items: z.array(experienceItem).min(1).max(20),
});

export const achievementItem = z.object({
  value: requiredText(20),
  label: requiredText(80),
});

export const achievementsSection = z.object({
  ...base,
  type: z.literal("achievements"),
  heading: requiredText(80),
  items: z.array(achievementItem).min(1).max(8),
});

export const portfolioItem = z.object({
  title: requiredText(100),
  description: longText(300).optional(),
  href: safeLinkUrl.optional(),
  image: imageRef.optional(),
});

export const portfolioSection = z.object({
  ...base,
  type: z.literal("portfolio"),
  heading: requiredText(80),
  items: z.array(portfolioItem).min(1).max(12),
});

export const testimonialItem = z.object({
  quote: requiredText(500),
  author: requiredText(80),
  role: text(100).optional(),
});

export const testimonialsSection = z.object({
  ...base,
  type: z.literal("testimonials"),
  heading: requiredText(80),
  items: z.array(testimonialItem).min(1).max(10),
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

export const socialLink = z.object({
  kind: z.enum(SOCIAL_KINDS),
  href: safeLinkUrl,
  label: text(40).optional(),
});

export const contactSection = z.object({
  ...base,
  type: z.literal("contact"),
  heading: requiredText(80),
  blurb: longText(280).optional(),
  email: z.email().max(254).optional(),
  links: z.array(socialLink).max(10).default([]),
});

export const ctaSection = z.object({
  ...base,
  type: z.literal("cta"),
  headline: requiredText(120),
  body: longText(280).optional(),
  button: callToAction,
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
