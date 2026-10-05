import {
  buildStarterContent,
  defaultColors,
  demoSiteContent,
  onboardingAnswersSchema,
  parseSiteContentForRender,
  TEMPLATE_KEYS,
  TEMPLATE_VERSIONS,
  type RenderableSiteContent,
  type TemplateKey,
  type SectionInput,
  type SiteContentInput,
} from "@ceomaker/schema";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildSiteModel } from "./model";
import { getTemplate, latestTemplate, newerDesign, templateList } from "./registry";
import { SiteRenderer, TemplateView } from "./site-renderer";

const publishedAt = new Date("2026-06-01T00:00:00Z");

/** Every design of every template: frozen ones must keep working as well as the newest. */
const DESIGNS: [TemplateKey, number][] = TEMPLATE_KEYS.flatMap((key) =>
  TEMPLATE_VERSIONS[key].map((version): [TemplateKey, number] => [key, version]),
);

function render(key: TemplateKey, version: number, content: unknown, editable = false) {
  return renderToStaticMarkup(
    <TemplateView
      templateKey={key}
      templateVersion={version}
      colors={defaultColors(key, version)}
      content={parseSiteContentForRender(content)}
      publishedAt={publishedAt}
      editable={editable}
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
  for (const key of rest) value = (value as Record<string, unknown> | undefined)?.[key];
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

describe.each(DESIGNS)("%s v%i template", (key, version) => {
  it("renders the full demo site", () => {
    const html = render(key, version, demoSiteContent);
    expect(html).toContain("Amelia Hart");
    expect(html).toContain("Building supply chains that hold up under pressure.");
    expect(html).toContain("Chief Operating Officer");
    expect(html).toContain("Resilient networks for a volatile decade");
    expect(html).toContain('href="mailto:office@example.com"');
    expect(html).toContain('id="contact"');
    expect(html).toContain('<nav aria-label="Sections"');
    expect(html).toContain('href="#main"');
    // Salon's and Folio's footers carry the name without a copyright line.
    if (key !== "salon" && key !== "folio") expect(html).toContain("© 2026 Amelia Hart");
  });

  it("opens contact links in a new tab with rel=me and no opener", () => {
    const html = render(key, version, demoSiteContent);
    expect(html).toMatch(/href="https:\/\/www\.linkedin\.com\/" target="_blank" rel="noopener me"/);
  });

  it("renders a minimal starter site without empty sections", () => {
    const html = render(key, version, starter);
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
      version,
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
      version,
      withSections([{ ...demoHero, headline: "<script>alert(1)</script>" }, ...demoRest]),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("marks each editable text with the content field it shows, in the editor only", () => {
    const content = parseSiteContentForRender(demoSiteContent);
    const html = render(key, version, demoSiteContent, true);
    const fields = fieldTexts(html);
    // Titles and wording the owner hasn't rewritten show the template's own words.
    const templateWording = /\.heading$|^meta\.labels\.|\.links\.\d+\.label$/;
    for (const [path, text] of fields) {
      const expected = contentText(content, path);
      if (expected === "undefined" && templateWording.test(path)) continue;
      expect({ path, text }).toEqual({ path, text: expected });
    }
    expect(fields.map(([path]) => path)).toEqual(
      expect.arrayContaining(["hero.headline", "about.body.0", "contact.blurb"]),
    );
    expect(fields.length).toBeGreaterThan(20);
    expect(render(key, version, demoSiteContent)).not.toContain("data-field");
  });

  // A shipped design is frozen: live sites pinned to it must look the same after any change to
  // shared code. If this fails, fix the change, or (for a deliberate fix to this design) update
  // the snapshot with `vitest -u` and say why in the commit. Redesigns are a new version.
  it("renders exactly as it shipped", async () => {
    // One tag per line, so a diff shows exactly what moved.
    const lines = (html: string) => `${html.replace(/></g, ">\n<")}\n`;
    await expect(lines(render(key, version, demoSiteContent))).toMatchFileSnapshot(
      `./__snapshots__/designs/${key}-v${version}-demo.html`,
    );
    await expect(lines(render(key, version, starter))).toMatchFileSnapshot(
      `./__snapshots__/designs/${key}-v${version}-starter.html`,
    );
  });

  it("copes with a very long name", () => {
    const html = render(key, version, {
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

describe("photos, links and the closing section", () => {
  const photo = (n: number) => ({
    src: `/media/0b546125-b657-4ed2-b39f-846f38c86b${String(n).padStart(2, "0")}`,
    alt: `Photo ${n}`,
  });
  const withPhotos = (count: number, extra: SectionInput[] = []) =>
    withSections([
      {
        ...demoHero,
        image: count > 0 ? photo(0) : undefined,
        gallery: Array.from({ length: Math.max(0, count - 1) }, (_, index) => photo(index + 1)),
      },
      ...demoRest.slice(0, -1),
      ...extra,
      demoRest.at(-1)!,
    ]);
  const cta: SectionInput = {
    id: "cta",
    type: "cta",
    headline: "Let's make something worth the journey",
    button: { label: "Start a conversation", href: "#contact" },
  };

  it("adds the gallery, focal points, quote photos, link kinds and the closing section", () => {
    const content = withSections([
      { ...demoHero, image: { ...photo(0), focal: { x: 0.25, y: 0.6 } }, gallery: [photo(1)] },
      ...demoRest.map((section) =>
        section.type === "testimonials"
          ? { ...section, items: section.items.map((item) => ({ ...item, photo: photo(9) })) }
          : section,
      ),
      cta,
    ]);
    const model = buildSiteModel(parseSiteContentForRender(content));
    expect(model.hero.image?.position).toBe("25% 60%");
    expect(model.gallery).toEqual([{ ...photo(1), position: "50% 35%" }]);
    expect(model.testimonials[0]?.photo?.src).toBe(photo(9).src);
    expect(model.contact.links.map((link) => link.kind)).toEqual(["linkedin", "website"]);
    expect(model.cta).toMatchObject({
      headline: cta.type === "cta" ? cta.headline : "",
      after: model.order.length,
      fields: { button: "cta.button.label" },
    });
  });

  it("leaves the closing section out when it's hidden", () => {
    const model = buildSiteModel(
      parseSiteContentForRender(withSections([...demoSections, { ...cta, visible: false }])),
    );
    expect(model.cta).toBeNull();
  });

  it("keeps Meridian and Monument unchanged by the new fields", () => {
    for (const key of ["meridian", "monument"] as const) {
      const plain = render(key, 1, withPhotos(1));
      const extended = render(key, 1, withPhotos(6, [cta]));
      expect(extended.replace(/ src="[^"]*"/g, "")).toBe(plain.replace(/ src="[^"]*"/g, ""));
    }
  });

  it("lays Salon's hero out by the number of photos", () => {
    const mode = (html: string) => /class="sl-hero" data-mode="(\w+)"/.exec(html)?.[1];
    expect(mode(render("salon", 1, withPhotos(0)))).toBe("type");
    expect(mode(render("salon", 1, withPhotos(2)))).toBe("portrait");
    const collage = render("salon", 1, withPhotos(12));
    expect(mode(collage)).toBe("collage");
    // Nine places on wide pages; the last three are hidden on phones.
    expect(collage.match(/class="sl-float"/g)).toHaveLength(9);
    expect(collage.match(/class="sl-float" data-wide="true"/g)).toHaveLength(3);
  });

  it("shows Salon's closing section where it sits, floating the gallery from two photos", () => {
    const html = render("salon", 1, withPhotos(3, [cta]));
    expect(html).toContain("Let&#x27;s make something worth the journey");
    expect(html.indexOf('class="sl-cta"')).toBeGreaterThan(html.indexOf('id="testimonials"'));
    expect(html.indexOf('class="sl-cta"')).toBeLessThan(html.indexOf('id="contact"'));
    expect(html).toMatch(/class="sl-cta" data-float="true"/);
    expect(render("salon", 1, withPhotos(2, [cta]))).not.toMatch(/sl-cta" data-float/);
  });

  it("grades Salon's photos as the owner chose", () => {
    const html = renderToStaticMarkup(
      <TemplateView
        templateKey="salon"
        templateVersion={1}
        colors={defaultColors("salon", 1)}
        photoGrade="mono"
        content={parseSiteContentForRender(withPhotos(1))}
        publishedAt={publishedAt}
      />,
    );
    expect(html).toContain("--sl-gf:grayscale(1) contrast(1.08);--sl-go:0");
    expect(html).toContain('style="object-position:50% 35%"');
  });
});

describe("site renderer", () => {
  it("renders retired template keys and bad colours with safe defaults", () => {
    const html = renderToStaticMarkup(
      <SiteRenderer
        templateKey="executive"
        templateVersion={undefined}
        theme={{ palettes: { meridian: { bg: "url(javascript:x)", ink: "#000", accent: "#000" } } }}
        content={demoSiteContent}
        publishedAt={publishedAt}
      />,
    );
    expect(html).toContain("--site-bg:#fbfbfa");
    expect(html).not.toContain("javascript");
    expect(getTemplate("executive", 7)).toMatchObject({ key: "meridian", version: 1 });
    expect(getTemplate("nonsense", 1)).toMatchObject({ key: "meridian", version: 1 });
  });

  it("renders the design a version was saved with, and offers newer designs", () => {
    for (const [key, version] of DESIGNS) {
      expect(getTemplate(key, version)).toMatchObject({ key, version });
      // A version we no longer have renders the oldest design, never the newest.
      expect(getTemplate(key, 999).version).toBe(TEMPLATE_VERSIONS[key][0]);
      expect(newerDesign(key, version)?.version ?? version).toBe(latestTemplate(key).version);
    }
    expect(templateList.map((template) => template.key)).toEqual([...TEMPLATE_KEYS]);
  });
});
