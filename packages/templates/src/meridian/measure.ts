import { contrastRatio, type SiteColors } from "@ceomaker/schema";
import type { CSSProperties } from "react";

// Meridian sizes and colours that depend on the content itself: the name, the seal's ring of
// text, and the contrast of the three colours the owner picked.

/** Hangul, CJK and full-width forms: set wider than Latin letters. */
const WIDE = /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/;

/**
 * Width of the name's longest word in "average letters": capitals count 1.25, CJK 1.9.
 * Hyphenated words may break after the hyphen, so each part counts on its own. Never below 4,
 * so a short name doesn't grow past the design's largest size.
 */
export function longestWord(name: string): number {
  let longest = 4;
  for (const word of name.trim().split(/\s+/).filter(Boolean)) {
    for (const part of word.split(/(?<=-)/)) {
      let width = 0;
      for (const character of part) {
        width += WIDE.test(character) ? 1.9 : /\p{Lu}/u.test(character) ? 1.25 : 1;
      }
      longest = Math.max(longest, width);
    }
  }
  return longest;
}

/** The seal's ring of text sits on a circle of this radius, in its 320-unit viewBox. */
export const RING_RADIUS = 138;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const SEPARATOR = " · ";

/**
 * "AMELIA HART · ROTTERDAM · " repeated to go once round the seal. The browser spaces it to the
 * exact circumference (textLength); a name too long for one turn is set smaller instead.
 */
export function ringText(
  name: string,
  location: string,
  fontSize: number,
): { text: string; fontSize: number } | null {
  if (!name) return null;
  const base = `${name}${location ? SEPARATOR + location : ""}${SEPARATOR}`.toUpperCase();
  let estimate = 0;
  for (const character of base) {
    estimate += WIDE.test(character) ? 1.05 : /\s/.test(character) ? 0.34 : 0.68;
  }
  estimate *= fontSize;
  const repeats = Math.max(1, Math.floor(RING_CIRCUMFERENCE / (estimate * 1.12)));
  const size =
    estimate * 1.06 > RING_CIRCUMFERENCE
      ? (fontSize * RING_CIRCUMFERENCE) / (estimate * 1.06)
      : fontSize;
  return { text: base.repeat(repeats), fontSize: Math.round(size * 100) / 100 };
}

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** `share` of `a` mixed into `b` in sRGB, the way CSS color-mix(in srgb) does. */
export function mixHex(a: string, b: string, share: number): string {
  const [ca, cb] = [channels(a), channels(b)];
  return `#${ca
    .map((value, index) =>
      Math.round(value * share + cb[index]! * (1 - share))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export interface MeridianRoles {
  /** Percent of text mixed into the background for secondary text. */
  secondary: number;
  /** Percent of text mixed into the background for form field borders. */
  field: number;
  /** Percent of accent kept when mixing it toward the text colour for small accent text. */
  accentText: number;
  /** Text on accent fills: the background or the text colour, whichever reads better. */
  onAccent: "bg" | "ink";
}

/**
 * The derived colour roles. Each mix is the least that clears its contrast target against the
 * background (4.5:1 for text, 3:1 for field borders), so whatever three colours the owner picks,
 * small text stays readable and the page keeps as much of their palette as it can.
 */
export function meridianRoles({ bg, ink, accent }: SiteColors): MeridianRoles {
  let secondary = 72;
  while (secondary < 100 && contrastRatio(mixHex(ink, bg, secondary / 100), bg) < 4.6) {
    secondary += 2;
  }
  let field = 40;
  while (field < 100 && contrastRatio(mixHex(ink, bg, field / 100), bg) < 3.1) field += 2;
  let accentText = 100;
  while (accentText > 0 && contrastRatio(mixHex(accent, ink, accentText / 100), bg) < 4.6) {
    accentText -= 4;
  }
  const onAccent = contrastRatio(bg, accent) >= contrastRatio(ink, accent) ? "bg" : "ink";
  return { secondary, field, accentText: Math.max(0, accentText), onAccent };
}

const mix = (a: string, share: number, b: string) =>
  `color-mix(in srgb, var(${a}) ${share}%, var(${b}))`;

/** The computed roles as CSS variables; the fixed tints live in styles.css. */
export function meridianRoleStyle(colors: SiteColors): CSSProperties {
  const roles = meridianRoles(colors);
  return {
    "--mer-ink2": mix("--site-ink", roles.secondary, "--site-bg"),
    "--mer-field": mix("--site-ink", roles.field, "--site-bg"),
    "--mer-act":
      roles.accentText >= 100
        ? "var(--site-accent)"
        : mix("--site-accent", roles.accentText, "--site-ink"),
    "--mer-on": roles.onAccent === "bg" ? "var(--site-bg)" : "var(--site-ink)",
  } as CSSProperties;
}
