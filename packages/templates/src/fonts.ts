/**
 * Font CSS variables the host app must define (e.g. with next/font). Browsers only download
 * the font files a page actually uses, so declaring all of them costs nothing per site.
 */
export const FONT_VARIABLES = {
  inter: "--font-inter",
  playfair: "--font-playfair",
  manrope: "--font-manrope",
  newsreader: "--font-newsreader",
  bigShoulders: "--font-big-shoulders",
  publicSans: "--font-public-sans",
} as const;

/** Each template hard-codes its pairing; users pick colours, not fonts. */
export const FONTS = {
  inter: `var(${FONT_VARIABLES.inter}), Inter, ui-sans-serif, system-ui, sans-serif`,
  manrope: `var(${FONT_VARIABLES.manrope}), Manrope, ui-sans-serif, system-ui, sans-serif`,
  newsreader: `var(${FONT_VARIABLES.newsreader}), Newsreader, Georgia, serif`,
  playfair: `var(${FONT_VARIABLES.playfair}), "Playfair Display", Georgia, serif`,
  bigShoulders: `var(${FONT_VARIABLES.bigShoulders}), "Big Shoulders", "Public Sans", "Noto Sans SC", "Noto Sans JP", "Noto Sans Arabic", sans-serif`,
  publicSans: `var(${FONT_VARIABLES.publicSans}), "Public Sans", "Noto Sans", "Noto Sans SC", "Noto Sans JP", "Noto Sans Arabic", system-ui, sans-serif`,
} as const;

/** Design width every template is drawn at; previews render at this width and scale down. */
export const DESIGN_WIDTH = 1280;

/**
 * A length that equals `designPx` on a 1280px-wide site and shrinks with the site's width
 * (container query units), never below `minPx`. Keeps large type and spacing proportional
 * from phone to desktop without breakpoints.
 */
export function fluid(minPx: number, designPx: number): string {
  const cqw = Number(((designPx / DESIGN_WIDTH) * 100).toFixed(4));
  return `clamp(${minPx}px, ${cqw}cqw, ${designPx}px)`;
}
