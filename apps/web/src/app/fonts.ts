import {
  Barlow,
  Barlow_Condensed,
  Big_Shoulders,
  Inter,
  Manrope,
  Newsreader,
  Playfair_Display,
  Public_Sans,
} from "next/font/google";

// App chrome: the "Industry" system. Preloaded because every product page uses them.
export const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-barlow",
  display: "swap",
});
export const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

// Site templates. Variable names must match FONT_VARIABLES in @ceomaker/templates. Not
// preloaded: each site uses one or two of them, and browsers only fetch a font file when text
// actually uses it.
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});
export const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
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
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
  preload: false,
});

export const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-big-shoulders",
  display: "swap",
  preload: false,
  // Next has no metrics to build a size-matched fallback for this family.
  adjustFontFallback: false,
});
export const publicSans = Public_Sans({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-public-sans",
  display: "swap",
  preload: false,
});

// The same families for the "not live" and "paused" cards on customer addresses, without
// preloading: published sites never use them.
export const barlowLazy = Barlow({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-barlow",
  display: "swap",
  preload: false,
});
export const barlowCondensedLazy = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-barlow-condensed",
  display: "swap",
  preload: false,
});

const siteFonts = [inter, playfair, manrope, newsreader, bigShoulders, publicSans];

export const siteFontVariables = [...siteFonts, barlowLazy, barlowCondensedLazy]
  .map((font) => font.variable)
  .join(" ");

/** The product renders live template previews, so it carries the site fonts too. */
export const appFontVariables = [barlow, barlowCondensed, ...siteFonts]
  .map((font) => font.variable)
  .join(" ");
