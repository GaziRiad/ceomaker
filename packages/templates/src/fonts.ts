/**
 * Font CSS variables the host app must define (e.g. with next/font). Browsers only download
 * the font files a page actually uses, so declaring all of them costs nothing per site.
 */
export const FONT_VARIABLES = {
  inter: "--font-inter",
  newsreader: "--font-newsreader",
  bigShoulders: "--font-big-shoulders",
  publicSans: "--font-public-sans",
  italiana: "--font-italiana",
  hankenGrotesk: "--font-hanken-grotesk",
} as const;

/** Each template hard-codes its pairing; users pick colours, not fonts. */
export const FONTS = {
  inter: `var(${FONT_VARIABLES.inter}), Inter, ui-sans-serif, system-ui, sans-serif`,
  newsreader: `var(${FONT_VARIABLES.newsreader}), Newsreader, Georgia, serif`,
  bigShoulders: `var(${FONT_VARIABLES.bigShoulders}), "Big Shoulders", "Public Sans", "Noto Sans SC", "Noto Sans JP", "Noto Sans Arabic", sans-serif`,
  publicSans: `var(${FONT_VARIABLES.publicSans}), "Public Sans", "Noto Sans", "Noto Sans SC", "Noto Sans JP", "Noto Sans Arabic", system-ui, sans-serif`,
  italiana: `var(${FONT_VARIABLES.italiana}), Italiana, "Noto Serif", "Noto Serif SC", "Noto Serif JP", Georgia, serif`,
  hankenGrotesk: `var(${FONT_VARIABLES.hankenGrotesk}), "Hanken Grotesk", "Noto Sans", "Noto Sans SC", "Noto Sans JP", "Noto Sans Arabic", system-ui, sans-serif`,
} as const;

/** Design width every template is drawn at; previews render at this width and scale down. */
export const DESIGN_WIDTH = 1280;
