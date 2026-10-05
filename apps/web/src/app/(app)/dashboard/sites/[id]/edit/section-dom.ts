import type { Section } from "@ceomaker/schema";

/** In-page anchors the templates give each middle section and the contact section. */
const ANCHOR: Partial<Record<Section["type"], string>> = {
  about: "about",
  achievements: "impact",
  focus: "focus",
  experience: "experience",
  portfolio: "work",
  testimonials: "testimonials",
  contact: "contact",
};

/**
 * A section's element in the editor's preview: its anchor, else the section around its first
 * editable text (the hero has no anchor). Templates aren't changed for this: they're frozen.
 */
export function sectionElement(root: HTMLElement, section: Section): HTMLElement | null {
  const anchor = ANCHOR[section.type];
  const byAnchor = anchor ? root.querySelector<HTMLElement>(`#${anchor}`) : null;
  if (byAnchor) return byAnchor;
  const field = root.querySelector(`[data-field^="${CSS.escape(section.id)}."]`);
  return field?.closest<HTMLElement>("section") ?? null;
}

/** The id of the visible section that contains an element of the preview. */
export function sectionIdAt(
  root: HTMLElement,
  sections: Section[],
  target: Element,
): string | null {
  for (const section of sections) {
    if (!section.visible) continue;
    if (sectionElement(root, section)?.contains(target)) return section.id;
  }
  return null;
}
