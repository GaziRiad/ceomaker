import { readableTextOn, type FontPair, type Radius, type Theme } from "@ceomaker/schema";
import type { CSSProperties } from "react";

/**
 * Font CSS variables the host app must define (e.g. with next/font). Browsers only download
 * the font files a page actually uses, so declaring all of them costs nothing per site.
 */
export const FONT_VARIABLES = {
  inter: "--font-inter",
  playfair: "--font-playfair",
  manrope: "--font-manrope",
  newsreader: "--font-newsreader",
} as const;

const serif = "Georgia, 'Times New Roman', serif";
const sans = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

const FONT_STACKS: Record<FontPair, { heading: string; body: string }> = {
  editorial: {
    heading: `var(${FONT_VARIABLES.playfair}), ${serif}`,
    body: `var(${FONT_VARIABLES.inter}), ${sans}`,
  },
  modern: {
    heading: `var(${FONT_VARIABLES.manrope}), ${sans}`,
    body: `var(${FONT_VARIABLES.manrope}), ${sans}`,
  },
  classic: {
    heading: `var(${FONT_VARIABLES.newsreader}), ${serif}`,
    body: `var(${FONT_VARIABLES.inter}), ${sans}`,
  },
};

const RADII: Record<Radius, string> = {
  none: "0px",
  sm: "4px",
  md: "10px",
  lg: "20px",
};

/**
 * Theme values become CSS custom properties on the site root. Theme colors are validated as
 * #rrggbb by the schema, so nothing here can inject arbitrary CSS.
 */
export function themeToStyle(theme: Theme): CSSProperties {
  const fonts = FONT_STACKS[theme.fontPair];
  return {
    "--site-bg": theme.colors.background,
    "--site-fg": theme.colors.foreground,
    "--site-primary": theme.colors.primary,
    "--site-on-primary": readableTextOn(theme.colors.primary),
    "--site-accent": theme.colors.accent,
    "--site-muted": theme.colors.muted,
    "--site-font-heading": fonts.heading,
    "--site-font-body": fonts.body,
    "--site-radius": RADII[theme.radius],
  } as CSSProperties;
}
