import { isDarkColor, readableTextOn, type SiteColors } from "@ceomaker/schema";
import type { CSSProperties } from "react";

/**
 * The three user colours become CSS custom properties on the site root; styles.css derives the
 * rest (muted text, hairlines, tints) with color-mix. Colours are validated #rrggbb by the
 * schema, so nothing here can inject arbitrary CSS.
 */
export function themeToStyle(colors: SiteColors): CSSProperties {
  const dark = isDarkColor(colors.bg);
  return {
    "--site-bg": colors.bg,
    "--site-ink": colors.ink,
    "--site-accent": colors.accent,
    "--site-on": readableTextOn(colors.accent) === "#000000" ? "#111111" : "#ffffff",
    // Light grounds get white cards; dark grounds get a lifted shade of the ground instead.
    "--site-surface": dark ? "color-mix(in srgb, var(--site-bg) 92%, #ffffff)" : "#ffffff",
    // Strength of the fixed pastel tints (Aurora and Bento cards): full on light grounds,
    // muted on dark ones so text on them stays readable.
    "--site-pastel": dark ? "24%" : "100%",
  } as CSSProperties;
}
