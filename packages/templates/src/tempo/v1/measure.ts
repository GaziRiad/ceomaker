import { contrastRatio, type PhotoGrade, type SiteColors } from "@ceomaker/schema";
import type { CSSProperties } from "react";
import { mixHex } from "../../meridian/v1/measure";

// Tempo sizes and colours that depend on the content itself. The design is drawn at three
// widths (desktop 1280, tablet 820, phone 390); each fitted size is worked out for all three and
// set as CSS variables, and tempo.css picks one with container queries on the site's width
// (640px leaves the phone layout, 1000px is desktop).

export type Device = "d" | "t" | "p";

const WIDTH: Record<Device, number> = { d: 1280, t: 820, p: 390 };
const PAD: Record<Device, number> = { d: 40, t: 32, p: 20 };
const MAX_CONTENT = 1200;

/** The content column at each drawing width, in px. */
function inner(device: Device): number {
  return Math.min(WIDTH[device] - 2 * PAD[device], MAX_CONTENT);
}

/** Hangul, CJK and full-width forms: about one em wide in any fallback font. */
const WIDE = /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/;

/**
 * Advance widths of Archivo at weight 440 and width 125 (how Tempo sets its display type), in
 * em, measured from the font. Accented letters use their base letter.
 */
const GLYPHS: Record<string, number> = {
  A: 0.891,
  B: 0.882,
  C: 0.95,
  D: 0.935,
  E: 0.869,
  F: 0.783,
  G: 1.014,
  H: 0.949,
  I: 0.328,
  J: 0.675,
  K: 0.877,
  L: 0.689,
  M: 1.088,
  N: 0.949,
  O: 1.023,
  P: 0.845,
  Q: 1.023,
  R: 0.906,
  S: 0.847,
  T: 0.791,
  U: 0.928,
  V: 0.838,
  W: 1.162,
  X: 0.905,
  Y: 0.832,
  Z: 0.818,
  a: 0.716,
  b: 0.705,
  c: 0.697,
  d: 0.705,
  e: 0.72,
  f: 0.393,
  g: 0.706,
  h: 0.689,
  i: 0.257,
  j: 0.255,
  k: 0.654,
  l: 0.257,
  m: 1.097,
  n: 0.689,
  o: 0.723,
  p: 0.705,
  q: 0.705,
  r: 0.409,
  s: 0.636,
  t: 0.414,
  u: 0.689,
  v: 0.617,
  w: 0.899,
  x: 0.649,
  y: 0.617,
  z: 0.611,
  "0": 0.743,
  "1": 0.647,
  "2": 0.732,
  "3": 0.742,
  "4": 0.705,
  "5": 0.74,
  "6": 0.744,
  "7": 0.667,
  "8": 0.753,
  "9": 0.744,
  "-": 0.416,
  "'": 0.187,
  "’": 0.268,
  ".": 0.286,
  ",": 0.286,
  "&": 0.873,
  "%": 1.064,
  "€": 0.76,
  $: 0.636,
  "£": 0.736,
  "+": 0.709,
  ":": 0.286,
  "!": 0.291,
  "?": 0.658,
  "/": 0.305,
  "×": 0.709,
  "(": 0.334,
  ")": 0.334,
  "@": 1.281,
  "#": 0.727,
  "–": 0.625,
  "—": 1.25,
  "“": 0.458,
  "”": 0.458,
  '"': 0.369,
  Æ: 1.295,
  æ: 1.183,
  Œ: 1.59,
  œ: 1.221,
  Ø: 1.023,
  ø: 0.723,
  ß: 0.747,
};
const SPACE = 0.331;
/** Figures are set with tabular digits, all one width. */
const TABULAR_DIGIT = 0.715;
/** Display type is tracked -0.045em. */
const TRACKING = -0.045;

function unitWidth(unit: string, tabular = false): number {
  let width = 0;
  for (const character of unit) {
    if (WIDE.test(character)) {
      width += 1;
      continue;
    }
    if (tabular && /\d/.test(character)) {
      width += TABULAR_DIGIT + TRACKING;
      continue;
    }
    const base = character.normalize("NFD")[0] ?? character;
    width += (GLYPHS[character] ?? GLYPHS[base] ?? 0.75) + TRACKING;
  }
  return width;
}

const wordsOf = (text: string) => text.trim().split(/\s+/).filter(Boolean);

/** Width of a text on one line, in em. */
export function textWidth(text: string, tabular = false): number {
  const words = wordsOf(text);
  return (
    words.reduce((sum, word) => sum + unitWidth(word, tabular), 0) +
    Math.max(0, words.length - 1) * (SPACE + TRACKING)
  );
}

