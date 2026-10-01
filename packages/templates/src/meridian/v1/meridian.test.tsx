import {
  contrastRatio,
  demoSiteContent,
  parseSiteContentForRender,
  templatePalettes,
  type RenderableSiteContent,
  type SectionInput,
  type SiteColors,
} from "@ceomaker/schema";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TemplateView } from "../../site-renderer";
import { longestWord, meridianRoles, mixHex, RING_CIRCUMFERENCE, ringText } from "./measure";

const publishedAt = new Date("2026-06-01T00:00:00Z");
const presets = templatePalettes("meridian", 1);
const navy = presets[0]!.colors;

function render(content: unknown) {
  return renderToStaticMarkup(
    <TemplateView
      templateKey="meridian"
      templateVersion={1}
      colors={navy}
      content={parseSiteContentForRender(content)}
      publishedAt={publishedAt}
    />,
  );
}

type Contact = Extract<SectionInput, { type: "contact" }>;

function withContact(patch: Partial<Contact>) {
  return {
    ...demoSiteContent,
    sections: demoSiteContent.sections.map((section) =>
      section.type === "contact" ? { ...section, ...patch } : section,
    ),
  };
}

function rolesHold(colors: SiteColors) {
  const roles = meridianRoles(colors);
  const secondary = mixHex(colors.ink, colors.bg, roles.secondary / 100);
  const field = mixHex(colors.ink, colors.bg, roles.field / 100);
  const accentText = mixHex(colors.accent, colors.ink, roles.accentText / 100);
  const on = roles.onAccent === "bg" ? colors.bg : colors.ink;
  return {
    secondary: contrastRatio(secondary, colors.bg),
    field: contrastRatio(field, colors.bg),
    accentText: contrastRatio(accentText, colors.bg),
    onAccent: contrastRatio(on, colors.accent),
  };
}

