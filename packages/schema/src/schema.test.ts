import { describe, expect, it } from "vitest";
import {
  buildStarterContent,
  contactMessageSchema,
  contrastLevel,
  contrastRatio,
  decodeAnswers,
  demoSiteContent,
  encodeAnswers,
  formTopicsFromGoals,
  imageSrc,
  isPublishableColors,
  isValidSubdomain,
  normalizeTemplateKey,
  onboardingAnswersSchema,
  paragraphFromMarkup,
  paragraphToMarkup,
  parseSiteContent,
  parseSiteContentForRender,
  parseThemeSettingsForRender,
  previewFromAnswers,
  readableTextOn,
  resolveSiteColors,
  richTextFromPlain,
  richTextToPlain,
  safeLinkUrl,
  siteDescription,
  siteTitle,
  subdomainSchema,
  TEMPLATE_KEYS,
  TEMPLATE_PALETTES,
  templateKeySchema,
  themeSettingsSchema,
  type OnboardingAnswers,
} from "./index";

describe("site content", () => {
  it("accepts the demo site", () => {
    const result = parseSiteContent(demoSiteContent);
    expect(result.success).toBe(true);
    expect(result.data?.sections.every((section) => section.visible)).toBe(true);
  });

  it("rejects duplicate section ids", () => {
    const [hero] = demoSiteContent.sections;
    const result = parseSiteContent({ ...demoSiteContent, sections: [hero, hero] });
    expect(result.success).toBe(false);
  });

  it("rejects unknown section types on write", () => {
    const result = parseSiteContent({
      ...demoSiteContent,
      sections: [...demoSiteContent.sections, { id: "x", type: "marquee", text: "hi" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects oversized fields", () => {
    const result = parseSiteContent({
      ...demoSiteContent,
      sections: [{ id: "hero", type: "hero", headline: "x".repeat(121) }],
    });
    expect(result.success).toBe(false);
  });

  it("drops unknown or corrupt sections on render instead of failing the site", () => {
    const rendered = parseSiteContentForRender({
      ...demoSiteContent,
      sections: [
        ...demoSiteContent.sections,
        { id: "future", type: "video-reel", src: "https://example.com/v.mp4" },
        { id: "broken", type: "hero" },
      ],
    });
    expect(rendered.sections).toHaveLength(demoSiteContent.sections.length);
    expect(rendered.droppedSections).toBe(2);
    expect(rendered.meta?.name).toBe(demoSiteContent.meta.name);
  });

  it("renders nothing, without throwing, for garbage input", () => {
    expect(parseSiteContentForRender(null)).toEqual({
      meta: null,
      sections: [],
      droppedSections: 0,
    });
    expect(parseSiteContentForRender("<script>")).toEqual({
      meta: null,
      sections: [],
      droppedSections: 0,
    });
  });
});

describe("links", () => {
  it.each([
    "https://example.com",
    "http://example.com/a?b=c",
    "mailto:office@example.com",
    "tel:+31201234567",
    "#contact",
  ])("allows %s", (href) => {
    expect(safeLinkUrl.safeParse(href).success).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    " JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "//evil.example.com",
    "/relative/path",
    "#",
  ])("rejects %s", (href) => {
    expect(safeLinkUrl.safeParse(href).success).toBe(false);
  });

  it("rejects script URLs inside rich text spans", () => {
    const result = parseSiteContent({
      ...demoSiteContent,
      sections: [
        {
          id: "about",
          type: "about",
          heading: "About",
          body: [{ spans: [{ text: "click", href: "javascript:alert(1)" }] }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("rich text", () => {
  it("round-trips plain text by paragraph", () => {
    const plain = "First paragraph.\n\nSecond paragraph.";
    expect(richTextToPlain(richTextFromPlain(plain))).toBe(plain);
  });

  it("keeps markup-looking input as inert text", () => {
    const [paragraph] = richTextFromPlain("<img src=x onerror=alert(1)>");
    expect(paragraph?.spans[0]?.text).toBe("<img src=x onerror=alert(1)>");
  });
});

describe("subdomains", () => {
  it.each(["amelia", "amelia-hart", "a1b", "ceo-of-meridian"])("allows %s", (value) => {
    expect(isValidSubdomain(value)).toBe(true);
  });

  it.each([
    "ab",
    "-amelia",
    "amelia-",
    "xn--mlia-bsa",
    "amelia--hart",
    "amelia.hart",
    "amelia_hart",
    "www",
    "app",
    "api",
    "billing",
    "x".repeat(41),
    "__shell__",
  ])("rejects %s", (value) => {
    expect(isValidSubdomain(value)).toBe(false);
  });

  it("normalizes case on input but requires lowercase on the hot path", () => {
    expect(subdomainSchema.parse("  Amelia ")).toBe("amelia");
    expect(isValidSubdomain("Amelia")).toBe(false);
  });
});

describe("theme", () => {
  it("ships six readable presets per template, the first being the default", () => {
    for (const key of TEMPLATE_KEYS) {
      expect(TEMPLATE_PALETTES[key]).toHaveLength(6);
      for (const preset of TEMPLATE_PALETTES[key]) {
        expect(isPublishableColors(preset.colors)).toBe(true);
      }
    }
    expect(resolveSiteColors({ palettes: {} }, "obsidian").bg).toBe("#0b0b0c");
  });

  it("remembers colours per template", () => {
    const settings = themeSettingsSchema.parse({
      palettes: { aurora: { bg: "#FFFFFF", ink: "#000000", accent: "#123456" } },
    });
    expect(resolveSiteColors(settings, "aurora")).toEqual({
      bg: "#ffffff",
      ink: "#000000",
      accent: "#123456",
    });
    expect(resolveSiteColors(settings, "meridian").accent).toBe("#1f3a5f");
  });

  it("rejects non-hex colors, which could otherwise smuggle CSS", () => {
    const result = themeSettingsSchema.safeParse({
      palettes: {
        meridian: { bg: "#ffffff", ink: "#000000", accent: "red;background:url(https://x)" },
      },
    });
    expect(result.success).toBe(false);
  });

  it("keeps valid palettes and drops bad ones when rendering stored data", () => {
    const settings = parseThemeSettingsForRender({
      palettes: {
        bento: { bg: "#ececef", ink: "#111113", accent: "#0e7a5f" },
        monument: { bg: "nope", ink: "#000000", accent: "#000000" },
      },
    });
    expect(Object.keys(settings.palettes)).toEqual(["bento"]);
    expect(parseThemeSettingsForRender({ colors: { background: "#fff" } })).toEqual({
      palettes: {},
    });
    expect(parseThemeSettingsForRender(null)).toEqual({ palettes: {} });
  });

  it("grades contrast like the editor readout", () => {
    expect(contrastLevel({ bg: "#ffffff", ink: "#000000", accent: "#000000" })).toBe("excellent");
    expect(contrastLevel({ bg: "#ffffff", ink: "#6b6b6b", accent: "#000000" })).toBe("good");
    expect(contrastLevel({ bg: "#ffffff", ink: "#aaaaaa", accent: "#000000" })).toBe("low");
    expect(isPublishableColors({ bg: "#ffffff", ink: "#aaaaaa", accent: "#000000" })).toBe(false);
  });

  it("computes WCAG contrast", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
    expect(readableTextOn("#1f3a5f")).toBe("#ffffff");
    expect(readableTextOn("#f5d76e")).toBe("#000000");
  });
});

describe("templates", () => {
  it("maps the retired executive key to meridian", () => {
    expect(normalizeTemplateKey("executive")).toBe("meridian");
    expect(templateKeySchema.parse("executive")).toBe("meridian");
    expect(normalizeTemplateKey("bento")).toBe("bento");
    expect(normalizeTemplateKey("marquee")).toBeNull();
    expect(templateKeySchema.safeParse("marquee").success).toBe(false);
  });
});

describe("images", () => {
  it.each(["/media/0b546125-b657-4ed2-b39f-846f38c86be4", "https://cdn.example.com/a.jpg"])(
    "allows %s",
    (src) => {
      expect(imageSrc.safeParse(src).success).toBe(true);
    },
  );

  it.each([
    "http://example.com/a.jpg",
    "/media/../../etc/passwd",
    "/media/not-a-uuid",
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
  ])("rejects %s", (src) => {
    expect(imageSrc.safeParse(src).success).toBe(false);
  });
});

describe("emphasis markup", () => {
  it("round-trips a highlighted phrase", () => {
    const markup = "A regional carrier with *thin margins*. Now a network.";
    const paragraph = paragraphFromMarkup(markup);
    expect(paragraph?.spans).toEqual([
      { text: "A regional carrier with " },
      { text: "thin margins", italic: true },
      { text: ". Now a network." },
    ]);
    expect(paragraphToMarkup(paragraph!)).toBe(markup);
  });

  it("keeps unpaired asterisks literal and ignores blank input", () => {
    expect(paragraphFromMarkup("5* rated")?.spans).toEqual([{ text: "5* rated" }]);
    expect(paragraphFromMarkup("   ")).toBeNull();
  });
});

describe("site meta", () => {
  it("derives the search title and description when they are not set", () => {
    const meta = { name: "Amelia Hart", company: "Meridian", affiliations: [], keywords: [] };
    expect(siteTitle(meta, { eyebrow: "Chief Executive Officer, Meridian" })).toBe(
      "Amelia Hart · Chief Executive Officer, Meridian",
    );
    expect(siteTitle({ ...meta, title: "Custom" })).toBe("Custom");
    expect(siteDescription(meta, { subheadline: "x".repeat(200) })).toHaveLength(160);
    expect(siteDescription(meta)).toBeUndefined();
  });
});

describe("onboarding", () => {
  const answers: OnboardingAnswers = onboardingAnswersSchema.parse({
    role: "Chief executive",
    industry: "Logistics",
    stage: "Mid-size, 500–5,000",
    goals: ["Board and advisory roles", "Speaking invitations"],
    voice: "Measured",
    name: "Amelia Hart",
    org: "Meridian Freight Group",
  });

  it("builds the live preview from partial answers", () => {
    expect(previewFromAnswers({})).toMatchObject({
      name: "Your Name",
      eyebrow: "Leader",
      headline: "Building work that holds up under pressure.",
    });
    const preview = previewFromAnswers(answers);
    expect(preview.eyebrow).toBe("Chief executive, Meridian Freight Group");
    expect(preview.headline).toBe("Building supply chains that hold up under pressure.");
    expect(preview.subheadline).toBe(
      "I lead a business of 500 to 5,000 people in logistics. Open to speaking invitations and board and advisory roles.",
    );
  });

  it("builds a valid starter site that invents nothing", () => {
    const content = buildStarterContent(answers, { email: "amelia@example.com" });
    const parsed = parseSiteContent(content);
    expect(parsed.success).toBe(true);
    const sections = parsed.data!.sections;
    const hidden = sections.filter((section) => !section.visible).map((section) => section.id);
    expect(hidden).toEqual(["impact", "experience", "work", "testimonials"]);
    for (const section of sections) {
      if (section.type === "achievements" || section.type === "testimonials") {
        expect(section.items).toEqual([]);
      }
    }
    expect(parsed.data!.meta.availability).toBe("Open to board and advisory roles");
    const contact = sections.find((section) => section.type === "contact");
    expect(contact).toMatchObject({
      blurb: "For speaking, board and advisory enquiries.",
      email: "amelia@example.com",
      form: { enabled: true, topics: ["Speaking", "Board and advisory", "Something else"] },
    });
  });

  it("offers form topics only for goals someone would write about", () => {
    expect(formTopicsFromGoals(["A credible first result on Google"])).toEqual([]);
    expect(formTopicsFromGoals(["Attracting talent", "Investor relations"])).toEqual([
      "Investors",
      "Careers",
      "Something else",
    ]);
  });

  it("accepts contact messages within limits and rejects bad ones", () => {
    const message = {
      name: " Jonas Weber ",
      email: "jonas@northgate.example",
      message: "Would value a conversation.",
    };
    expect(contactMessageSchema.parse(message)).toEqual({
      name: "Jonas Weber",
      email: "jonas@northgate.example",
      organisation: "",
      topic: "",
      message: "Would value a conversation.",
    });
    expect(contactMessageSchema.safeParse({ ...message, email: "jonas@northgate" }).success).toBe(
      false,
    );
    expect(contactMessageSchema.safeParse({ ...message, message: "   " }).success).toBe(false);
    expect(contactMessageSchema.safeParse({ ...message, message: "x".repeat(4001) }).success).toBe(
      false,
    );
  });

  it("keeps older contact sections without form settings valid", () => {
    const parsed = parseSiteContent({
      ...demoSiteContent,
      sections: [
        ...demoSiteContent.sections.filter((section) => section.type !== "contact"),
        { id: "contact", type: "contact", email: "office@example.com" },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("round-trips answers through the sign-in link, including non-Latin names", () => {
    const named = { ...answers, name: "Zoë Ångström 李" };
    expect(decodeAnswers(encodeAnswers(named))).toEqual(named);
    expect(decodeAnswers("not-base64!")).toBeNull();
    expect(decodeAnswers(encodeAnswers({ ...answers, role: "Emperor" as never }))).toBeNull();
  });
});