/** The widest whole word, in em. */
function longestWord(text: string): number {
  return Math.max(0.5, ...wordsOf(text).map((word) => unitWidth(word)));
}

/** The widest place a text can't break (words split after hyphens), in em. */
function longestUnit(text: string): number {
  return Math.max(
    0.5,
    ...wordsOf(text)
      .flatMap((word) => word.split(/(?<=-)/))
      .map((unit) => unitWidth(unit)),
  );
}

export type Sizes = Record<Device, string>;

/** The content column as CSS, at each width: the page less its gutters, at most 1200px. */
const COLUMN: Record<Device, string> = {
  d: `min(100cqw - ${2 * PAD.d}px, ${MAX_CONTENT}px)`,
  t: `(100cqw - ${2 * PAD.t}px)`,
  p: `(100cqw - ${2 * PAD.p}px)`,
};

const round = (value: number) => Math.round(value * 100000) / 100000;

/**
 * A size that follows the content column, as the design works it out again at every width:
 * the column times `factor`, at most `cap` px and at least `floor` px. Exact at any width, not
 * only at the three it is drawn at.
 */
function fluid(
  factor: Record<Device, number>,
  cap: Record<Device, number>,
  floor = 0,
  column: (device: Device) => string = (device) => COLUMN[device],
): Sizes {
  const size = (device: Device) => {
    const value = `min(${cap[device]}px, ${column(device)} * ${round(factor[device])})`;
    return floor ? `max(${floor}px, ${value})` : value;
  };
  return { d: size("d"), t: size("t"), p: size("p") };
}

function each<T>(value: (device: Device) => T): Record<Device, T> {
  return { d: value("d"), t: value("t"), p: value("p") };
}

/** Sizes that don't follow the page: the same px between breakpoints. */
export function px(values: Record<Device, number>): Sizes {
  return { d: `${values.d}px`, t: `${values.t}px`, p: `${values.p}px` };
}

/** The three sizes as CSS variables: --{name}-d, --{name}-t and --{name}-p. */
export function sizeVars(name: string, sizes: Sizes): CSSProperties {
  return {
    [`--${name}-d`]: sizes.d,
    [`--${name}-t`]: sizes.t,
    [`--${name}-p`]: sizes.p,
  } as CSSProperties;
}

/**
 * The largest size up to `cap` (px) at which the longest word fits the column and the text
 * takes at most `lines` lines, never under 16px: the design's fit().
 */
function fit(text: string, cap: Record<Device, number>, lines: number): Sizes {
  const factor = Math.min(
    0.97 / longestWord(text),
    lines / (Math.max(0.5, textWidth(text)) * 1.06),
  );
  return fluid(
    each(() => factor),
    cap,
    16,
  );
}

/**
 * The name in two lines, first part left and the rest right: split between words where the
 * longer line is shortest. A single word stays on one line.
 */
export function splitName(name: string): [string, string] {
  const words = wordsOf(name);
  if (words.length < 2) return [name.trim(), ""];
  let best: [string, string] = [words[0]!, words.slice(1).join(" ")];
  let widest = Infinity;
  for (let at = 1; at < words.length; at++) {
    const first = words.slice(0, at).join(" ");
    const rest = words.slice(at).join(" ");
    const width = Math.max(textWidth(first), textWidth(rest));
    if (width < widest - 0.01) {
      widest = width;
      best = [first, rest];
    }
  }
  return best;
}

/**
 * The split name: both lines share one size, as large as the wider line allows, capped at
 * 212 / 150 / 92 px. Where that would fall under 116 / 88 / 52 the lines may wrap at spaces and
 * hyphens instead, and the size follows the widest piece that can't break.
 */
export function nameSizes(name: string): Sizes {
  const [first, rest] = splitName(name);
  const wider = Math.max(textWidth(first), rest ? textWidth(rest) : 0.1);
  const cap: Record<Device, number> = { d: 212, t: 150, p: 92 };
  const floor: Record<Device, number> = { d: 116, t: 88, p: 52 };
  const factor = each((device) =>
    Math.min(cap[device], (inner(device) * 0.97) / wider) < floor[device]
      ? 0.97 / longestUnit(name)
      : 0.97 / wider,
  );
  return fluid(factor, cap);
}

/** Section titles: 112 / 84 / 50 px, stepping down at 14, 28 and 50 characters, in two lines. */
export function titleSizes(title: string): Sizes {
  const length = title.length;
  const tier = length <= 14 ? 1 : length <= 28 ? 0.8 : length <= 50 ? 0.62 : 0.48;
  return fit(title, { d: 112 * tier, t: 84 * tier, p: 50 * tier }, 2);
}

