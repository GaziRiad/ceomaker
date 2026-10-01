import { demoSiteContent, parseSiteContent, type SiteContent } from "@ceomaker/schema";
import { describe, expect, it } from "vitest";
import {
  canEditInPlace,
  editInPlace,
  normalizeForEditing,
  respan,
  sectionIdOfField,
  sectionOf,
} from "./editor-model";

function demo(): SiteContent {
  const parsed = parseSiteContent(demoSiteContent);
  if (!parsed.success) throw new Error("demo content should be valid");
  return normalizeForEditing(parsed.data);
}

const lead = [{ text: "I build " }, { text: "resilient", italic: true }, { text: " networks." }];
const leadText = "I build resilient networks.";

describe("respan", () => {
  it("keeps emphasis outside the edited text", () => {
    expect(respan(lead, leadText, "I design resilient networks.")).toEqual([
      { text: "I design " },
      { text: "resilient", italic: true },
      { text: " networks." },
    ]);
  });

  it("gives replaced text the format of what it replaced", () => {
    expect(respan(lead, leadText, "I build sturdy networks.")).toEqual([
      { text: "I build " },
      { text: "sturdy", italic: true },
      { text: " networks." },
    ]);
  });

  it("continues the format before the caret when typing", () => {
    expect(respan(lead, leadText, "I build resilient global networks.")).toEqual([
      { text: "I build " },
      { text: "resilient", italic: true },
      { text: " global networks." },
    ]);
  });

  it("returns nothing for an emptied paragraph, and plain text if the spans don't match", () => {
    expect(respan(lead, leadText, "  ")).toEqual([]);
    expect(respan(lead, "Something else", "New  text\n")).toEqual([{ text: "New text" }]);
  });
});

describe("editInPlace", () => {
  it("edits hero, contact and profile fields as single lines", () => {
    const content = demo();
    const next = editInPlace(content, "hero.headline", "", "  A new\nheadline ")!;
    expect(sectionOf(next, "hero")?.headline).toBe("A new headline");
    expect(sectionOf(editInPlace(content, "contact.blurb", "", "Write.")!, "contact")?.blurb).toBe(
      "Write.",
    );
    expect(editInPlace(content, "meta.name", "", "Ada Lovelace")?.meta.name).toBe("Ada Lovelace");
  });

  it("maps the rows the preview shows back past blank rows", () => {
    const content = demo();
    const experience = sectionOf(content, "experience")!;
    const withBlank: SiteContent = {
      ...content,
      sections: content.sections.map((section) =>
        section === experience
          ? { ...experience, items: [{ role: "", organization: "" }, ...experience.items] }
          : section,
      ),
    };
    const next = editInPlace(withBlank, "experience.items.0.role", "", "Chair")!;
    const items = sectionOf(next, "experience")!.items;
    expect(items[0]?.role).toBe("");
    expect(items[1]?.role).toBe("Chair");
    expect(items[2]).toEqual(experience.items[1]);
  });

  it("removes an emptied paragraph or affiliation", () => {
    const content = demo();
    const about = sectionOf(content, "about")!;
    const text = about.body[0]!.spans.map((span) => span.text).join("");
    const next = editInPlace(content, "about.body.0", text, "")!;
    expect(sectionOf(next, "about")!.body).toEqual(about.body.slice(1));

    const affiliations = content.meta.affiliations;
    const trimmed = editInPlace(content, "meta.affiliations.0", affiliations[0]!, " ")!;
    expect(trimmed.meta.affiliations).toEqual(affiliations.slice(1));
  });

  it("refuses sections the preview shows from their last valid version", () => {
    const content = demo();
    const experience = sectionOf(content, "experience")!;
    const invalid: SiteContent = {
      ...content,
      sections: content.sections.map((section) =>
        section === experience
          ? { ...experience, items: [{ role: "Chair", organization: "" }, ...experience.items] }
          : section,
      ),
    };
    expect(canEditInPlace(invalid, "experience.items.0.role")).toBe(false);
    expect(editInPlace(invalid, "experience.items.0.role", "", "CEO")).toBeNull();
    expect(canEditInPlace(invalid, "hero.headline")).toBe(true);
  });

  it("ignores paths that don't name an editable text field", () => {
    const content = demo();
    for (const path of [
      "hero.image",
      "hero.primaryCta.href",
      "experience.items.0.__proto__",
      "experience.items.x.role",
      "experience.items.99.role",
      "nowhere.headline",
      "meta.affiliations.99",
      "about.body.99",
    ]) {
      expect(editInPlace(content, path, "", "x"), path).toBeNull();
    }
  });

  it("finds the form a field lives in", () => {
    const content = demo();
    expect(sectionIdOfField(content, "meta.location")).toBe("hero");
    expect(sectionIdOfField(content, "work.items.1.title")).toBe("work");
    expect(sectionIdOfField(content, "nowhere.title")).toBeNull();
  });
});