describe("Meridian colour roles", () => {
  it.each(presets.map((preset) => [preset.name, preset.colors] as const))(
    "%s keeps small text and field borders readable",
    (_, colors) => {
      const ratios = rolesHold(colors);
      expect(ratios.secondary).toBeGreaterThanOrEqual(4.5);
      expect(ratios.accentText).toBeGreaterThanOrEqual(4.5);
      expect(ratios.field).toBeGreaterThanOrEqual(3);
      expect(ratios.onAccent).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("mixes the accent toward the text only when it's too light to read", () => {
    expect(meridianRoles(navy).accentText).toBe(100);
    const pale = { bg: "#ffffff", ink: "#111111", accent: "#9ec5ff" };
    expect(meridianRoles(pale).accentText).toBeLessThan(100);
    expect(rolesHold(pale).accentText).toBeGreaterThanOrEqual(4.5);
    expect(meridianRoles(pale).onAccent).toBe("ink");
  });
});

describe("Meridian measures", () => {
  it("sizes the name by its longest word, counting capitals, CJK and hyphens", () => {
    expect(longestWord("Amelia Hart")).toBe(6.25);
    expect(longestWord("Al Li")).toBe(4);
    expect(longestWord("林佳慧")).toBeCloseTo(5.7);
    // Breaks after the hyphen, so the longer half decides.
    expect(longestWord("Constantinopolous-Wetherington")).toBe(longestWord("Constantinopolous-"));
  });

  it("repeats the ring text to go once round, and shrinks a name that can't fit", () => {
    const short = ringText("Amelia Hart", "Rotterdam", 12.5)!;
    expect(short.text.startsWith("AMELIA HART · ROTTERDAM · ")).toBe(true);
    expect(short.text.split("AMELIA").length - 1).toBeGreaterThan(1);
    expect(short.fontSize).toBe(12.5);
    const long = ringText(
      "Maximiliana Constantinopolous-Wetherington von Hohenzollern-Sigmaringen",
      "Hamburg",
      19,
    )!;
    expect(long.fontSize).toBeLessThan(19);
    expect(long.fontSize * 30).toBeLessThan(RING_CIRCUMFERENCE);
    expect(ringText("", "Rotterdam", 12.5)).toBeNull();
  });
});

describe("Meridian template", () => {
  it("sets the name as the heading and the headline as the statement", () => {
    const html = render(demoSiteContent);
    expect(html).toMatch(/<h1[^>]*class="mer-name[^"]*"[^>]*>Amelia Hart<\/h1>/);
    expect(html).toContain("Building supply chains that hold up under pressure.");
    expect(html).toContain("AMELIA HART");
  });

  it("shows the form with its topics, beside the email and links", () => {
    const html = render(demoSiteContent);
    expect(html).toContain('aria-label="Contact form"');
    expect(html).toContain("What is it about?");
    expect(html).toContain("Board and advisory");
    expect(html).toContain('name="website"');
    expect(html).toContain("data-split");
    expect(html).toContain("Sent privately to Amelia.");
  });

  it("drops the form when it's off, and the email takes the space", () => {
    const html = render(withContact({ form: { enabled: false, topics: [] } }));
    expect(html).not.toContain('aria-label="Contact form"');
    expect(html).not.toContain("data-split");
    expect(html).toContain('class="mer-email" data-large="true"');
  });

  it("hides the topic question without topics, and keeps the form for older content", () => {
    const html = render(withContact({ form: undefined }));
    expect(html).toContain('aria-label="Contact form"');
    expect(html).not.toContain("What is it about?");
  });

  it("makes the email the headline when there's no invitation", () => {
    const html = render(withContact({ blurb: undefined }));
    expect(html).toContain('class="mer-email-headline"');
  });

  it("labels the button Contact when there's no call to action", () => {
    const sections = demoSiteContent.sections.map((section) =>
      section.type === "hero" ? { ...section, primaryCta: undefined } : section,
    );
    const html = render({ ...demoSiteContent, sections });
    expect(html).toMatch(
      /<a href="#contact" class="mer-button">Contact<span aria-hidden="true">→<\/span><\/a>/,
    );
  });

  it("lays out figures by count", () => {
    const withStats = (count: number) =>
      render({
        ...demoSiteContent,
        sections: demoSiteContent.sections.map((section) =>
          section.type === "achievements"
            ? {
                ...section,
                items: Array.from({ length: count }, (_, index) => ({
                  value: String(index + 1),
                  label: `Figure ${index + 1}`,
                })),
              }
            : section,
        ),
      });
    expect(withStats(1)).toContain('data-one="true" style="--mer-cols:1"');
    expect(withStats(3)).toContain('style="--mer-cols:3"');
    expect(withStats(6)).toContain('style="--mer-cols:3"');
    expect(withStats(8)).toContain('style="--mer-cols:4"');
  });

  it("drops the nav link of an empty section", () => {
    const sections = demoSiteContent.sections.map((section) =>
      section.type === "portfolio" ? { ...section, items: [] } : section,
    );
    const html = render({ ...demoSiteContent, sections });
    expect(html).not.toContain('href="#work"');
    expect(html).toContain('href="#experience"');
  });

  it("previews only the person's answers, with grey lines for the rest", () => {
    // Built directly, like the questions screen: a draft is never validated or stored.
    const content: RenderableSiteContent = {
      meta: { name: "Sofia Brandt", affiliations: [], keywords: [] },
      sections: [
        {
          id: "hero",
          type: "hero",
          visible: true,
          eyebrow: "Chief executive, Kestrel Energy",
          headline: "",
        },
        {
          id: "contact",
          type: "contact",
          visible: true,
          links: [],
          form: { enabled: true, topics: ["Board and advisory", "Something else"] },
        },
      ],
      droppedSections: 0,
    };
    const html = renderToStaticMarkup(
      <TemplateView
        templateKey="meridian"
        templateVersion={1}
        colors={navy}
        content={content}
        publishedAt={publishedAt}
        draft
      />,
    );
    expect(html).toContain("Sofia Brandt");
    expect(html).toContain("Chief executive, Kestrel Energy");
    expect(html).toContain("mer-ph-statement");
    expect(html).toContain("mer-ph-about");
    expect(html).toContain("mer-ph-invitation");
    expect(html).toContain('data-alone="true"');
    expect(html).toContain("Board and advisory");
    expect(html).not.toContain("Amelia");
  });
});