/** The closing headline: 120 / 88 / 48 px up to 40 characters, smaller beyond, in three lines. */
export function ctaSizes(headline: string): Sizes {
  const length = headline.length;
  const cap =
    length <= 40
      ? { d: 120, t: 88, p: 48 }
      : length <= 80
        ? { d: 88, t: 68, p: 40 }
        : { d: 68, t: 54, p: 34 };
  return fit(headline || " ", cap, 3);
}

/** How many figures share a row at each width. */
export function figureColumns(count: number): Record<Device, number> {
  return {
    p: Math.min(2, count),
    t: Math.min(count, count === 4 ? 2 : 3),
    d: Math.min(count, 4),
  };
}

/** All figures share one size: the one that fits the widest value in its cell. */
export function figureSizes(values: string[]): Sizes {
  const count = values.length;
  const columns = figureColumns(count);
  const widest = Math.max(0.6, ...values.map((value) => textWidth(value, true)));
  const cap = count === 1 ? { d: 220, t: 120, p: 120 } : { d: 132, t: 104, p: 54 };
  return fluid(
    each(() => 0.95 / widest),
    cap,
    28,
    (device) => `(${COLUMN[device]} / ${columns[device]} - ${device === "p" ? 20 : 48}px)`,
  );
}

/** The name again at the foot of the page, on one line, as large as fits. */
export function bigNameSizes(name: string): Sizes {
  const width = Math.max(0.5, textWidth(name));
  return fluid(
    each(() => 0.96 / width),
    { d: 260, t: 170, p: 96 },
  );
}

/** The hero headline: 38 / 30 / 25 px up to 80 characters, else 31 / 26 / 22. */
export function headlineSizes(length: number): Sizes {
  const short = length <= 80;
  return px({ d: short ? 38 : 31, t: short ? 30 : 26, p: short ? 25 : 22 });
}

/** The About lead: larger alone, smaller beside a photo, stepping down as it lengthens. */
export function leadSizes(length: number, image: boolean): Sizes {
  if (image) return px({ d: 36, t: 28, p: 24 });
  return px({
    d: length < 160 ? 52 : length < 300 ? 44 : 36,
    t: length < 160 ? 38 : 32,
    p: length < 160 ? 27 : 24,
  });
}

/** A project title steps down with length. */
export function workTitleSizes(length: number): Sizes {
  return px({
    d: length <= 30 ? 40 : length <= 70 ? 32 : 26,
    t: length <= 40 ? 30 : 24,
    p: length <= 40 ? 25 : 21,
  });
}

/** A quote steps down with length. */
export function quoteSizes(length: number): Sizes {
  return px({
    d: length <= 140 ? 34 : length <= 300 ? 27 : 22,
    t: length <= 140 ? 28 : 22,
    p: length <= 140 ? 21 : 18,
  });
}

/**
 * The email address, fitted to its column (5/12 of it beside the form on desktop): up to 30px
 * beside the form (22 on phones), up to 64 / 44 / 26 without it, never under 17.
 */
export function emailSizes(email: string, form: boolean, beside: boolean): Sizes {
  const cap = form ? { d: 30, t: 30, p: 22 } : { d: 64, t: 44, p: 26 };
  const factor = 0.94 / (Math.max(1, email.length) * 0.6);
  return fluid(
    each(() => factor),
    cap,
    17,
    (device) => (beside && device === "d" ? `${COLUMN.d} * 5 / 12` : COLUMN[device]),
  );
}

/** Gallery strip heights; widths follow each photo's ratio, repeating 4:5, 3:2, 1:1, 3:2. */
export const STRIP_HEIGHT: Record<Device, number> = { d: 380, t: 300, p: 230 };
const STRIP_RATIOS = [4 / 5, 3 / 2, 1, 3 / 2] as const;

/** A strip photo's width at each size, in px. */
export function stripWidths(index: number): Record<Device, number> {
  return each((device) => Math.round(STRIP_HEIGHT[device] * STRIP_RATIOS[index % 4]!));
}

/**
 * How far the strip moves left as the page scrolls past it, so its last photo arrives at the
 * column's right edge: the strip's length less the column, as a CSS length.
 */
export function stripTravel(count: number): Sizes {
  return each((device) => {
    const gap = device === "p" ? 12 : 20;
    let length = gap * Math.max(0, count - 1);
    for (let index = 0; index < count; index++) length += stripWidths(index)[device];
    return `min(0px, ${COLUMN[device]} - ${length}px)`;
  });
}

/**
 * The header shows its links (and up to three icons) when they fit beside the name; otherwise a
 * Menu button. Returns the narrowest page width (1000 or 1280) at which they fit, or null.
 */
