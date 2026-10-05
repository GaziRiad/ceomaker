import {
  contrastRatio,
  demoSiteContent,
  parseSiteContentForRender,
  templatePalettes,
  type PhotoGrade,
  type SectionInput,
} from "@ceomaker/schema";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mixHex } from "../../meridian/v1/measure";
import { TemplateView } from "../../site-renderer";
import { cardColumns, galleryColumns, harbourGrounds, harbourRoles, longestPiece } from "./measure";

const publishedAt = new Date("2026-06-01T00:00:00Z");
const presets = templatePalettes("harbour", 1);
const linen = presets[0]!.colors;

function render(
  content: unknown,
  { editable = false, grade }: { editable?: boolean; grade?: PhotoGrade } = {},
) {
  return renderToStaticMarkup(
    <TemplateView
      templateKey="harbour"
      templateVersion={1}
      colors={linen}
      photoGrade={grade}
      content={parseSiteContentForRender(content)}
      publishedAt={publishedAt}
      editable={editable}
    />,
  );
}

const sections = demoSiteContent.sections as SectionInput[];
const hero = sections[0] as Extract<SectionInput, { type: "hero" }>;
const contact = sections.at(-1) as Extract<SectionInput, { type: "contact" }>;
const middle = sections.slice(1, -1);
const photo = (n: number) => ({
  src: `/media/0b546125-b657-4ed2-b39f-846f38c8${6000 + n}`,
  alt: "",
});

const focus: SectionInput = {
  id: "focus",
  type: "focus",
  items: [
    { title: "Resilient networks", description: "Planning that holds." },
    { title: "Practical AI", description: "Where it helps today." },
  ],
};

function site(rest: SectionInput[], heroPatch: Partial<typeof hero> = {}, last = contact) {
  return { ...demoSiteContent, sections: [{ ...hero, ...heroPatch }, ...rest, last] };
}

describe("Harbour colour roles", () => {
  it("keeps every text role readable on every ground, for every preset", () => {
    for (const { colors } of presets) {
      const roles = harbourRoles(colors);
      const { surface, surface2, tint } = harbourGrounds(colors);
      const ink2 = mixHex(colors.ink, colors.bg, roles.secondary / 100);
      const act = mixHex(colors.accent, colors.ink, roles.accentText / 100);
      const acg = mixHex(colors.accent, colors.ink, roles.mark / 100);
      const border = mixHex(colors.ink, colors.bg, roles.border / 100);
      for (const ground of [colors.bg, surface, surface2, tint]) {
        expect(contrastRatio(ink2, ground)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(act, ground)).toBeGreaterThanOrEqual(4.5);
      }
      for (const ground of [colors.bg, surface, surface2]) {
        expect(contrastRatio(acg, ground)).toBeGreaterThanOrEqual(3);
      }
      for (const ground of [colors.bg, surface]) {
        expect(contrastRatio(border, ground)).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe("Harbour measures", () => {
  it("measures the name by its longest piece, breaking after hyphens", () => {
    expect(longestPiece("Amelia Hart")).toBe(6);
    expect(longestPiece("Alexandra Montgomery-Fitzgerald")).toBe(11);
  });

  it("lays gallery photos out in even rows", () => {
    expect(galleryColumns(1)).toEqual({ desktop: 3, phone: 1 });
    expect(galleryColumns(4)).toEqual({ desktop: 4, phone: 2 });
    expect(galleryColumns(8)).toEqual({ desktop: 4, phone: 2 });
    expect(galleryColumns(9)).toEqual({ desktop: 3, phone: 2 });
    expect(galleryColumns(7)).toEqual({ desktop: 4, phone: 2 });
  });

  it("sets cards three across when they fill rows of three", () => {
    expect(cardColumns(3, "focus")).toBe(3);
    expect(cardColumns(4, "focus")).toBe(2);
    expect(cardColumns(5, "focus")).toBe(3);
    expect(cardColumns(4, "work")).toBe(2);
    expect(cardColumns(6, "work")).toBe(3);
  });
});

describe("Harbour template", () => {
  it("greets with its own words, or the owner's eyebrow instead", () => {
    expect(render(site(middle, { eyebrow: undefined }))).toContain("Hello, I&#x27;m");
    const withEyebrow = render(site(middle));
    expect(withEyebrow).toContain("Chief Executive Officer, Meridian Freight Group");
    expect(withEyebrow).not.toContain("Hello, I&#x27;m");
  });

  it("hangs the portrait in the arch only when there is one", () => {
    expect(render(site(middle))).not.toContain("hb-portrait");
    const html = render(site(middle, { image: photo(1) }));
    expect(html).toContain('class="hb-hero" data-portrait=""');
    expect(html).toContain("hb-portrait");
  });

  it("lays Focus and Kind words on bands, never two in a row", () => {
    const html = render(site([focus, ...middle]));
    expect(html).toMatch(/id="focus"[^>]*data-band="true"/);
    expect(html).toMatch(/id="testimonials"[^>]*data-band="true"/);
    const testimonials = middle.find((section) => section.type === "testimonials")!;
    const together = render(site([focus, testimonials]));
    expect(together).toMatch(/id="focus"[^>]*data-band="true"/);
    expect(together).not.toMatch(/id="testimonials"[^>]*data-band/);
  });

  it("names the sections briefly in the menu until the owner renames them", () => {
    const html = render(site([focus, ...middle]));
    expect(html).toContain('class="hb-nav-link">Focus</a>');
    expect(html).toContain('class="hb-nav-link">Contact</a>');
    expect(html).toContain("How I help");
    expect(html).toContain("Say hello");
    const renamed = render(site([{ ...focus, heading: "Services" } as SectionInput, ...middle]));
    expect(renamed).toContain('class="hb-nav-link">Services</a>');
  });

  it("puts the email and links in the card without the form, and beside it with the form", () => {
    const free = render(site(middle, {}, { ...contact, form: { enabled: false, topics: [] } }));
    expect(free).toContain("hb-contact-card");
    expect(free).toContain('class="hb-email-big"');
    expect(free).not.toContain('class="hb-panel"');
    const pro = render(site(middle));
    expect(pro).toContain("hb-contact-form");
    expect(pro).toContain('class="hb-email-line"');
    expect(pro).toContain('class="hb-panel"');
  });

  it("closes with the owner's photos under contact, and leaves them out when there are none", () => {
    expect(render(site(middle))).not.toContain('id="gallery"');
    const html = render(site(middle, { gallery: [photo(2), photo(3)] }));
    expect(html.indexOf('id="gallery"')).toBeGreaterThan(html.indexOf('id="contact"'));
    expect(html).toMatch(/id="gallery"[^>]*data-tight="true"/);
    expect(html).toContain("Moments");
  });

  it("marks every visible text for editing in place", () => {
    const html = render(site([focus, ...middle]), { editable: true });
    expect(html).toContain('id="hb-name" data-field="meta.name" class="hb-name"');
    expect(html).toContain('data-field="focus.items.0.title" class="hb-focus-name"');
    expect(html).toContain('data-field="hero.eyebrow"');
    expect(html).toContain('data-field="meta.labels.back-to-top"');
  });

  it("grades photos as the owner chose", () => {
    const html = render(site(middle, { image: photo(1) }), { grade: "tinted" });
    expect(html).toContain("--hb-gf:grayscale(1) contrast(1.05)");
    expect(html).toContain("--hb-go:0.35");
  });
});
