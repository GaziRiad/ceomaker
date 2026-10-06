import { onboardingAnswersSchema } from "@ceomaker/schema";
import { zipSync, strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { readSourceDocument } from "./documents";
import { contentFromDraft, fallbackRewrite, mergeRedraft, type DraftOutput } from "./draft";

const answers = onboardingAnswersSchema.parse({
  role: "Chief executive",
  industry: "Logistics",
  stage: "Mid-size, 500–5,000",
  goals: ["Board and advisory roles", "Speaking invitations"],
  voice: "Measured",
  name: "Amelia Hart",
  org: "Meridian Freight Group",
});

function draft(overrides: Partial<DraftOutput> = {}): DraftOutput {
  return {
    hero: {
      eyebrow: "Chief Executive Officer, Meridian Freight Group",
      headline: "Building supply chains that hold up under pressure.",
      introduction: "I lead a logistics business. I speak about resilient operations.",
      buttonLabel: "Get in touch",
    },
    about: {
      opening: "I run a freight network built on *one shared planning system* across depots.",
      second: "I sit on boards and mentor founders.",
    },
    impact: [],
    experience: [],
    work: [],
    profile: {
      role: "Chief Executive Officer",
      company: "Meridian Freight Group",
      location: "",
      availability: "Open to board and advisory roles",
      availabilityShort: "Board and advisory roles",
      keywords: ["Operator", "Speaker"],
      affiliations: ["Meridian Freight Group"],
    },
    contact: { invitation: "For speaking, board and advisory enquiries." },
    ...overrides,
  };
}

describe("contentFromDraft", () => {
  it("builds valid content and keeps fact sections hidden without a document", () => {
    const content = contentFromDraft(answers, draft(), { email: "amelia@example.com" });
    expect(content).not.toBeNull();
    const byId = Object.fromEntries(content!.sections.map((section) => [section.id, section]));
    expect(byId.hero).toMatchObject({
      headline: "Building supply chains that hold up under pressure.",
    });
    expect(byId.impact).toMatchObject({ visible: false, items: [] });
    expect(byId.testimonials).toMatchObject({ visible: false, items: [] });
    expect(byId.about).toMatchObject({
      body: [
        {
          spans: [
            { text: "I run a freight network built on " },
            { text: "one shared planning system", italic: true },
            { text: " across depots." },
          ],
        },
        { spans: [{ text: "I sit on boards and mentor founders." }] },
      ],
    });
    expect(byId.contact).toMatchObject({ email: "amelia@example.com" });
    expect(content!.meta.location).toBeUndefined();
  });

  it("shows sections the document supports and leads with work for speakers", () => {
    const content = contentFromDraft(
      answers,
      draft({
        impact: [{ value: "€780M", label: "Annual revenue" }],
        experience: [
          {
            role: "Chief Executive Officer",
            organization: "Meridian Freight Group",
            location: "Rotterdam",
            start: "2019",
            end: "Present",
            summary: "",
          },
        ],
        work: [
          { kind: "Keynote", title: "Resilient networks", meta: "Freight Forum", year: "2025" },
        ],
      }),
    )!;
    const order = content.sections.map((section) => section.id);
    expect(order).toEqual([
      "hero",
      "impact",
      "about",
      "work",
      "experience",
      "testimonials",
      "contact",
    ]);
    expect(content.sections.find((section) => section.id === "impact")?.visible).toBe(true);
  });

  it("clips overlong model output instead of failing", () => {
    const content = contentFromDraft(
      answers,
      draft({
        hero: { ...draft().hero, headline: "word ".repeat(80), buttonLabel: "x".repeat(90) },
      }),
    );
    expect(content).not.toBeNull();
    const hero = content!.sections[0];
    expect(hero?.type === "hero" && hero.headline.length).toBeLessThanOrEqual(120);
  });

  it("falls back to the answers when the model leaves fields empty", () => {
    const content = contentFromDraft(
      answers,
      draft({ hero: { eyebrow: "", headline: "", introduction: "", buttonLabel: "" } }),
    )!;
    expect(content.sections[0]).toMatchObject({
      headline: "Building supply chains that hold up under pressure.",
      primaryCta: { label: "Get in touch", href: "#contact" },
    });
  });
});

describe("mergeRedraft", () => {
  const photo = { src: "https://example.com/amelia.jpg", alt: "Amelia Hart" };
  // A site the owner has worked on: photos, a testimonial, links, a reordered and hidden section.
  function edited() {
    const base = contentFromDraft(answers, draft(), { email: "amelia@example.com" })!;
    const sections = base.sections.map((section) => {
      switch (section.type) {
        case "hero":
          return {
            ...section,
            image: photo,
            primaryCta: { label: "Write to me", href: "#contact" },
          };
        case "about":
          return { ...section, heading: "My story", image: photo };
        case "testimonials":
          return {
            ...section,
            visible: true,
            items: [{ quote: "A steady hand.", author: "Jon Bell" }],
          };
        case "contact":
          return {
            ...section,
            links: [{ href: "https://www.linkedin.com/in/amelia", kind: "linkedin" as const }],
          };
        case "achievements":
          return { ...section, visible: false, items: [{ value: "12", label: "Depots" }] };
        default:
          return section;
      }
    });
    return {
      ...base,
      meta: { ...base.meta, name: "Amelia J. Hart", location: "Rotterdam" },
      sections: [sections[0]!, ...sections.slice(1).reverse()],
    };
  }

  it("replaces the words and keeps everything the AI doesn't write", () => {
    const current = edited();
    const fresh = contentFromDraft(
      answers,
      draft({
        hero: {
          eyebrow: "Chief Executive, Meridian Freight Group",
          headline: "Freight that keeps its promises.",
          introduction: "I run a logistics group across six countries.",
          buttonLabel: "Get in touch",
        },
        impact: [{ value: "€780M", label: "Annual revenue" }],
        experience: [
          {
            role: "Chief Executive Officer",
            organization: "Meridian Freight Group",
            location: "",
            start: "2019",
            end: "",
            summary: "",
          },
        ],
      }),
    )!;
    const merged = mergeRedraft(current, fresh)!;
    expect(merged).not.toBeNull();
    expect(merged.sections.map((section) => section.id)).toEqual(
      current.sections.map((section) => section.id),
    );
    const byId = Object.fromEntries(merged.sections.map((section) => [section.id, section]));
    expect(byId.hero).toMatchObject({
      headline: "Freight that keeps its promises.",
      image: photo,
      primaryCta: { label: "Get in touch", href: "#contact" },
    });
    expect(byId.about).toMatchObject({ heading: "My story", image: photo });
    // Lists the AI wrote replace the old ones and show, the hidden placeholder included.
    expect(byId.impact).toMatchObject({ visible: true, items: [{ value: "€780M" }] });
    expect(byId.experience).toMatchObject({
      visible: true,
      items: [{ role: "Chief Executive Officer" }],
    });
    expect(byId.testimonials).toMatchObject({ visible: true, items: [{ author: "Jon Bell" }] });
    expect(byId.contact).toMatchObject({
      email: "amelia@example.com",
      links: [{ kind: "linkedin" }],
    });
    expect(merged.meta).toMatchObject({ name: "Amelia J. Hart", location: "Rotterdam" });
  });

  it("keeps a work list with photos, and lists the new draft leaves empty", () => {
    const current = edited();
    const withWork = {
      ...current,
      sections: current.sections.map((section) =>
        section.type === "portfolio"
          ? { ...section, items: [{ title: "Port of Rotterdam talk", image: photo }] }
          : section.type === "experience"
            ? {
                ...section,
                visible: true,
                items: [{ role: "Chair", organization: "Freight Forum" }],
              }
            : section,
      ),
    };
    const fresh = contentFromDraft(
      answers,
      draft({ work: [{ title: "Keynote", kind: "Talk", meta: "", year: "2025" }] }),
    )!;
    const byId = Object.fromEntries(
      mergeRedraft(withWork, fresh)!.sections.map((section) => [section.id, section]),
    );
    expect(byId.work).toMatchObject({ items: [{ title: "Port of Rotterdam talk", image: photo }] });
    expect(byId.experience).toMatchObject({ items: [{ role: "Chair" }] });
  });
});

describe("fallbackRewrite", () => {
  it("offers the design's suggestions without AI", () => {
    expect(fallbackRewrite(answers, "Shorter")).toBe("Freight that holds up.");
    expect(fallbackRewrite(answers, "More formal")).toBe(
      "Leading supply chains that hold up under pressure.",
    );
    expect(fallbackRewrite(null, "Sharper")).toBeNull();
  });
});

describe("readSourceDocument", () => {
  it("accepts PDFs by their bytes", () => {
    const pdf = new TextEncoder().encode("%PDF-1.7\n...");
    expect(readSourceDocument(pdf)).toMatchObject({ kind: "pdf" });
  });

  it("extracts text from .docx files", () => {
    const xml =
      "<w:document><w:body><w:p><w:r><w:t>Amelia Hart</w:t></w:r></w:p><w:p><w:r><w:t>CEO &amp; Chair</w:t></w:r></w:p></w:body></w:document>";
    const docx = zipSync({
      "word/document.xml": strToU8(xml),
      "[Content_Types].xml": strToU8("<x/>"),
    });
    expect(readSourceDocument(docx)).toEqual({ kind: "text", text: "Amelia Hart\nCEO & Chair" });
  });

  it("rejects anything else, whatever it claims to be", () => {
    expect(readSourceDocument(new TextEncoder().encode("<html><script>"))).toBeNull();
    expect(readSourceDocument(zipSync({ "other.txt": strToU8("hi") }))).toBeNull();
    expect(readSourceDocument(new Uint8Array())).toBeNull();
  });
});
