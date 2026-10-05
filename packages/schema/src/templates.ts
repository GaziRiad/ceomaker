import { z } from "zod";

/** Template keys are part of the contract: stored on sites and versions, implemented in @ceomaker/templates. */
/** In the order templates are offered: the free ones first. */
export const TEMPLATE_KEYS = [
  "meridian",
  "harbour",
  "monument",
  "salon",
  "folio",
  "tempo",
] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const DEFAULT_TEMPLATE_KEY: TemplateKey = "meridian";

/**
 * The designs of each template, oldest first. A design is frozen once it ships: every saved
 * version records the design it used and keeps showing it, so a redesign reaches a live site
 * only when its owner publishes it. Redesign a template by adding a version here (and in
 * @ceomaker/templates); never by changing the look of one that's already listed.
 */
export const TEMPLATE_VERSIONS = {
  meridian: [1],
  harbour: [1],
  monument: [1],
  salon: [1],
  folio: [1],
  tempo: [1],
} as const satisfies Record<TemplateKey, readonly [number, ...number[]]>;

export type TemplateVersionOf<K extends TemplateKey> = (typeof TEMPLATE_VERSIONS)[K][number];

/** One design of one template. */
export interface TemplateRef {
  key: TemplateKey;
  version: number;
}

function versionsOf(key: TemplateKey): readonly [number, ...number[]] {
  return TEMPLATE_VERSIONS[key];
}

/** The newest design of a template: what new sites and fresh template choices start on. */
export function latestTemplateVersion(key: TemplateKey): number {
  const versions = versionsOf(key);
  return versions[versions.length - 1]!;
}

export function isTemplateVersion(key: TemplateKey, version: unknown): version is number {
  return typeof version === "number" && versionsOf(key).includes(version);
}

/**
 * The design to render for a stored version number: that one while we have it, otherwise the
 * oldest we still have. Never the newest, so a bad or missing value can't redesign a live site.
 */
export function resolveTemplateVersion(key: TemplateKey, version: unknown): number {
  return isTemplateVersion(key, version) ? version : versionsOf(key)[0];
}

/**
 * Retired keys still stored on older sites and versions, each mapped to one fixed design.
 * Aurora, Obsidian, Bento and Chronicle were removed before launch, when only test accounts used
 * them; their sites show Meridian.
 */
const TEMPLATE_KEY_ALIASES: Record<string, TemplateRef> = {
  executive: { key: "meridian", version: 1 },
  aurora: { key: "meridian", version: 1 },
  obsidian: { key: "meridian", version: 1 },
  bento: { key: "meridian", version: 1 },
  chronicle: { key: "meridian", version: 1 },
};

/** Resolves a stored key, including retired aliases. Null for keys we have never shipped. */
export function normalizeTemplateKey(value: unknown): TemplateKey | null {
  if (typeof value !== "string") return null;
  const key = TEMPLATE_KEY_ALIASES[value]?.key ?? value;
  return (TEMPLATE_KEYS as readonly string[]).includes(key) ? (key as TemplateKey) : null;
}

/**
 * The design a stored key and version number render with. Retired keys map to their fixed
 * design; unknown keys fall back to the default template's oldest design.
 */
export function resolveTemplateRef(key: unknown, version: unknown): TemplateRef {
  const alias = typeof key === "string" ? TEMPLATE_KEY_ALIASES[key] : undefined;
  if (alias) return alias;
  const known = normalizeTemplateKey(key);
  if (known) return { key: known, version: resolveTemplateVersion(known, version) };
  return {
    key: DEFAULT_TEMPLATE_KEY,
    version: resolveTemplateVersion(DEFAULT_TEMPLATE_KEY, undefined),
  };
}

export const templateKeySchema = z.preprocess(
  (value) => normalizeTemplateKey(value) ?? value,
  z.enum(TEMPLATE_KEYS),
);
