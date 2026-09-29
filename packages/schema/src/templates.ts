import { z } from "zod";

/** Template keys are part of the contract: stored on sites and versions, implemented in @ceomaker/templates. */
export const TEMPLATE_KEYS = ["executive"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];
export const templateKeySchema = z.enum(TEMPLATE_KEYS);
