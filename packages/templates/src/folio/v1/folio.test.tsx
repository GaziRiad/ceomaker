import {
  contrastRatio,
  demoSiteContent,
  parseSiteContentForRender,
  templatePalettes,
  type PhotoGrade,
  type SectionInput,
  type SiteColors,
  type TemplateKey,
} from "@ceomaker/schema";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mixHex } from "../../meridian/v1/measure";
import { buildSiteModel } from "../../model";
import { TemplateView } from "../../site-renderer";
import { folioRoles, fullNavFrom, nameSizes, textWidth, titleSizes } from "./measure";

const publishedAt = new Date("2026-06-01T00:00:00Z");
const presets = templatePalettes("folio", 1);
const paper = presets[0]!.colors;

function render(
  content: unknown,
  {
    key = "folio",
    editable = false,
    grade,
  }: { key?: TemplateKey; editable?: boolean; grade?: PhotoGrade } = {},
) {
  return renderToStaticMarkup(
    <TemplateView
      templateKey={key}
      templateVersion={1}
      colors={key === "folio" ? paper : templatePalettes(key, 1)[0]!.colors}
      photoGrade={grade}
      content={parseSiteContentForRender(content)}
      publishedAt={publishedAt}
      editable={editable}
    />,
  );
}

const sections = demoSiteContent.sections as SectionInput[];
const hero = sections[0] as Extract<SectionInput, { type: "hero" }>;
const contact = sections.at(-1)!;
const middle = sections.slice(1, -1);
const work = middle.find((section) => section.type === "portfolio") as Extract<
  SectionInput,
  { type: "portfolio" }
>;
const experience = middle.find((section) => section.type === "experience") as Extract<
  SectionInput,
  { type: "experience" }
>;

const focus: SectionInput = {
  id: "focus",
  type: "focus",
  heading: "What I work on",
  items: [
    { title: "Cold-chain networks", description: "Freight that stays at temperature." },
    { title: "Board work" },
  ],
};
const cta: SectionInput = {
  id: "cta",
  type: "cta",
  headline: "Building something that has to work?",
  button: { label: "Start a conversation", href: "#contact" },
};

const site = (rest: SectionInput[], heroPatch: Partial<typeof hero> = {}) => ({
  ...demoSiteContent,
  sections: [{ ...hero, ...heroPatch }, ...rest, contact],
});

const photo = (n: number) => ({
  src: `/media/0b546125-b657-4ed2-b39f-846f38c86b${String(n).padStart(2, "0")}`,
  alt: `Photo ${n}`,
});

/** Every derived colour against every ground it sits on. */
function worst(colors: SiteColors) {
  const roles = folioRoles(colors);
  const { bg, ink, accent } = colors;
  const surface = mixHex(ink, bg, 0.04);
  const surface2 = mixHex(ink, bg, 0.08);
  const tint = mixHex(accent, bg, 0.16);
  const against = (color: string, grounds: string[]) =>
    Math.min(...grounds.map((ground) => contrastRatio(color, ground)));
  return {
    secondary: against(mixHex(ink, bg, roles.secondary / 100), [bg, surface2, tint]),
    border: against(mixHex(ink, bg, roles.border / 100), [bg, surface]),
    mark: against(mixHex(accent, ink, roles.mark / 100), [bg, surface2]),
    accentText: against(mixHex(accent, ink, roles.accentText / 100), [bg, surface]),
    inverseSecondary: against(mixHex(bg, ink, roles.inverseSecondary / 100), [ink]),
    inverseMark: against(mixHex(accent, bg, roles.inverseMark / 100), [ink]),
  };
}

describe("Folio colour roles", () => {
  it.each([
    ...presets.map((preset) => [preset.name, preset.colors] as const),
    ["a pale accent", { bg: "#ffffff", ink: "#111111", accent: "#ffd84d" }] as const,
    ["a dark accent on dark", { bg: "#101010", ink: "#f2f2f2", accent: "#3b1d7a" }] as const,
  ])("%s keeps text, marks and borders readable everywhere", (_, colors) => {
    const ratios = worst(colors);
    expect(ratios.secondary).toBeGreaterThanOrEqual(4.5);
    expect(ratios.accentText).toBeGreaterThanOrEqual(4.5);
    expect(ratios.inverseSecondary).toBeGreaterThanOrEqual(4.5);
    expect(ratios.border).toBeGreaterThanOrEqual(3);
    expect(ratios.mark).toBeGreaterThanOrEqual(3);
    expect(ratios.inverseMark).toBeGreaterThanOrEqual(3);
  });
});