export function fullNavFrom(name: string, labels: string[], icons: number): 1000 | 1280 | null {
  const links = labels.reduce((total, label) => total + label.length * 7.4 + 38, 0);
  const brand = Math.min(240, name.length * 9) + 32;
  for (const page of [1000, 1280] as const) {
    const room = Math.min(page - 2 * PAD.d, MAX_CONTENT);
    if (links + brand + icons * 46 + 40 <= room) return page;
  }
  return null;
}

/** The text round the hero badge: the label repeated to go once round its ring. */
export function ringText(label: string): string {
  const unit = `${label.toLocaleUpperCase()}  ·  `;
  const circumference = 2 * Math.PI * 56;
  return unit.repeat(Math.max(1, Math.round(circumference / (unit.length * 7))));
}

/** The share of `from` mixed into `into` that first reaches `min` against every ground. */
function rising(from: string, into: string, grounds: string[], start: number, min: number) {
  const worst = (share: number) =>
    Math.min(...grounds.map((ground) => contrastRatio(mixHex(from, into, share / 100), ground)));
  let share = start;
  while (share < 100 && worst(share) < min) share += 2;
  return Math.min(share, 100);
}

/** The most of `from` kept, mixing toward `into`, that still reaches `min` against every ground. */
function falling(from: string, into: string, grounds: string[], min: number) {
  const worst = (share: number) =>
    Math.min(...grounds.map((ground) => contrastRatio(mixHex(from, into, share / 100), ground)));
  let share = 100;
  while (share > 0 && worst(share) < min) share -= 2;
  return Math.max(share, 0);
}

export interface TempoRoles {
  /** Percent of text in the background for secondary text: 4.5:1 on the page and both surfaces. */
  secondary: number;
  /** Percent of text in the background for field borders and outline buttons: 3:1. */
  border: number;
  /** Percent of accent kept, mixing toward the text, for marks: 3:1. */
  mark: number;
  /** Percent of accent kept, mixing toward the text, for accent text: 4.5:1. */
  accentText: number;
  /** On the inverse panels (text colour as ground): secondary text, borders and the mark. */
  inverseSecondary: number;
  inverseBorder: number;
  inverseMark: number;
}

/**
 * The derived colour roles. Each is mixed from the owner's three colours and stepped until it
 * clears its contrast target on every ground it sits on, so any palette stays readable.
 */
export function tempoRoles({ bg, ink, accent }: SiteColors): TempoRoles {
  const surface = mixHex(ink, bg, 0.045);
  const surface2 = mixHex(ink, bg, 0.09);
  return {
    secondary: rising(ink, bg, [bg, surface, surface2], 50, 4.6),
    border: rising(ink, bg, [bg, surface], 24, 3.1),
    mark: falling(accent, ink, [bg, surface], 3.05),
    accentText: falling(accent, ink, [bg, surface], 4.6),
    inverseSecondary: rising(bg, ink, [ink], 50, 4.6),
    inverseBorder: rising(bg, ink, [ink], 24, 3.1),
    inverseMark: falling(accent, bg, [ink], 3.05),
  };
}

const mix = (a: string, share: number, b: string) =>
  share >= 100 ? `var(${a})` : `color-mix(in srgb, var(${a}) ${share}%, var(${b}))`;

/** The computed roles as CSS variables; the fixed mixes live in tempo.css. */
export function tempoRoleStyle(colors: SiteColors): CSSProperties {
  const roles = tempoRoles(colors);
  return {
    "--tp-ink2": mix("--site-ink", roles.secondary, "--site-bg"),
    "--tp-br": mix("--site-ink", roles.border, "--site-bg"),
    "--tp-acg": mix("--site-accent", roles.mark, "--site-ink"),
    "--tp-act": mix("--site-accent", roles.accentText, "--site-ink"),
    "--tp-iink2": mix("--site-bg", roles.inverseSecondary, "--site-ink"),
    "--tp-ibr": mix("--site-bg", roles.inverseBorder, "--site-ink"),
    "--tp-iacg": mix("--site-accent", roles.inverseMark, "--site-bg"),
  } as CSSProperties;
}

/** One treatment for every photo: a filter, and the accent laid over it in colour blend. */
const GRADES: Record<PhotoGrade, { filter: string; overlay: string }> = {
  original: { filter: "none", overlay: "0" },
  tinted: { filter: "grayscale(1) contrast(1.05)", overlay: "0.4" },
  mono: { filter: "grayscale(1) contrast(1.1)", overlay: "0" },
};

export function gradeStyle(grade: PhotoGrade): CSSProperties {
  const { filter, overlay } = GRADES[grade] ?? GRADES.original;
  return { "--tp-gf": filter, "--tp-go": overlay } as CSSProperties;
}
