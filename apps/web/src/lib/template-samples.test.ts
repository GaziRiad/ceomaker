import { describe, expect, it } from "vitest";
import { SAMPLE_CONTENT, sampleTemplateKey } from "./template-samples";

describe("template samples", () => {
  it("keeps every section of the sample, with focus and the closing invitation", () => {
    expect(SAMPLE_CONTENT.droppedSections).toBe(0);
    expect(SAMPLE_CONTENT.sections.map((section) => section.type)).toEqual([
      "hero",
      "achievements",
      "about",
      "focus",
      "experience",
      "portfolio",
      "testimonials",
      "cta",
      "contact",
    ]);
  });

  it("accepts current template keys only", () => {
    expect(sampleTemplateKey("salon")).toBe("salon");
    expect(sampleTemplateKey("executive")).toBeNull();
    expect(sampleTemplateKey("nope")).toBeNull();
  });
});
