import {
  Archivo,
  Barlow,
  Barlow_Condensed,
  Big_Shoulders,
  Figtree,
  Geist,
  Geist_Mono,
  Hanken_Grotesk,
  Inter,
  Italiana,
  Martian_Mono,
  Newsreader,
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

export const italiana = Italiana({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-italiana",
  display: "swap",
  preload: false,
});
export const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-hanken-grotesk",
  display: "swap",
  preload: false,
});

export const geist = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist",
  display: "swap",
  preload: false,
});
export const geistMono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
});

// Tempo stretches its name along Archivo's width axis, so the width axis is loaded too.
export const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
  preload: false,
});
export const martianMono = Martian_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-martian-mono",
  display: "swap",
  preload: false,
});

// Harbour sets everything in Figtree, from Light (300) for the name to Semibold.
export const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-figtree",
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

const siteFonts = [
  inter,
  newsreader,
  bigShoulders,
  publicSans,
  italiana,
  hankenGrotesk,
  geist,
  geistMono,
  archivo,
  martianMono,
  figtree,
];

export const siteFontVariables = [...siteFonts, barlowLazy, barlowCondensedLazy]
  .map((font) => font.variable)
  .join(" ");

/** The product renders live template previews, so it carries the site fonts too. */
export const appFontVariables = [barlow, barlowCondensed, ...siteFonts]
  .map((font) => font.variable)
  .join(" ");
