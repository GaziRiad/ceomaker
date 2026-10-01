import { onboardingAnswersSchema } from "@ceomaker/schema";
import { zipSync, strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { readSourceDocument } from "./documents";
import { contentFromDraft, fallbackRewrite, type DraftOutput } from "./draft";

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
