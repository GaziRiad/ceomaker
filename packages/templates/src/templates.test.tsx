import {
  buildStarterContent,
  defaultColors,
  demoSiteContent,
  onboardingAnswersSchema,
  parseSiteContentForRender,
  TEMPLATE_KEYS,
  type RenderableSiteContent,
  type SectionInput,
  type SiteContentInput,
} from "@ceomaker/schema";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildSiteModel } from "./model";
import { getTemplate } from "./registry";
import { SiteRenderer, TemplateView } from "./site-renderer";

const publishedAt = new Date("2026-06-01T00:00:00Z");

function render(key: (typeof TEMPLATE_KEYS)[number], content: unknown) {
  return renderToStaticMarkup(
    <TemplateView
      templateKey={key}
      colors={defaultColors(key)}
      content={parseSiteContentForRender(content)}
      publishedAt={publishedAt}
    />,
  );
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
};
const VOID_TAGS = new Set(["br", "img", "hr", "input", "meta", "link"]);

/**
 * The text of every element marked data-field in static markup, read the way the editor reads
 * it: aria-hidden decorations inside the element don't count.
 */
function fieldTexts(html: string): [string, string][] {
  const found: [string, string][] = [];
  const open: { field: string | null; hidden: boolean; text: string }[] = [];
  const tokens =
    /<!--.*?-->|<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*(\/?)>|([^<]+)/g;
  for (const [, closing, tag = "", attrs = "", selfClosing, text] of html.matchAll(tokens)) {
    if (text !== undefined) {
      const decoded = text.replace(/&(?:amp|lt|gt|quot|#x27);/g, (entity) => ENTITIES[entity]!);
      open.forEach((frame, index) => {
        if (frame.field && !open.slice(index + 1).some((inner) => inner.hidden)) {
          frame.text += decoded;
        }
      });
    } else if (closing) {
      const frame = open.pop()!;
      if (frame.field) found.push([frame.field, frame.text]);
    } else if (tag && !selfClosing && !VOID_TAGS.has(tag.toLowerCase())) {
      open.push({
        field: /\sdata-field="([^"]*)"/.exec(attrs)?.[1] ?? null,
        hidden: /\saria-hidden="true"/.test(attrs),
        text: "",
      });
    }
  }
  return found;
}

/** What a field path points at in the content, as the editor would write it. */
function contentText(content: RenderableSiteContent, path: string): string {
  const [head = "", ...rest] = path.split(".");
  let value: unknown =
    head === "meta" ? content.meta : content.sections.find((section) => section.id === head);
  if (path === "meta.availabilityShort") {
    return content.meta?.availabilityShort || content.meta?.availability || "";
  }
  for (const key of rest) value = (value as Record<string, unknown>)[key];
  if (value && typeof value === "object" && "spans" in value) {
    return (value as { spans: { text: string }[] }).spans.map((span) => span.text).join("");
  }
  return String(value);
}

const starter = buildStarterContent(
  onboardingAnswersSchema.parse({
    role: "Founder",
    industry: "Technology",
    goals: ["A credible first result on Google"],
    name: "Sam",
  }),
);

function withSections(sections: SectionInput[]): SiteContentInput {
  return { ...demoSiteContent, sections };
}

const demoSections: SectionInput[] = demoSiteContent.sections;
const demoHero = demoSections[0] as Extract<SectionInput, { type: "hero" }>;
const demoRest = demoSections.slice(1);

