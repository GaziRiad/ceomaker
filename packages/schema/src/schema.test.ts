import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  defaultTheme,
  demoSiteContent,
  isValidSubdomain,
  parseSiteContent,
  parseSiteContentForRender,
  readableTextOn,
  richTextFromPlain,
  richTextToPlain,
  safeLinkUrl,
  subdomainSchema,
  themeSchema,
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
    expect(rendered.meta?.title).toBe(demoSiteContent.meta.title);
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
  it("accepts the default theme", () => {
    expect(themeSchema.safeParse(defaultTheme).success).toBe(true);
  });

  it("rejects unreadable text colors", () => {
    const result = themeSchema.safeParse({
      ...defaultTheme,
      colors: { ...defaultTheme.colors, foreground: "#eeeeee", background: "#ffffff" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-hex colors, which could otherwise smuggle CSS", () => {
    const result = themeSchema.safeParse({
      ...defaultTheme,
      colors: { ...defaultTheme.colors, primary: "red; background:url(https://evil.example)" },
    });
    expect(result.success).toBe(false);
  });

  it("computes WCAG contrast", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
    expect(readableTextOn("#1f3a5f")).toBe("#ffffff");
    expect(readableTextOn("#f5d76e")).toBe("#000000");
  });
});
