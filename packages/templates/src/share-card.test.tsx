import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  folioNameSize,
  meridianNameSize,
  monumentNameSize,
  salonNameSize,
  ShareCard,
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

  it("draws each template with the name, role line and address", () => {
    for (const template of ["meridian", "monument", "salon", "folio", "retired-key"]) {
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
      expect(html).toContain("eloise.ceomaker.app");
      // Salon and Folio set the name alone; the others carry the initials.
      if (template !== "salon" && template !== "folio") expect(html).toContain("ÉH");
      // Folio sets each word apart, so the accent square can follow the last one.
      expect(html).toMatch(/Éloïse Hart|ÉLOÏSE|Éloïse<\/div>/);
    }
  });
});
