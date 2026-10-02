import { contrastRatio, type SiteColors } from "@ceomaker/schema";
import type { CSSProperties } from "react";
import { mixHex } from "../../meridian/v1/measure";

// Monument sizes and colours that depend on the content itself: the stacked name, the figures,
// the section titles, and the contrast of the three colours the owner picked.

/** Hangul, CJK and full-width forms: about one em wide in any fallback font. */
const WIDE = /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/;

/**
 * Advance widths of Big Shoulders at weight 900 and its display optical size, in em, measured
 * from the font. Letters are looked up in capitals (the name is set uppercase); accented letters
 * use their base letter.
 */
const GLYPHS: Record<string, number> = {
  A: 0.48,
  B: 0.47,
  C: 0.49,
  D: 0.5,
  E: 0.41,
  F: 0.41,
  G: 0.49,
  H: 0.49,
  I: 0.23,
  J: 0.45,
  K: 0.5,
  L: 0.4,
  M: 0.75,
  N: 0.54,
  O: 0.5,
  P: 0.47,
  Q: 0.5,
  R: 0.48,
  S: 0.47,
  T: 0.42,
  U: 0.49,
  V: 0.49,
  W: 0.8,
  X: 0.47,
  Y: 0.47,
  Z: 0.42,
  Æ: 0.68,
  Œ: 0.6,
  Ø: 0.5,
  "0": 0.51,
  "1": 0.27,
  "2": 0.49,
  "3": 0.5,
  "4": 0.51,
  "5": 0.52,
  "6": 0.5,
  "7": 0.49,
  "8": 0.5,
  "9": 0.5,
  "-": 0.45,
  "'": 0.2,
  "’": 0.2,
  ".": 0.25,
  ",": 0.25,
  "&": 0.62,
  "%": 0.75,
  "€": 0.52,
  $: 0.5,
  "£": 0.5,
  "+": 0.5,
  x: 0.47,
  " ": 0.22,
};

/** Width of a text in Big Shoulders 900, in em. */
export function displayWidth(text: string): number {
  let width = 0;
  for (const character of text.toLocaleUpperCase()) {
    if (WIDE.test(character)) {
      width += 1;
      continue;
    }
    const base = character.normalize("NFD")[0] ?? character;
    width += GLYPHS[character] ?? GLYPHS[base] ?? 0.5;
  }
  return width;
}

/** The name in lines: one word per line, and long hyphenated words break after the hyphen. */
export function nameLines(name: string): { text: string; space: boolean }[] {
  const lines: { text: string; space: boolean }[] = [];
  for (const word of name.trim().split(/\s+/).filter(Boolean)) {
    word.split(/(?<=-)/).forEach((part, index) => {
      lines.push({ text: part, space: index === 0 && lines.length > 0 });
    });
  }
  return lines;
}

/** The widest line of the name, in em, with a little room so it never touches the edge. */
export function nameMeasure(name: string): number {
  const widths = nameLines(name).map((line) => displayWidth(line.text));
  return Math.max(2, ...widths) / 0.97;
}

/** Section titles shrink as they lengthen, so an 80-character title still fits. */
export function titleScale(title: string): number {
  const length = title.length;
  if (length > 48) return 0.4;
  if (length > 24) return 0.58;
  if (length > 14) return 0.78;
  return 1;
}

export interface MonumentRoles {
  /** Text on the accent field: the background or the text colour, whichever reads better. */
  onAccent: "bg" | "ink";
  /** Percent of on-accent kept when mixing toward the accent, for secondary text on the field. */
  onAccent2: number;
  /** Percent of text mixed into the background for secondary text on paper. */
  secondary: number;
  /** Percent of background mixed into the text colour for secondary text on the inverse field. */
  inverseSecondary: number;
  /** Percent of accent kept when mixing toward the text colour, for accent text on paper. */
  accentText: number;
  /** Percent of accent kept when mixing toward the background, for accent text on the inverse. */
  accentInverse: number;
  /** Percent of text mixed into the background for form field borders. */
  field: number;
}

function rising(from: string, into: string, ground: string, start: number, min: number): number {
  let share = start;
  while (share < 100 && contrastRatio(mixHex(from, into, share / 100), ground) < min) share += 2;
  return Math.min(share, 100);
}

function falling(from: string, into: string, ground: string, min: number): number {
  let share = 100;
  while (share > 0 && contrastRatio(mixHex(from, into, share / 100), ground) < min) share -= 4;
  return Math.max(share, 0);
}

/**
 * The derived colour roles. Each mix is the least that clears its contrast target against the
 * ground it sits on (4.5:1 for text, 3:1 for field borders), so whatever three colours the owner
 * picks, every text stays readable on paper, on the inverse field and on the accent field.
 */
export function monumentRoles({ bg, ink, accent }: SiteColors): MonumentRoles {
  const onAccent = contrastRatio(bg, accent) >= contrastRatio(ink, accent) ? "bg" : "ink";
  const on = onAccent === "bg" ? bg : ink;
  return {
    onAccent,
    onAccent2: rising(on, accent, accent, 70, 4.6),
    secondary: rising(ink, bg, bg, 70, 4.6),
    inverseSecondary: rising(bg, ink, ink, 70, 4.6),
    accentText: falling(accent, ink, bg, 4.6),
    accentInverse: falling(accent, bg, ink, 4.6),
    field: rising(ink, bg, bg, 40, 3.1),
  };
}

const mix = (a: string, share: number, b: string) =>
  share >= 100 ? `var(${a})` : `color-mix(in srgb, var(${a}) ${share}%, var(${b}))`;

/** The computed roles as CSS variables; the fixed tints live in monument.css. */
export function monumentRoleStyle(colors: SiteColors): CSSProperties {
  const roles = monumentRoles(colors);
  const on = roles.onAccent === "bg" ? "--site-bg" : "--site-ink";
  return {
    "--mon-on": `var(${on})`,
    "--mon-on2": mix(on, roles.onAccent2, "--site-accent"),
    "--mon-ink2": mix("--site-ink", roles.secondary, "--site-bg"),
    "--mon-bg2": mix("--site-bg", roles.inverseSecondary, "--site-ink"),
    "--mon-act": mix("--site-accent", roles.accentText, "--site-ink"),
    "--mon-acd": mix("--site-accent", roles.accentInverse, "--site-bg"),
    "--mon-field": mix("--site-ink", roles.field, "--site-bg"),
    "--mon-rulea": `color-mix(in srgb, var(${on}) 30%, var(--site-accent))`,
    "--mon-tone": `color-mix(in srgb, var(${on}) 14%, var(--site-accent))`,
  } as CSSProperties;
}
