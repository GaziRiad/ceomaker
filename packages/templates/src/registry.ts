import {
  latestTemplateVersion,
  resolveTemplateRef,
  resolveTemplateVersion,
  TEMPLATE_KEYS,
  type TemplateKey,
  type TemplateRef,
  type TemplateVersionOf,
} from "@ceomaker/schema";
import { HarbourTemplate as HarbourV1 } from "./harbour/v1";
import { MeridianTemplate as MeridianV1 } from "./meridian/v1";
import { MonumentTemplate as MonumentV1 } from "./monument/v1";
import { FolioTemplate as FolioV1 } from "./folio/v1";
import { SalonTemplate as SalonV1 } from "./salon/v1";
import { TempoTemplate as TempoV1 } from "./tempo/v1";
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
  focusSection: false,
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
        "A serif masthead on white with a monogram seal and a private contact form. Quiet and classic: your record speaks for itself.",
      tagline:
        "A serif masthead on white with a monogram seal. Quiet and classic: your record speaks for itself.",
      contactForm: true,
      shows: { ...NONE, focusSection: true },
      Component: MeridianV1,
    },
  },
  harbour: {
    1: {
      name: "Harbour",
      description:
        "A warm greeting and a large arched portrait on soft white. For people who want to come across as personal and easy to reach.",
      tagline:
        "A warm greeting and a large arched portrait on soft white. For people who want to come across as personal and easy to reach.",
      contactForm: true,
      shows: {
        gallery: true,
        quotePhotos: true,
        photoGrade: true,
        cta: true,
        focal: true,
        aboutImage: true,
        workImages: true,
        focusSection: true,
      },
      Component: HarbourV1,
    },
  },
  monument: {
    1: {
      name: "Monument",
      description:
        "Your name stacked edge to edge on a full field of colour, then bold alternating sections. For people who want to be remembered.",
      tagline: "Your name on a full field of colour. For people who want to be remembered.",
      contactForm: true,
      shows: { ...NONE, aboutImage: true, workImages: true, photoGrade: true, focusSection: true },
      Component: MonumentV1,
    },
  },
  salon: {
    1: {
      name: "Salon",
      description:
        "Your name in a large serif, hung salon-style among your own photographs, on a gallery ground. For people whose work is seen as much as read.",
      tagline:
        "Your name in a large serif, hung salon-style among your own photographs. For people whose work is seen as much as read.",
      contactForm: true,
      shows: {
        gallery: true,
        quotePhotos: true,
        photoGrade: true,
        cta: true,
        focal: true,
        aboutImage: true,
        workImages: true,
        focusSection: true,
      },
      Component: SalonV1,
    },
  },
  folio: {
    1: {
      name: "Folio",
      description:
        "Your work as large projects people can swipe through, with a clear story around them. For careers best told as projects.",
      tagline:
        "Your work as large projects people can swipe through. For careers best told as projects.",
      contactForm: true,
      shows: {
        gallery: true,
        quotePhotos: true,
        photoGrade: true,
        cta: true,
        focal: true,
        aboutImage: true,
        workImages: true,
        focusSection: true,
      },
      Component: FolioV1,
    },
  },
  tempo: {
    1: {
      name: "Tempo",
      description:
        "Big moving type on clean white. Your name parts around your portrait and every section arrives in time with the scroll.",
      tagline: "Big moving type on clean white. Your name parts around your portrait.",
      contactForm: true,
      shows: {
        gallery: true,
        quotePhotos: true,
        photoGrade: true,
        cta: true,
        focal: true,
        aboutImage: true,
        workImages: true,
        focusSection: true,
      },
      Component: TempoV1,
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
