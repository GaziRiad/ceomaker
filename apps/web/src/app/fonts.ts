import { Inter, Manrope, Newsreader, Playfair_Display } from "next/font/google";

// Variable names must match FONT_VARIABLES in @ceomaker/templates. Fonts are self-hosted by
// next/font; preload is off because each site uses only one pair and browsers download
// a font file only when text actually uses it.
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});
export const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  preload: false,
});
export const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  preload: false,
});
export const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  preload: false,
});

export const siteFontVariables = [inter, playfair, manrope, newsreader]
  .map((font) => font.variable)
  .join(" ");

export const appFontVariables = [inter, playfair].map((font) => font.variable).join(" ");
