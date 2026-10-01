import { z } from "zod";

/** Template keys are part of the contract: stored on sites and versions, implemented in @ceomaker/templates. */
export const TEMPLATE_KEYS = [
  "meridian",
  "aurora",
  "obsidian",
  "monument",
  "bento",
  "chronicle",
] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const DEFAULT_TEMPLATE_KEY: TemplateKey = "meridian";

/** Retired keys still stored on older sites and versions, mapped to their replacement. */
const TEMPLATE_KEY_ALIASES: Record<string, TemplateKey> = {
  executive: "meridian",
};

/** Resolves a stored key, including retired aliases. Null for keys we have never shipped. */
export function normalizeTemplateKey(value: unknown): TemplateKey | null {
  if (typeof value !== "string") return null;
  const key = TEMPLATE_KEY_ALIASES[value] ?? value;
  return (TEMPLATE_KEYS as readonly string[]).includes(key) ? (key as TemplateKey) : null;
}

export const templateKeySchema = z.preprocess(
  (value) => normalizeTemplateKey(value) ?? value,
  z.enum(TEMPLATE_KEYS),
);