describe("Folio measures", () => {
  const px = (size: string) => Number(/(\d+)px\)$/.exec(size)?.[1]);

  it("sets the name largest when short and without a portrait, and fits its longest word", () => {
    expect(px(nameSizes("Maya Lindqvist", false).d)).toBe(168);
    expect(px(nameSizes("Maya Lindqvist", true).d)).toBe(128);
    const long = "Alexandra Montgomery-Fitzgerald";
    const size = px(nameSizes(long, true).d);
    expect(size).toBeLessThan(128);
    // The widest unbreakable part fits the 8-column text beside the portrait.
    expect(textWidth("Montgomery-") * size).toBeLessThan((1184 * 8) / 12 - 32);
  });

  it("steps section titles down with length", () => {
    expect(px(titleSizes("Work").d)).toBe(96);
    expect(px(titleSizes("Selected infrastructure projects and ventures").d)).toBeLessThan(54);
  });

  it("shows the header links in full only when they fit", () => {
    expect(fullNavFrom("Maya Lindqvist", ["About", "Work", "Contact"], "Get in touch")).toBe(1000);
    const many = ["Achievements", "About", "Focus", "Experience", "Selected work", "Kind words"];
    expect(fullNavFrom("Maya Lindqvist", [...many, "Contact"], "Get in touch")).toBe(1280);
    expect(
      fullNavFrom("Alexandra Montgomery-Fitzgerald", [...many, "Contact"], "Arrange a call"),
    ).toBeNull();
  });
});

describe("Folio template", () => {
  it("shows the focus areas as numbered cards where the owner put them", () => {
    const html = render(site([middle[0]!, focus, ...middle.slice(1)]));
    expect(html).toContain('id="focus"');
    expect(html).toContain("What I work on");
    expect(html).toContain('<span aria-hidden="true" class="fo-focus-n">02</span>');
    expect(html.indexOf('id="focus"')).toBeGreaterThan(html.indexOf('id="impact"'));
    expect(html.indexOf('id="focus"')).toBeLessThan(html.indexOf('id="about"'));
    expect(html).toContain('href="#focus"');
    expect(render(site([{ ...focus, visible: false }, ...middle]))).not.toContain('id="focus"');
    expect(render(site([{ ...focus, items: [] }, ...middle]))).not.toContain('id="focus"');
  });

  it("puts the closing panel where it sits and leaves it out of the navigation", () => {
    const html = render(site([...middle.slice(0, 2), cta, ...middle.slice(2)]));
    expect(html).toContain('class="fo-cta"');
    expect(html.indexOf('class="fo-cta"')).toBeLessThan(html.indexOf('id="experience"'));
    expect(html).not.toContain('href="#cta"');
  });

  it("shows several projects on a carousel and one as a featured split", () => {
    const many = render(site(middle));
    expect(many).toContain('aria-roledescription="carousel"');
    expect(many).toContain('aria-roledescription="slide" aria-label="2 / 4"');
    // A project without an image becomes a typographic tile; its copy is hidden from readers.
    expect(many).toMatch(/<span aria-hidden="true" class="fo-tile">/);
    const one = render(site([{ ...work, items: [work.items[0]!] }]));
    expect(one).not.toContain('aria-roledescription="carousel"');
    expect(one).toContain('class="fo-feature"');
  });

  it("folds roles after the eighth when there are more than ten, and lists all in the editor", () => {
    const roles = Array.from({ length: 12 }, (_, index) => ({
      role: `Role ${index + 1}`,
      organization: "Northline Freight",
    }));
    const long = site([{ ...experience, items: roles }]);
    const html = render(long);
    expect(html).toContain('<details class="fo-more">');
    expect(html).toContain('<span class="fo-more-n">4</span>');
    expect(html.indexOf("Role 9")).toBeGreaterThan(html.indexOf("<details"));
    expect(render(long, { editable: true })).toContain('<details class="fo-more" open="">');
    expect(render(site([experience]))).not.toContain("<details");
  });

  it("hangs up to three gallery photos still, and runs four or more as a looping strip", () => {
    const still = render(site(middle, { image: photo(0), gallery: [photo(1), photo(2)] }));
    expect(still).toContain('class="fo-stills" data-n="2"');
    const strip = render(
      site(middle, { gallery: Array.from({ length: 5 }, (_, index) => photo(index + 1)) }),
    );
    expect(strip).toContain('class="fo-strip" role="region" aria-label="Gallery"');
    // The copy that closes the loop is hidden from readers and has no alt text.
    expect(strip).toContain('<ul class="fo-strip-list" aria-hidden="true" data-copy="true">');
    expect(strip.match(/alt="Photo 1"/g)).toHaveLength(1);
  });

  it("grades photos as the owner chose", () => {
    const html = render(site(middle, { image: photo(0) }), { grade: "tinted" });
    expect(html).toContain("--fo-gf:grayscale(1) contrast(1.05);--fo-go:0.38");
  });
});

describe("Focus in the shared model", () => {
  it("keeps focus and the closing section out of the order other templates follow", () => {
    const model = buildSiteModel(
      parseSiteContentForRender(site([middle[0]!, focus, ...middle.slice(1), cta])),
    );
    expect(model.order).toEqual(["impact", "about", "experience", "work", "testimonials"]);
    expect(model.sequence).toEqual([
      "impact",
      "focus",
      "about",
      "experience",
      "work",
      "testimonials",
      "cta",
    ]);
    expect(model.focus?.items[1]).toEqual({
      title: "Board work",
      description: "",
      fields: { title: "focus.items.1.title", description: "focus.items.1.description" },
    });
  });

  it("shows a focus section in Meridian, Monument and Salon too", () => {
    for (const key of ["meridian", "monument", "salon"] as const) {
      expect(render(site([focus, ...middle]), { key })).not.toBe(render(site(middle), { key }));
    }
  });
});
