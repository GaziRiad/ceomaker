import { describe, expect, it } from "vitest";
import { initialsOf, monogramIconDataUri } from "./monogram";

const colors = { bg: "#f7f4ee", ink: "#1a1a1a", accent: "#1f3a5f" };

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
    const svg = decodeURIComponent(monogramIconDataUri("<img src=x onerror=alert(1)>", colors));
    expect(svg).not.toContain("<img");
    expect(svg).not.toContain("onerror");
    expect(svg).toContain(">IA</text>");
  });

  it("uses the accent colour with readable text", () => {
    const svg = decodeURIComponent(monogramIconDataUri("Amelia Hart", colors));
    expect(svg).toContain(`fill="${colors.accent}"`);
    expect(svg).toContain(`fill="#ffffff"`);
  });
});
