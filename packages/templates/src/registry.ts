import { DEFAULT_TEMPLATE_KEY, normalizeTemplateKey, type TemplateKey } from "@ceomaker/schema";
import { AuroraTemplate } from "./aurora";
import { BentoTemplate } from "./bento";
import { ChronicleTemplate } from "./chronicle";
import { MeridianTemplate } from "./meridian";
import { MonumentTemplate } from "./monument";
import { ObsidianTemplate } from "./obsidian";
import type { TemplateDefinition } from "./types";

/** Every key in TEMPLATE_KEYS must have an implementation; the type enforces it. */
export const templates: Record<TemplateKey, TemplateDefinition> = {
  meridian: {
    key: "meridian",
    name: "Meridian",
    description:
      "Editorial ivory, a serif voice and numbered sections. For chief executives and chairs.",
    tagline: "Editorial ivory and a serif voice. For chief executives and chairs.",
    Component: MeridianTemplate,
  },
  aurora: {
    key: "aurora",
    name: "Aurora",
    description: "Soft light, rounded cards and a floating profile. For founders and tech leaders.",
    tagline: "Soft light, rounded cards, a floating profile. For founders.",
    Component: AuroraTemplate,
  },
  obsidian: {
    key: "obsidian",
    name: "Obsidian",
    description: "Black and champagne, a framed portrait. For investors and private enquiries.",
    tagline: "Black and champagne, a framed portrait. For investors.",
    Component: ObsidianTemplate,
  },
  monument: {
    key: "monument",
    name: "Monument",
    description: "Your name as the headline, in cobalt. For operators who want to be remembered.",
    tagline: "Your name as the headline, in cobalt. For operators.",
    Component: MonumentTemplate,
  },
  bento: {
    key: "bento",
    name: "Bento",
    description: "The whole profile in a single grid of cards. Scans in seconds.",
    tagline: "The whole profile in one grid of cards. Scans in seconds.",
    Component: BentoTemplate,
  },
  chronicle: {
    key: "chronicle",
    name: "Chronicle",
    description: "A warm, long-form letter with a timeline. For writers, advisors and speakers.",
    tagline: "A warm, long-form letter with a timeline. For advisors and writers.",
    Component: ChronicleTemplate,
  },
};

export const templateList: TemplateDefinition[] = Object.values(templates);

/** Retired keys map to their successor; unknown keys fall back to Meridian. */
export function getTemplate(key: string): TemplateDefinition {
  return templates[normalizeTemplateKey(key) ?? DEFAULT_TEMPLATE_KEY];
}