describe.each(TEMPLATE_KEYS)("%s template", (key) => {
  it("renders the full demo site", () => {
    const html = render(key, demoSiteContent);
    expect(html).toContain("Amelia Hart");
    expect(html).toContain("Building supply chains that hold up under pressure.");
    expect(html).toContain("Chief Operating Officer");
    expect(html).toContain("Resilient networks for a volatile decade");
    expect(html).toContain('href="mailto:office@example.com"');
    expect(html).toContain('id="contact"');
    expect(html).toContain('<nav aria-label="Sections"');
    expect(html).toContain('href="#main"');
    expect(html).toContain("© 2026 Amelia Hart");
  });

  it("opens contact links in a new tab with rel=me and no opener", () => {
    const html = render(key, demoSiteContent);
    expect(html).toMatch(/href="https:\/\/www\.linkedin\.com\/" target="_blank" rel="noopener me"/);
  });

  it("renders a minimal starter site without empty sections", () => {
    const html = render(key, starter);
    expect(html).toContain("Sam");
    expect(html).not.toContain('id="impact"');
    expect(html).not.toContain('id="experience"');
    expect(html).not.toContain('id="testimonials"');
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("<img");
  });

  it("shows an uploaded portrait instead of the initials placeholder", () => {
    const html = render(
      key,
      withSections([
        { ...demoHero, image: { src: "/media/0b546125-b657-4ed2-b39f-846f38c86be4", alt: "" } },
        ...demoRest,
      ]),
    );
    expect(html).toContain('src="/media/0b546125-b657-4ed2-b39f-846f38c86be4"');
    expect(html).toContain('alt="Amelia Hart"');
  });

  it("escapes markup in content", () => {
    const html = render(
      key,
      withSections([{ ...demoHero, headline: "<script>alert(1)</script>" }, ...demoRest]),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("marks each editable text with the content field it shows, in the editor only", () => {
    const content = parseSiteContentForRender(demoSiteContent);
    const html = renderToStaticMarkup(
      <TemplateView
        templateKey={key}
        colors={defaultColors(key)}
        content={content}
        publishedAt={publishedAt}
        editable
      />,
    );
    const fields = fieldTexts(html);
    for (const [path, text] of fields) {
      expect({ path, text }).toEqual({ path, text: contentText(content, path) });
    }
    expect(fields.map(([path]) => path)).toEqual(
      expect.arrayContaining(["hero.headline", "about.body.0", "contact.blurb"]),
    );
    expect(fields.length).toBeGreaterThan(20);
    expect(render(key, demoSiteContent)).not.toContain("data-field");
  });

  it("copes with a very long name", () => {
    const html = render(key, {
      ...demoSiteContent,
      meta: { ...demoSiteContent.meta, name: "Maximiliana Constantinopolous-Wetherington" },
    });
    expect(html).toContain("Maximiliana");
  });
});

describe("site model", () => {
  it("follows the order the user arranged and skips hidden sections", () => {
    const byId = (id: string) => demoSections.find((section) => section.id === id)!;
    const model = buildSiteModel(
      parseSiteContentForRender(
        withSections([
          byId("hero"),
          byId("experience"),
          { ...byId("about"), visible: false },
          byId("impact"),
          byId("work"),
          byId("testimonials"),
          byId("contact"),
        ]),
      ),
    );
    expect(model.order).toEqual(["experience", "impact", "work", "testimonials"]);
    expect(model.about).toBeNull();
  });

  it("derives names, dates and labels", () => {
    const model = buildSiteModel(parseSiteContentForRender(demoSiteContent));
    expect([model.first, model.last, model.initials]).toEqual(["Amelia", "Hart", "AH"]);
    expect(model.experience[0]).toMatchObject({
      dates: "2019 – Present",
      startYear: "2019",
      orgInitials: "MF",
    });
    expect(model.pullQuote?.attribution).toBe("Jonas Weber, Chair, Meridian Freight Group");
    expect(model.contact.links.map((link) => link.label)).toEqual([
      "LinkedIn",
      "Meridian Freight Group",
    ]);
  });
});

describe("site renderer", () => {
  it("renders retired template keys and bad colours with safe defaults", () => {
    const html = renderToStaticMarkup(
      <SiteRenderer
        templateKey="executive"
        theme={{ palettes: { meridian: { bg: "url(javascript:x)", ink: "#000", accent: "#000" } } }}
        content={demoSiteContent}
        publishedAt={publishedAt}
      />,
    );
    expect(html).toContain("--site-bg:#f7f4ee");
    expect(html).not.toContain("javascript");
    expect(getTemplate("executive").key).toBe("meridian");
    expect(getTemplate("nonsense").key).toBe("meridian");
  });
});
