import { describe, expect, it } from "vitest";
import {
  isPremiumTemplate,
  planOf,
  subscriptionGrantsPro,
  buildStarterContent,
  contactMessageSchema,
  contrastLevel,
  contrastRatio,
  decodeAnswers,
  defaultColors,
  demoSiteContent,
  encodeAnswers,
  formTopicsFromGoals,
  imageRef,
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
  resolvePhotoGrade,
  resolveSiteColors,
  resolveTemplateRef,
  resolveTemplateVersion,
  richTextFromPlain,
  richTextToPlain,
  safeLinkUrl,
  siteDescription,
  siteTitle,
  siteMetaSchema,
  titleCutAfter,
  arialWidth,
  descriptionShownChars,
  GOOGLE_TITLE_PX,
  subdomainSchema,
  TEMPLATE_KEYS,
  TEMPLATE_VERSIONS,
  templateKeySchema,
  templatePalettes,
  withResolvedColors,
  latestTemplateVersion,
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
  it("ships five or six readable presets per template design, the first being the default", () => {
    for (const key of TEMPLATE_KEYS) {
      for (const version of TEMPLATE_VERSIONS[key]) {
        const presets = templatePalettes(key, version);
        expect(presets.length).toBeGreaterThanOrEqual(5);
        expect(presets.length).toBeLessThanOrEqual(6);
        for (const preset of presets) {
          expect(isPublishableColors(preset.colors)).toBe(true);
        }
      }
    }
    expect(resolveSiteColors({ palettes: {} }, "monument", 1).bg).toBe("#f3f0e8");
  });

  it("writes out a design's colours so a later default can't change them", () => {
    const settings = themeSettingsSchema.parse({
      palettes: { monument: { bg: "#ffffff", ink: "#000000", accent: "#123456" } },
    });
    const frozen = withResolvedColors(settings, "meridian", 1);
    expect(frozen.palettes.meridian).toEqual(defaultColors("meridian", 1));
    expect(frozen.palettes.monument).toEqual(settings.palettes.monument);
    expect(withResolvedColors(frozen, "monument", 1)).toEqual(frozen);
  });

  it("remembers colours per template", () => {
    const settings = themeSettingsSchema.parse({
      palettes: { monument: { bg: "#FFFFFF", ink: "#000000", accent: "#123456" } },
    });
    expect(resolveSiteColors(settings, "monument", 1)).toEqual({
      bg: "#ffffff",
      ink: "#000000",
      accent: "#123456",
    });
    expect(resolveSiteColors(settings, "meridian", 1).accent).toBe("#1f3a5f");
  });

  it("rejects non-hex colors, which could otherwise smuggle CSS", () => {
    const result = themeSettingsSchema.safeParse({
      palettes: {
        meridian: { bg: "#ffffff", ink: "#000000", accent: "red;background:url(https://x)" },
      },
    });
    expect(result.success).toBe(false);
  });

  it("drops palettes of retired templates, so older drafts still save", () => {
    const settings = themeSettingsSchema.parse({
      palettes: { aurora: { bg: "#ffffff", ink: "#000000", accent: "#123456" } },
    });
    expect(settings.palettes).toEqual({});
  });

  it("keeps valid palettes and drops bad ones when rendering stored data", () => {
    const settings = parseThemeSettingsForRender({
      palettes: {
        meridian: { bg: "#ececef", ink: "#111113", accent: "#0e7a5f" },
        monument: { bg: "nope", ink: "#000000", accent: "#000000" },
      },
    });
    expect(Object.keys(settings.palettes)).toEqual(["meridian"]);
    expect(parseThemeSettingsForRender({ colors: { background: "#fff" } })).toEqual({
      palettes: {},
    });
    expect(parseThemeSettingsForRender(null)).toEqual({ palettes: {} });
  });

  it("keeps a valid photo grade, defaults to original colours and drops anything else", () => {
    expect(themeSettingsSchema.parse({ photoGrade: "mono" }).photoGrade).toBe("mono");
    expect(themeSettingsSchema.safeParse({ photoGrade: "sepia" }).success).toBe(false);
    expect(resolvePhotoGrade(themeSettingsSchema.parse({}))).toBe("original");
    expect(
      parseThemeSettingsForRender({ palettes: { meridian: "bad" }, photoGrade: "tinted" }),
    ).toEqual({ palettes: {}, photoGrade: "tinted" });
    expect(parseThemeSettingsForRender({ palettes: { meridian: "bad" }, photoGrade: 3 })).toEqual({
      palettes: {},
    });
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
  it("maps retired keys to meridian", () => {
    expect(normalizeTemplateKey("executive")).toBe("meridian");
    expect(templateKeySchema.parse("executive")).toBe("meridian");
    expect(normalizeTemplateKey("bento")).toBe("meridian");
    expect(normalizeTemplateKey("monument")).toBe("monument");
    expect(normalizeTemplateKey("marquee")).toBeNull();
    expect(templateKeySchema.safeParse("marquee").success).toBe(false);
  });

  it("renders the stored design, and never upgrades a bad or missing version to the newest", () => {
    for (const key of TEMPLATE_KEYS) {
      const [oldest] = TEMPLATE_VERSIONS[key];
      expect(latestTemplateVersion(key)).toBe(TEMPLATE_VERSIONS[key].at(-1));
      for (const version of TEMPLATE_VERSIONS[key]) {
        expect(resolveTemplateVersion(key, version)).toBe(version);
      }
      for (const bad of [undefined, null, 0, 999, "1", 1.5]) {
        expect(resolveTemplateVersion(key, bad)).toBe(oldest);
      }
    }
    expect(resolveTemplateRef("executive", 999)).toEqual({ key: "meridian", version: 1 });
    expect(resolveTemplateRef("bento", 1)).toEqual({ key: "meridian", version: 1 });
    expect(resolveTemplateRef("monument", 1)).toEqual({ key: "monument", version: 1 });
    expect(resolveTemplateRef("marquee", 1)).toEqual({ key: "meridian", version: 1 });
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

  it("takes an optional focal point inside the photo", () => {
    const src = "/media/0b546125-b657-4ed2-b39f-846f38c86be4";
    expect(imageRef.safeParse({ src, alt: "" }).success).toBe(true);
    expect(imageRef.safeParse({ src, alt: "", focal: { x: 0.2, y: 1 } }).success).toBe(true);
    expect(imageRef.safeParse({ src, alt: "", focal: { x: 1.2, y: 0.5 } }).success).toBe(false);
  });
});

describe("photos and the closing section", () => {
  const photo = { src: "/media/0b546125-b657-4ed2-b39f-846f38c86be4", alt: "" };
  const [hero, ...rest] = demoSiteContent.sections;

  it("keeps sites without the new fields valid", () => {
    expect(parseSiteContent(demoSiteContent).success).toBe(true);
  });

  it("holds up to twelve gallery photos with short captions", () => {
    const withGallery = (gallery: unknown[]) =>
      parseSiteContent({ ...demoSiteContent, sections: [{ ...hero, gallery }, ...rest] }).success;
    expect(withGallery(Array.from({ length: 12 }, () => photo))).toBe(true);
    expect(withGallery(Array.from({ length: 13 }, () => photo))).toBe(false);
    expect(withGallery([{ ...photo, alt: "x".repeat(121) }])).toBe(false);
  });

  it("accepts a photo on a testimonial and a closing section without a button", () => {
    const content = {
      ...demoSiteContent,
      sections: [
        ...demoSiteContent.sections.map((section) =>
          section.type === "testimonials"
            ? { ...section, items: section.items.map((item) => ({ ...item, photo })) }
            : section,
        ),
        { id: "cta", type: "cta", headline: "Let's talk" },
      ],
    };
    expect(parseSiteContent(content).success).toBe(true);
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

  it("drops the organisation from an automatic title Google would cut", () => {
    const meta = {
      name: "Maximiliane Schönberg-Aldridge",
      role: "Group Chief Executive",
      company: "Hanseatic Maritime Holdings",
      affiliations: [],
      keywords: [],
    };
    expect(siteTitle(meta)).toBe("Maximiliane Schönberg-Aldridge · Group Chief Executive");
  });

  it("accepts only uploaded images for the share image and favicon", () => {
    const base = { name: "Amelia Hart" };
    const upload = "/media/0b5f3c3e-8c1d-4a52-9d61-0f3a1c2b4e5d";
    expect(siteMetaSchema.safeParse({ ...base, shareImage: upload, favicon: upload }).success).toBe(
      true,
    );
    expect(
      siteMetaSchema.safeParse({ ...base, favicon: "https://example.com/x.png" }).success,
    ).toBe(false);
  });
});

describe("search and sharing", () => {
  it("names the last word Google shows of a long title", () => {
    expect(titleCutAfter("Amelia Hart · Chief Executive Officer, Meridian")).toBeNull();
    const long =
      "Amelia Hart · Chief Executive Officer of Meridian Freight Group, Rotterdam and Lagos";
    const word = titleCutAfter(long);
    expect(word).not.toBeNull();
    expect(long.indexOf(word!)).toBeGreaterThan(0);
    expect(arialWidth(long.slice(0, long.indexOf(word!) + word!.length), 20)).toBeLessThanOrEqual(
      GOOGLE_TITLE_PX,
    );
  });

  it("counts the characters Google shows of a long description", () => {
    expect(descriptionShownChars("I lead a logistics company.")).toBeNull();
    const shown = descriptionShownChars("word ".repeat(80));
    expect(shown).toBeGreaterThan(100);
    expect(shown).toBeLessThan(400);
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

describe("plans", () => {
  it("treats anything but pro as free, and Monument as premium", () => {
    expect(planOf("pro")).toBe("pro");
    expect(planOf("free")).toBe("free");
    expect(planOf("PRO")).toBe("free");
    expect(planOf(undefined)).toBe("free");
    expect(isPremiumTemplate("monument")).toBe(true);
    expect(isPremiumTemplate("salon")).toBe(true);
    expect(isPremiumTemplate("meridian")).toBe(false);
  });

  it("keeps Pro while a payment is retried, and ends it when paused or canceled", () => {
    expect(subscriptionGrantsPro("active")).toBe(true);
    expect(subscriptionGrantsPro("past_due")).toBe(true);
    expect(subscriptionGrantsPro("paused")).toBe(false);
    expect(subscriptionGrantsPro("canceled")).toBe(false);
  });
});
