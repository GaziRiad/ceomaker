import {
  latestTemplateVersion,
  resolveTemplateRef,
  resolveTemplateVersion,
  TEMPLATE_KEYS,
  type TemplateKey,
  type TemplateRef,
  type TemplateVersionOf,
} from "@ceomaker/schema";
import { AuroraTemplate as AuroraV1 } from "./aurora/v1";
import { BentoTemplate as BentoV1 } from "./bento/v1";
import { ChronicleTemplate as ChronicleV1 } from "./chronicle/v1";
import { MeridianTemplate as MeridianV1 } from "./meridian/v1";
import { MonumentTemplate as MonumentV1 } from "./monument/v1";
import { ObsidianTemplate as ObsidianV1 } from "./obsidian/v1";
import type { TemplateDefinition } from "./types";

type Design = Omit<TemplateDefinition, "key" | "version">;

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
      Component: MeridianV1,
    },
  },
  aurora: {
    1: {
      name: "Aurora",
      description:
        "Soft light, rounded cards and a floating profile. For founders and tech leaders.",
      tagline: "Soft light, rounded cards, a floating profile. For founders.",
      contactForm: false,
      Component: AuroraV1,
    },
  },
  obsidian: {
    1: {
      name: "Obsidian",
      description: "Black and champagne, a framed portrait. For investors and private enquiries.",
      tagline: "Black and champagne, a framed portrait. For investors.",
      contactForm: false,
      Component: ObsidianV1,
    },
  },
  monument: {
    1: {
      name: "Monument",
      description: "Your name as the headline, in cobalt. For operators who want to be remembered.",
      tagline: "Your name as the headline, in cobalt. For operators.",
      contactForm: false,
      Component: MonumentV1,
    },
  },
  bento: {
    1: {
      name: "Bento",
      description: "The whole profile in a single grid of cards. Scans in seconds.",
      tagline: "The whole profile in one grid of cards. Scans in seconds.",
      contactForm: false,
      Component: BentoV1,
    },
  },
  chronicle: {
    1: {
      name: "Chronicle",
      description: "A warm, long-form letter with a timeline. For writers, advisors and speakers.",
      tagline: "A warm, long-form letter with a timeline. For advisors and writers.",
      contactForm: false,
      Component: ChronicleV1,
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
