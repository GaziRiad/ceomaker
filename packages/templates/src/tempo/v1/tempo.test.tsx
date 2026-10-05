import {
  contrastRatio,
  demoSiteContent,
  parseSiteContentForRender,
  templatePalettes,
  type PhotoGrade,
  type SectionInput,
  type SiteColors,
} from "@ceomaker/schema";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mixHex } from "../../meridian/v1/measure";
import { TemplateView } from "../../site-renderer";
import {
  bigNameSizes,
  figureSizes,
  fullNavFrom,
  nameSizes,
  splitName,
  stripTravel,
  tempoRoles,
  textWidth,
  titleSizes,
} from "./measure";

const publishedAt = new Date("2026-06-01T00:00:00Z");
const presets = templatePalettes("tempo", 1);
const white = presets[0]!.colors;

function render(
  content: unknown,
  { editable = false, grade }: { editable?: boolean; grade?: PhotoGrade } = {},
) {
  return renderToStaticMarkup(
    <TemplateView
      templateKey="tempo"
      templateVersion={1}
      colors={white}
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
const experience = middle.find((section) => section.type === "experience") as Extract<
  SectionInput,
  { type: "experience" }
>;

const focus: SectionInput = {
  id: "focus",
  type: "focus",
  heading: "Focus",
  items: [
    { title: "Long-duration storage", description: "Batteries that last the night." },
    { title: "Grid policy" },
  ],
};
const cta = (label: string): SectionInput => ({
  id: "cta",
  type: "cta",
  headline: "Working on something the grid needs?",
  button: { label, href: "#contact" },
});

const site = (rest: SectionInput[], heroPatch: Partial<typeof hero> = {}, name?: string) => ({
  ...demoSiteContent,
  ...(name ? { meta: { ...demoSiteContent.meta, name } } : {}),
  sections: [{ ...hero, ...heroPatch }, ...rest, contact],
});

const photo = (n: number) => ({
  src: `/media/0b546125-b657-4ed2-b39f-846f38c86b${String(n).padStart(2, "0")}`,
  alt: `Photo ${n}`,
});

/** A size from measure.ts, worked out at a page width as the browser would. */
function at(css: string, width: number): number {
  const expression = css.replace(/100cqw/g, String(width)).replace(/px/g, "");
  return new Function("min", "max", `return ${expression}`)(Math.min, Math.max) as number;
}

/** Every derived colour against every ground it sits on. */
function worst(colors: SiteColors) {
  const roles = tempoRoles(colors);
  const { bg, ink, accent } = colors;
  const surface = mixHex(ink, bg, 0.045);
  const surface2 = mixHex(ink, bg, 0.09);
  const against = (color: string, grounds: string[]) =>
    Math.min(...grounds.map((ground) => contrastRatio(color, ground)));
  return {
    secondary: against(mixHex(ink, bg, roles.secondary / 100), [bg, surface, surface2]),
    border: against(mixHex(ink, bg, roles.border / 100), [bg, surface]),
    mark: against(mixHex(accent, ink, roles.mark / 100), [bg, surface]),
    accentText: against(mixHex(accent, ink, roles.accentText / 100), [bg, surface]),
    inverseSecondary: against(mixHex(bg, ink, roles.inverseSecondary / 100), [ink]),
    inverseBorder: against(mixHex(bg, ink, roles.inverseBorder / 100), [ink]),
    inverseMark: against(mixHex(accent, bg, roles.inverseMark / 100), [ink]),
  };
}

describe("Tempo colour roles", () => {
  it.each([
    ...presets.map((preset) => [preset.name, preset.colors] as const),
    ["a pale accent", { bg: "#ffffff", ink: "#111111", accent: "#ffe14d" }] as const,
    ["a dark accent on dark", { bg: "#0b0b0c", ink: "#f4f3ef", accent: "#2a1a6e" }] as const,
  ])("%s keeps text, marks and borders readable everywhere", (_, colors) => {
    const ratios = worst(colors);
    expect(ratios.secondary).toBeGreaterThanOrEqual(4.5);
    expect(ratios.accentText).toBeGreaterThanOrEqual(4.5);
    expect(ratios.inverseSecondary).toBeGreaterThanOrEqual(4.5);
    expect(ratios.border).toBeGreaterThanOrEqual(3);
    expect(ratios.inverseBorder).toBeGreaterThanOrEqual(3);
    expect(ratios.mark).toBeGreaterThanOrEqual(3);
    expect(ratios.inverseMark).toBeGreaterThanOrEqual(3);
  });
});

describe("Tempo measures", () => {
  it("splits the name where the longer line is shortest", () => {
    expect(splitName("Nadia Ferreira")).toEqual(["Nadia", "Ferreira"]);
    expect(splitName("Anna Maria de la Cruz")).toEqual(["Anna Maria", "de la Cruz"]);
    expect(splitName("Madonna")).toEqual(["Madonna", ""]);
  });

  it("sets the name at its cap when it fits, and by its widest piece when it can't", () => {
    const sizes = nameSizes("Nadia Ferreira");
    expect(at(sizes.d, 1280)).toBe(212);
    expect(at(sizes.d, 1600)).toBe(212);
    expect(at(sizes.t, 820)).toBe(150);
    expect(at(sizes.p, 390) * textWidth("Ferreira")).toBeLessThanOrEqual(350);
    // Too long for two lines on a phone: it may break at the hyphen, so its widest piece sets
    // the size, well above what one line would allow.
    const long = nameSizes("Alexandra Montgomery-Fitzgerald");
    const size = at(long.p, 390);
    expect(size).toBeGreaterThan((350 * 0.97) / textWidth("Montgomery-Fitzgerald") + 15);
    expect(size * textWidth("Montgomery-")).toBeLessThanOrEqual(350);
    // On a narrower phone it shrinks with the column, so it still fits.
    expect(at(long.p, 320) * textWidth("Montgomery-")).toBeLessThanOrEqual(280);
  });

  it("steps section titles down with length and fits them to two lines", () => {
    expect(at(titleSizes("About").d, 1280)).toBe(112);
    expect(at(titleSizes("Selected infrastructure projects").d, 1280)).toBeCloseTo(69.44);
    const long = "Selected infrastructure projects, ventures and board seats";
    expect(at(titleSizes(long).p, 390) * textWidth(long)).toBeLessThanOrEqual(350 * 2);
  });

  it("gives all figures the size that fits the widest in its cell", () => {
    const sizes = figureSizes(["2.3M", "€410M", "9", "15"]);
    const desktop = at(sizes.d, 1280);
    expect(desktop * textWidth("€410M", true)).toBeLessThanOrEqual(1200 / 4 - 48);
    expect(at(sizes.p, 390) * textWidth("€410M", true)).toBeLessThanOrEqual(350 / 2 - 20);
    expect(at(figureSizes(["9"]).d, 1280)).toBe(220);
  });

  it("fits the name at the foot on one line", () => {
    const size = at(bigNameSizes("Alexandra Montgomery-Fitzgerald").d, 1280);
    expect(size * textWidth("Alexandra Montgomery-Fitzgerald")).toBeLessThanOrEqual(1200);
    expect(at(bigNameSizes("Nadia").d, 1280)).toBe(260);
  });

  it("moves the strip by its length less the column", () => {
    const travel = stripTravel(6);
    expect(at(travel.d, 1280)).toBe(1200 - (304 + 570 + 380 + 570 + 304 + 570 + 5 * 20));
    expect(at(stripTravel(1).d, 1280)).toBe(0);
  });

  it("shows the header links in full only when they fit", () => {
    expect(fullNavFrom("Nadia Ferreira", ["About", "Work", "Contact"], 3)).toBe(1000);
    const many = ["About", "Experience", "In numbers", "Selected work", "Focus", "Kind words"];
    expect(fullNavFrom("Nadia Ferreira", [...many, "Contact"], 3)).toBe(1280);
    const longer = [...many, "Speaking and writing", "Board positions", "Contact"];
    expect(fullNavFrom("Alexandra Montgomery-Fitzgerald", longer, 3)).toBeNull();
  });
});

describe("Tempo template", () => {
  it("parts the name around the portrait: first part left, the rest right", () => {
    const html = render(site(middle, { image: photo(0) }, "Nadia Ferreira"));
    expect(html).toContain(
      '<span class="tp-line tp-line-1"><span class="tp-wide">Nadia </span></span>' +
        '<span class="tp-line tp-line-2"><span class="tp-wide tp-wide-2">Ferreira</span></span>',
    );
    expect(html).toContain('class="tp-hero" data-portrait=""');
    const one = render(site(middle, {}, "Madonna"));
    expect(one).not.toContain("tp-line-2");
  });

  it("numbers the sections in page order and leaves the closing call out", () => {
    const html = render(site([middle[0]!, focus, ...middle.slice(1), cta("Write to me")]));
    const numbers = [...html.matchAll(/class="tp-title-n">(\d+)</g)].map((match) => match[1]);
    expect(numbers).toEqual(["01", "02", "03", "04", "05", "06", "07"]);
    expect(html).not.toContain('href="#cta"');
    expect(html.indexOf('id="focus"')).toBeLessThan(html.indexOf('id="about"'));
    // The focus titles also run on the band, hidden from readers.
    expect(html).toMatch(/<div aria-hidden="true" class="tp-marquee">/);
    expect(html).toContain('class="tp-marquee-group" data-copy="true"');
  });

  it("uses the round badge for short hero buttons and a square one for long", () => {
    const short = render(site(middle, { primaryCta: { label: "Get in touch", href: "#contact" } }));
    expect(short).toContain('aria-label="Get in touch" class="tp-badge"');
    expect(short).toContain('class="tp-rect tp-phone-only"');
    const label = "Download the board biography as a PDF";
    const long = render(site(middle, { primaryCta: { label, href: "#contact" } }));
    expect(long).not.toContain("tp-badge");
    expect(long).not.toContain("tp-phone-only");
    expect(long).toContain('class="tp-rect"');
  });

  it("gives the closing call a round button up to 32 characters", () => {
    expect(render(site([...middle, cta("Write to me")]))).toContain('class="tp-mag"');
    const long = render(site([...middle, cta("Arrange an introductory conversation")]));
    expect(long).not.toContain("tp-mag");
    expect(long).toContain('class="tp-cta-rect"');
  });

  it("counts figures up on the live site only", () => {
    const stats = middle.find((section) => section.type === "achievements")!;
    expect(render(site([stats]))).toMatch(
      /<span aria-hidden="true" data-count="" data-v="([^"]+)">\1<\/span><span class="sr-only">\1<\/span>/,
    );
    expect(render(site([stats]), { editable: true })).not.toContain("data-count");
  });

  it("folds roles after the eighth when there are more than ten, and lists all in the editor", () => {
    const roles = Array.from({ length: 12 }, (_, index) => ({
      role: `Role ${index + 1}`,
      organization: "Halden Grid",
    }));
    const long = site([{ ...experience, items: roles }]);
    const html = render(long);
    expect(html).toContain('<details class="tp-more">');
    expect(html).toContain('<span class="tp-more-n">4</span>');
    expect(html.indexOf("Role 9")).toBeGreaterThan(html.indexOf("<details"));
    expect(render(long, { editable: true })).toContain('<details class="tp-more" open="">');
  });

  it("shows one gallery photo wide, two or three in a row, and more as a strip", () => {
    const gallery = (count: number) =>
      render(site(middle, { gallery: Array.from({ length: count }, (_, i) => photo(i + 1)) }));
    expect(gallery(1)).toContain('data-mode="one"');
    expect(gallery(1)).not.toContain("data-gwrap");
    expect(gallery(3)).toContain('data-mode="row" data-gwrap="" tabindex="0"');
    expect(gallery(5)).toContain('data-mode="strip"');
    expect(gallery(0)).not.toContain("tp-gallery");
  });

  it("marks every visible text for editing in place", () => {
    const html = render(site([...middle, focus, cta("Write to me")]), { editable: true });
    expect(html).toContain('id="tp-name" data-field="meta.name" class="tp-name"');
    expect(html).toMatch(/data-field="[^"]+" class="tp-title-words"/);
    expect(html).toContain('data-field="focus.items.0.title" class="tp-tile-title"');
    expect(html).toContain('data-field="cta.headline"');
  });

  it("grades photos as the owner chose", () => {
    const html = render(site(middle, { image: photo(0) }), { grade: "tinted" });
    expect(html).toContain("--tp-gf:grayscale(1) contrast(1.05);--tp-go:0.4");
  });
});
