import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  folioNameSize,
  harbourNameSize,
  meridianNameSize,
  monumentNameSize,
  salonNameSize,
  ShareCard,
  tempoNameSize,
} from "./share-card";

const fonts = {
  serif: "serif",
  sans: "sans",
  display: "display",
  body: "body",
  salonDisplay: "salon-display",
  salonBody: "salon-body",
  folio: "folio",
  folioMono: "folio-mono",
  tempo: "tempo",
  tempoMono: "tempo-mono",
  harbour: "Figtree",
};
const colors = { bg: "#f3f0e8", ink: "#15130f", accent: "#ff5a1f" };

describe("share card", () => {
  it("steps Meridian names down as they lengthen", () => {
    expect(meridianNameSize("Amelia Hart")).toBe(112);
    expect(meridianNameSize("Amelia Hart-Lindqvist")).toBe(92);
    expect(meridianNameSize("Maximiliane Schönberg-Aldridge")).toBe(72);
  });

  it("sizes Monument names by the longest word and three lines at most", () => {
    expect(monumentNameSize(["Amelia", "Hart"], false)).toBe(210);
    expect(monumentNameSize(["Maximiliane", "Schönberg-Aldridge"], false)).toBeLessThan(120);
    expect(monumentNameSize(["A", "B", "C", "D"], false)).toBeLessThanOrEqual(400 / (4 * 0.86));
    expect(monumentNameSize(["Maximiliane"], true)).toBeLessThan(
      monumentNameSize(["Maximiliane"], false),
    );
  });

  it("fits Salon names to their column without breaking a word", () => {
    expect(salonNameSize("Amelia Hart", false)).toBe(150);
    expect(salonNameSize("Alexandra Montgomery-Fitzgerald", false)).toBeLessThan(110);
    expect(salonNameSize("Amelia Hart", true)).toBeLessThan(salonNameSize("Amelia Hart", false));
    expect(salonNameSize("Maximilianaconstantinopolous", true)).toBeLessThan(45);
  });

  it("fits Folio names to their column without breaking a word", () => {
    expect(folioNameSize("Amelia Hart", false)).toBe(156);
    expect(folioNameSize("Amelia Hart", true)).toBe(120);
    expect(folioNameSize("Alexandra Montgomery-Fitzgerald", false)).toBeLessThan(120);
    expect(folioNameSize("Maximilianaconstantinopolous", true)).toBeLessThan(50);
  });

  it("fits Tempo names on two lines, smaller beside a portrait", () => {
    expect(tempoNameSize("Nadia Ferreira", false)).toBe(196);
    expect(tempoNameSize("Nadia Ferreira", true)).toBe(112);
    expect(tempoNameSize("Alexandra Montgomery-Fitzgerald", false)).toBeLessThan(110);
    expect(tempoNameSize("Maximilianaconstantinopolous", false)).toBeLessThan(80);
  });

  it("fits Harbour names to their column, smaller beside the portrait", () => {
    expect(harbourNameSize("Amelia Hart", false)).toBe(120);
    expect(harbourNameSize("Amelia Hart", true)).toBe(92);
    // Long names break between words and after hyphens, so only the longest piece must fit.
    expect(harbourNameSize("Alexandra Montgomery-Fitzgerald", true)).toBe(92);
    expect(harbourNameSize("Maximilianaconstantinopolous", true)).toBeLessThan(45);
  });

  it("draws each template with the name, role line and address", () => {
    const templates = ["meridian", "harbour", "monument", "salon", "folio", "tempo", "retired-key"];
    for (const template of templates) {
      const html = renderToStaticMarkup(
        <ShareCard
          template={template}
          colors={colors}
          name="Éloïse Hart"
          role="Chief Executive Officer"
          organization="Meridian Freight Group"
          domain="eloise.ceomaker.app"
          fonts={fonts}
        />,
      );
      // Tempo sets the address in capitals, as its labels are.
      expect(html.toLowerCase()).toContain("eloise.ceomaker.app");
      // Harbour, Salon, Folio and Tempo set the name alone; the others carry the initials.
      if (!["harbour", "salon", "folio", "tempo"].includes(template)) {
        expect(html).toContain("ÉH");
      }
      // Folio sets each word apart, so the accent square can follow the last one.
      expect(html).toMatch(/Éloïse Hart|ÉLOÏSE|Éloïse<\/div>/);
    }
  });
});
