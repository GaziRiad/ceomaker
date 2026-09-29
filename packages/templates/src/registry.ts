import { SECTION_TYPES, type TemplateKey } from "@ceomaker/schema";
import { ExecutiveTemplate } from "./executive";
import type { TemplateDefinition } from "./types";

/** Every key in TEMPLATE_KEYS must have an implementation; the type enforces it. */
export const templates: Record<TemplateKey, TemplateDefinition> = {
  executive: {
    key: "executive",
    name: "Executive",
    description:
      "Editorial and restrained. Serif headlines, generous whitespace, one strong accent.",
    supportedSections: SECTION_TYPES,
    Component: ExecutiveTemplate,
  },
};

/** Unknown keys (e.g. a template retired after publishing) fall back to Executive. */
export function getTemplate(key: string): TemplateDefinition {
  return (templates as Record<string, TemplateDefinition | undefined>)[key] ?? templates.executive;
}
