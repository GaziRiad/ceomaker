import {
  demoSiteContent,
  emptyThemeSettings,
  parseSiteContentForRender,
  TEMPLATE_KEYS,
  type RenderableSiteContent,
  type SiteContentInput,
  type TemplateKey,
} from "@ceomaker/schema";

// The sample sites at /templates/<key>: Amelia Hart, the fictional executive of the demo
// fixture, as a Pro site would show her (contact form on, no badge). Focus and the closing
// invitation are added here so the templates that show them aren't missing a part.

const focus = {
  id: "focus",
  type: "focus",
  heading: "Current focus",
  items: [
    {
      title: "Resilient freight networks",
      description: "Planning that keeps goods moving when routes, demand and costs shift.",
    },
    {
      title: "Practical AI in operations",
      description: "Where it already helps depots and planners, and where it doesn't yet.",
    },
    {
      title: "Board and advisory work",
      description: "Logistics and industrial technology companies preparing to scale.",
    },
  ],
} satisfies SiteContentInput["sections"][number];

const cta = {
  id: "cta",
  type: "cta",
  headline: "Planning a board, keynote or advisory conversation?",
  body: "I take on a small number of board and speaking commitments each year.",
  button: { label: "Get in touch", href: "#contact" },
} satisfies SiteContentInput["sections"][number];

export const SAMPLE_CONTENT: RenderableSiteContent = parseSiteContentForRender({
  ...demoSiteContent,
  sections: demoSiteContent.sections.flatMap((section): SiteContentInput["sections"] =>
    section.type === "experience"
      ? [focus, section]
      : section.type === "contact"
        ? [cta, section]
        : [section],
  ),
});

export const SAMPLE_THEME = emptyThemeSettings;

/** Shown where a template prints a date (the footer's year). */
export const SAMPLE_DATE = new Date("2026-01-01T00:00:00Z");

/** A template key from a URL: only current keys, not retired aliases. */
export function sampleTemplateKey(value: string): TemplateKey | null {
  return (TEMPLATE_KEYS as readonly string[]).includes(value) ? (value as TemplateKey) : null;
}

export function sampleSitePath(key: TemplateKey): string {
  return `/templates/${key}`;
}
