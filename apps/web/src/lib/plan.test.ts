import { describe, expect, it } from "vitest";
import { asEntitled } from "./plan";

const site = {
  templateKey: "monument",
  templateVersion: 1,
  content: {
    sections: [
      { id: "hero", type: "hero", headline: "Hello" },
      { id: "contact", type: "contact", form: { enabled: true, topics: ["Press"] } },
    ],
  },
};

describe("asEntitled", () => {
  it("leaves a Pro site exactly as published", () => {
    expect(asEntitled(site, "pro")).toBe(site);
  });

  it("shows a free site's premium template as Meridian, with the form off", () => {
    const free = asEntitled(site, "free");
    expect(free).toMatchObject({ templateKey: "meridian", templateVersion: 1 });
    expect(free.content).toEqual({
      sections: [
        { id: "hero", type: "hero", headline: "Hello" },
        { id: "contact", type: "contact", form: { enabled: false, topics: ["Press"] } },
      ],
    });
    // The stored version is never changed.
    expect(site.content.sections[1]).toMatchObject({ form: { enabled: true } });
  });

  it("keeps a free Meridian site on Meridian", () => {
    expect(asEntitled({ ...site, templateKey: "meridian" }, "free").templateKey).toBe("meridian");
  });
});
