import {
  latestTemplateVersion,
  resolveTemplateRef,
  resolveTemplateVersion,
  TEMPLATE_KEYS,
  type TemplateKey,
  type TemplateRef,
  type TemplateVersionOf,
} from "@ceomaker/schema";
import { MeridianTemplate as MeridianV1 } from "./meridian/v1";
import { MonumentTemplate as MonumentV1 } from "./monument/v1";
import { SalonTemplate as SalonV1 } from "./salon/v1";
import type { TemplateDefinition } from "./types";

type Design = Omit<TemplateDefinition, "key" | "version">;

const NONE: Design["shows"] = {
  gallery: false,
  quotePhotos: false,
  photoGrade: false,
  cta: false,
  focal: false,
  aboutImage: false,
  workImages: false,
};

/**
 * Every design of every template. Each listed version of TEMPLATE_VERSIONS must have one here;
 * the type enforces it. Shipped designs are frozen (src/<key>/v<N>): fix bugs in them, but
 * redesign by adding a version, so live sites keep their look until their owner publishes.
 */
const designs: { [K in TemplateKey]: Record<TemplateVersionOf<K>, Design> } = {
  meridian: {
    1: {
      name: "Meridian",
      description:
        "A serif masthead on white with a monogram seal and a private contact form. For chief executives and chairs.",
      tagline: "A serif masthead on white with a monogram seal. For chief executives and chairs.",
      contactForm: true,
      shows: NONE,
      Component: MeridianV1,
    },
  },
  monument: {
    1: {
      name: "Monument",
      description:
        "Your name stacked edge to edge on a full field of colour, then bold alternating sections. For leaders who want to be remembered.",
      tagline: "Your name on a full field of colour. For leaders who want to be remembered.",
      contactForm: true,
      shows: { ...NONE, aboutImage: true, workImages: true },
      Component: MonumentV1,
    },
  },
  salon: {
    1: {
      name: "Salon",
      description:
        "Your name in a large serif, hung salon-style among your own photographs, on a gallery ground. For leaders whose work is seen as much as read.",
      tagline:
        "Your name in a large serif, hung salon-style among your own photographs. For leaders whose work is seen as much as read.",
      contactForm: true,
      shows: {
        gallery: true,
        quotePhotos: true,
        photoGrade: true,
        cta: true,
        focal: true,
        aboutImage: true,
        workImages: true,
      },
      Component: SalonV1,
    },
  },
};

/**
 * The design a stored key and version render with. Retired keys map to a fixed design; an
 * unknown or missing version gets the oldest design we have, never the newest.
 */
export function getTemplate(key: unknown, version: unknown): TemplateDefinition {
  const ref = resolveTemplateRef(key, version);
  const design = (designs[ref.key] as Record<number, Design>)[ref.version]!;
  return { key: ref.key, version: ref.version, ...design };
}

/** The newest design of a template: what a fresh choice of template starts on. */
export function latestTemplate(key: TemplateKey): TemplateDefinition {
  return getTemplate(key, latestTemplateVersion(key));
}

/** The newest design of each template, for choosing one. */
export const templateList: TemplateDefinition[] = TEMPLATE_KEYS.map(latestTemplate);

/** A newer design of the same template, when there is one. */
export function newerDesign(key: unknown, version: unknown): TemplateDefinition | null {
  const current = getTemplate(key, version);
  const latest = latestTemplate(current.key);
  return latest.version > current.version ? latest : null;
}

/**
 * The design someone gets when they pick a template: the one the site already uses (pass the
 * live version first, then the draft), so switching away and back changes nothing; otherwise
 * the newest. Moving to a newer design of the same template is a separate, explicit step.
 */
export function designOnChoosing(
  key: TemplateKey,
  current: readonly (TemplateRef | null | undefined)[],
): number {
  const kept = current.find((ref) => ref?.key === key);
  return kept ? resolveTemplateVersion(key, kept.version) : latestTemplateVersion(key);
}
