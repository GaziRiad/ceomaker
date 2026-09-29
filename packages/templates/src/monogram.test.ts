import { defaultTheme } from "@ceomaker/schema";
import { describe, expect, it } from "vitest";
import { initialsOf, monogramIconDataUri } from "./monogram";

describe("monogram", () => {
  it.each([
    ["Amelia Hart", "AH"],
    ["amelia", "A"],
    ["Jean-Luc de la Tour", "JT"],
    ["Élodie Schmidt", "ÉS"],
    ["<script>alert(1)</script>", "SS"],
    ["   ", ""],
  ])("initials of %j are %j", (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });

  it("never emits markup from the name", () => {
    const svg = decodeURIComponent(
      monogramIconDataUri("<img src=x onerror=alert(1)>", defaultTheme),
    );
    expect(svg).not.toContain("<img");
    expect(svg).not.toContain("onerror");
    expect(svg).toContain(">IA</text>");
  });

  it("uses the theme's primary color with readable text", () => {
    const svg = decodeURIComponent(monogramIconDataUri("Amelia Hart", defaultTheme));
    expect(svg).toContain(`fill="${defaultTheme.colors.primary}"`);
    expect(svg).toContain(`fill="#ffffff"`);
  });
});
