import type { SiteContentInput } from "../site";

function clean(value: string, max: number): string {
  // Strip control characters and collapse whitespace so any account name fits the schema.
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, max).trim() || "Your Name";
}

/** Placeholder content for a newly claimed site, until onboarding generates the real thing. */
export function createStarterSiteContent(name: string) {
  const displayName = clean(name, 60);
  return {
    schemaVersion: 1,
    meta: { name: displayName, title: displayName },
    sections: [
      {
        id: "hero",
        type: "hero",
        eyebrow: "Your role, your organization",
        headline: displayName,
        subheadline: "A one-line summary of what you lead and what you are known for.",
        primaryCta: { label: "Get in touch", href: "#contact" },
      },
      {
        id: "about",
        type: "about",
        heading: "About",
        body: [{ spans: [{ text: "A short introduction in your own voice." }] }],
      },
      {
        id: "contact",
        type: "contact",
        heading: "Contact",
        blurb: "For speaking, board and advisory enquiries.",
        links: [],
      },
    ],
  } satisfies SiteContentInput;
}
