import { contrastRatio, type PhotoGrade, type SiteColors } from "@ceomaker/schema";
import type { CSSProperties } from "react";
import { mixHex } from "../../meridian/v1/measure";

// Folio sizes and colours that depend on the content itself. The design is drawn at three
// widths (desktop 1280, tablet 820, phone 390); each fitted size is worked out for all three and
// set as CSS variables, and folio.css picks one with container queries on the site's width.

export type Device = "d" | "t" | "p";

const WIDTH: Record<Device, number> = { d: 1280, t: 820, p: 390 };
const PAD: Record<Device, number> = { d: 48, t: 36, p: 20 };
const MAX_CONTENT = 1184;

/** The content column at each drawing width, in px. */
function inner(device: Device): number {
  return Math.min(WIDTH[device] - 2 * PAD[device], MAX_CONTENT);
}

/** Hangul, CJK and full-width forms: about one em wide in any fallback font. */
const WIDE = /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/;

/** Advance widths of Geist SemiBold in em, measured from the font. Accents use their base letter. */
const GLYPHS: Record<string, number> = {
  A: 0.709,
  B: 0.695,
  C: 0.724,
  D: 0.708,
  E: 0.615,
  F: 0.6,
  G: 0.726,
  H: 0.719,
  I: 0.29,
  J: 0.617,
  K: 0.672,
  L: 0.586,
  M: 0.902,
  N: 0.748,
  O: 0.763,
  P: 0.664,
  Q: 0.757,
  R: 0.689,
  S: 0.668,
  T: 0.584,
  U: 0.699,
  V: 0.709,
  W: 0.991,
  X: 0.66,
  Y: 0.613,
  Z: 0.577,
  a: 0.58,
  b: 0.621,
  c: 0.58,
  d: 0.621,
  e: 0.591,
  f: 0.429,
  g: 0.62,
  h: 0.601,
  i: 0.269,
  j: 0.308,
  k: 0.628,
  l: 0.297,
  m: 0.892,
  n: 0.601,
  o: 0.603,
  p: 0.621,
  q: 0.621,
  r: 0.409,
  s: 0.553,
  t: 0.427,
  u: 0.597,
  v: 0.584,
  w: 0.839,
  x: 0.628,
  y: 0.57,
  z: 0.567,
  "0": 0.683,
  "1": 0.427,
  "2": 0.642,
  "3": 0.637,
  "4": 0.643,
  "5": 0.656,
  "6": 0.615,
  "7": 0.538,
  "8": 0.644,
  "9": 0.618,
  "-": 0.418,
  "'": 0.195,
  "’": 0.232,
  ".": 0.225,
  ",": 0.225,
  "&": 0.677,
  "%": 0.818,
  "€": 0.752,
  $: 0.656,
  "£": 0.635,
  "+": 0.566,
  ":": 0.306,
  "!": 0.243,
  "?": 0.581,
  "/": 0.508,
  "×": 0.528,
  "(": 0.306,
  ")": 0.306,
  "@": 0.944,
  "#": 0.552,
  "–": 0.594,
  "—": 0.91,
  "“": 0.431,
  "”": 0.431,
  '"': 0.376,
  Æ: 1.019,
  æ: 0.945,
  Œ: 1.109,
  œ: 0.984,
  Ø: 0.763,
  ø: 0.603,
  ß: 0.633,
};
const SPACE = 0.236;
/** Figures are set with tabular digits, all one width. */
const TABULAR_DIGIT = 0.624;
/** Display type is tracked -0.045em. */
const TRACKING = -0.045;

/** Words, with hyphenated words split after each hyphen: the places a line may break. */
function units(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word) => word.split(/(?<=-)/));
}

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
    width += (GLYPHS[character] ?? GLYPHS[base] ?? 0.6) + TRACKING;
  }
  return width;
}

/** Width of a text on one line, in em. */
export function textWidth(text: string, tabular = false): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const letters = words.reduce(
    (sum, word) =>
      sum + word.split(/(?<=-)/).reduce((total, unit) => total + unitWidth(unit, tabular), 0),
    0,
  );
  return letters + Math.max(0, words.length - 1) * (SPACE + TRACKING);
}

/** The widest place a text can't break, in em: its longest word. */
function longestUnit(text: string): number {
  return Math.max(0.5, ...units(text).map((unit) => unitWidth(unit)));
}

/**
 * The largest size up to `cap` (px) at which the longest word fits `room` (px) and the whole text
 * takes at most `lines` lines.
 */
function fit(text: string, cap: number, room: number, lines?: number): number {
  let size = Math.min(cap, (room * 0.95) / longestUnit(text));
  if (lines) size = Math.min(size, (room * lines) / (Math.max(0.5, textWidth(text)) * 1.1));
  return Math.max(15, Math.floor(size));
}

export type Sizes = Record<Device, string>;

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Sizes worked out in px at each drawing width, set in cqw so they follow the page between
 * widths. Above the desktop width they stop growing, so text sized to fit the 1184px column
 * still fits it on a wider screen.
 */
function cq(px: Record<Device, number>): Sizes {
  const at = (device: Device) => round((px[device] / WIDTH[device]) * 100);
  return { d: `min(${at("d")}cqw, ${px.d}px)`, t: `${at("t")}cqw`, p: `${at("p")}cqw` };
}

function each(size: (device: Device) => number): Record<Device, number> {
  return { d: size("d"), t: size("t"), p: size("p") };
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

/** Steps a size down as a text lengthens: at most `limits[0]` characters keep it whole. */
function tier(length: number, limits: [number, number, number], scales: [number, number, number]) {
  return length <= limits[0]
    ? 1
    : length <= limits[1]
      ? scales[0]
      : length <= limits[2]
        ? scales[1]
        : scales[2];
}

/**
 * The name: largest without a portrait, stepping down at 16, 26 and 40 characters, never so large
 * that its longest word breaks, and at most two lines (three on phones).
 */
export function nameSizes(name: string, portrait: boolean): Sizes {
  const scale = tier(name.length, [16, 26, 40], [0.82, 0.66, 0.54]);
  return cq(
    each((device) => {
      const cap =
        device === "p" ? 64 : device === "d" ? (portrait ? 128 : 168) : portrait ? 84 : 120;
      const room =
        device === "p" || !portrait
          ? inner(device)
          : device === "d"
            ? (inner(device) * 8) / 12 - 32
            : (inner(device) * 7) / 12 - 24;
      return fit(name || " ", cap * scale, room, device === "p" ? 3 : 2);
    }),
  );
}

/**
 * Section titles: 96 / 76 / 50 px, stepping down at 12, 24 and 44 characters, fitted to their
 * column, at most three lines. Focus sets its title in a side column on desktop.
 */
export function titleSizes(title: string, side = false): Sizes {
  const scale = tier(title.length, [12, 24, 44], [0.76, 0.56, 0.44]);
  const cap: Record<Device, number> = { d: 96, t: 76, p: 50 };
  return cq(
    each((device) => {
      const room = side && device === "d" ? (inner(device) * 5) / 12 - 32 : inner(device);
      return fit(title, cap[device] * scale, room, 3);
    }),
  );
}

/** Figures fill their card: the columns a row has at each width set the room. */
export function figureSizes(value: string, count: number): Sizes {
  const width = Math.max(0.5, textWidth(value, true));
  return cq(
    each((device) => {
      const columns =
        device === "p"
          ? count === 1
            ? 1
            : 2
          : device === "t"
            ? count <= 3
              ? count
              : 2
            : Math.min(count, 4);
      const gap = device === "p" ? 12 : 16;
      const pad = device === "p" ? 20 : device === "d" ? 28 : 24;
      const cell = (inner(device) - (columns - 1) * gap) / columns - 2 * pad;
      const cap = count === 1 ? { d: 168, t: 128, p: 88 }[device] : { d: 88, t: 72, p: 44 }[device];
      return Math.max(24, Math.floor(Math.min(cap, (cell * 0.95) / width)));
    }),
  );
}

/** Project slides take 64%, 80% and 86% of the content column. */
export const SLIDE_SHARE: Record<Device, number> = { d: 0.64, t: 0.8, p: 0.86 };
const TILE_PAD: Record<Device, number> = { d: 32, t: 26, p: 20 };

/**
 * The title on a project without an image, set large on the tint: 60 / 48 / 32 px up to 40
 * characters, 46 / 38 / 27 up to 80, 36 / 30 / 23 beyond, fitted to the tile in four lines.
 */
export function tileSizes(title: string, single: boolean): Sizes {
  const length = title.length;
  const caps: Record<Device, [number, number, number]> = {
    d: [60, 46, 36],
    t: [48, 38, 30],
    p: [32, 27, 23],
  };
  return cq(
    each((device) => {
      const cap = caps[device][length <= 40 ? 0 : length <= 80 ? 1 : 2];
      const tile = single
        ? device === "p"
          ? inner(device)
          : (inner(device) * 7) / 12
        : Math.round(inner(device) * SLIDE_SHARE[device]);
      return fit(title, cap, tile - 2 * TILE_PAD[device], 4);
    }),
  );
}

/** A single project's title beside its image: 52 / 38 / 30 px, fitted in four lines. */
export function featureTitleSizes(title: string): Sizes {
  const cap: Record<Device, number> = { d: 52, t: 38, p: 30 };
  return cq(
    each((device) =>
      fit(title, cap[device], device === "p" ? inner(device) : (inner(device) * 5) / 12 - 28, 4),
    ),
  );
}

/** A slide's title under its image steps down at 40 and 80 characters. */
export function slideTitleSizes(length: number): Sizes {
  const step = length <= 40 ? 0 : length <= 80 ? 1 : 2;
  return px({ d: [34, 28, 24][step]!, t: [30, 25, 22][step]!, p: [24, 21, 19][step]! });
}

/** The closing headline: 88 / 72 / 44 px up to 32 characters, smaller beyond, in five lines. */
export function ctaSizes(headline: string): Sizes {
  const length = headline.length;
  const step = length <= 32 ? 0 : length <= 64 ? 1 : 2;
  const caps: Record<Device, [number, number, number]> = {
    d: [88, 68, 52],
    t: [72, 56, 44],
    p: [44, 36, 30],
  };
  return cq(
    each((device) => {
      const padX = device === "p" ? 24 : device === "d" ? 64 : 44;
      const room =
        device === "d" ? ((inner(device) - 2 * padX) * 8) / 12 - 32 : inner(device) - 2 * padX;
      return fit(headline || " ", caps[device][step], room, 5);
    }),
  );
}

/** The About statement: larger alone, smaller beside a photo, stepping down as it lengthens. */
export function statementSizes(length: number, image: boolean): Sizes {
  if (image) return px({ d: 30, t: 24, p: 22 });
  return px({
    d: length < 160 ? 46 : length < 320 ? 38 : 32,
    t: length < 160 ? 36 : 30,
    p: length < 160 ? 26 : 22,
  });
}

/** One quote alone is set large; cards step down as quotes lengthen. */
export function quoteSizes(length: number, alone: boolean): Sizes {
  if (alone) {
    return px({
      d: length <= 140 ? 44 : length <= 300 ? 34 : 28,
      t: length <= 140 ? 34 : 27,
      p: length <= 140 ? 26 : 21,
    });
  }
  const step = length <= 110 ? 0 : length <= 260 ? 1 : 2;
  return px({ d: [21, 18, 16][step]!, t: [21, 18, 16][step]!, p: [19, 17, 16][step]! });
}

/** The email address when it stands alone (form off), as large as fits the column. */
export function emailSizes(email: string): Sizes {
  const caps: Record<Device, number> = { d: 52, t: 40, p: 24 };
  return px(
    each((device) =>
      Math.floor(
        Math.min(caps[device], (inner(device) * 0.94) / (Math.max(1, email.length) * 0.56)),
      ),
    ),
  );
}

/**
 * The header shows its links in full when the name, the links and the button fit the bar;
 * otherwise a Menu button. Returns the narrowest page width (1000 or 1280) at which they fit, or
 * null when they never do. Below 1000px it's always the menu.
 */
export function fullNavFrom(name: string, labels: string[], button: string): 1000 | 1280 | null {
  const links = labels.reduce((total, label) => total + label.length * 7.6 + 26, 0);
  const brand = Math.min(260, name.length * 9.4) + 40;
  const action = button.length * 7.8 + 44;
  for (const page of [1000, 1280] as const) {
    const room = Math.min(page - 2 * PAD.d, MAX_CONTENT);
    if (links + brand + action + 80 <= room) return page;
  }
  return null;
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

export interface FolioRoles {
  /** Percent of text in the background for secondary text: 4.5:1 on the page, Surface 2 and Tint. */
  secondary: number;
  /** Percent of text in the background for field borders and outline buttons: 3:1. */
  border: number;
  /** Percent of accent kept, mixing toward the text, for marks: 3:1 on the page and Surface 2. */
  mark: number;
  /** Percent of accent kept, mixing toward the text, for accent text: 4.5:1 on cards. */
  accentText: number;
  /** On the closing panel (text colour as ground): secondary text and the accent mark. */
  inverseSecondary: number;
  inverseMark: number;
}

/**
 * The derived colour roles. Each is mixed from the owner's three colours and stepped until it
 * clears its contrast target on every ground it sits on, so any palette stays readable.
 */
export function folioRoles({ bg, ink, accent }: SiteColors): FolioRoles {
  const surface = mixHex(ink, bg, 0.04);
  const surface2 = mixHex(ink, bg, 0.08);
  const tint = mixHex(accent, bg, 0.16);
  return {
    secondary: rising(ink, bg, [bg, surface2, tint], 50, 4.6),
    border: rising(ink, bg, [bg, surface], 24, 3.1),
    mark: falling(accent, ink, [bg, surface2], 3.05),
    accentText: falling(accent, ink, [bg, surface], 4.6),
    inverseSecondary: rising(bg, ink, [ink], 50, 4.6),
    inverseMark: falling(accent, bg, [ink], 3.05),
  };
}

const mix = (a: string, share: number, b: string) =>
  share >= 100 ? `var(${a})` : `color-mix(in srgb, var(${a}) ${share}%, var(${b}))`;

/** The computed roles as CSS variables; the fixed mixes live in folio.css. */
export function folioRoleStyle(colors: SiteColors): CSSProperties {
  const roles = folioRoles(colors);
  return {
    "--fo-ink2": mix("--site-ink", roles.secondary, "--site-bg"),
    "--fo-br": mix("--site-ink", roles.border, "--site-bg"),
    "--fo-acg": mix("--site-accent", roles.mark, "--site-ink"),
    "--fo-act": mix("--site-accent", roles.accentText, "--site-ink"),
    "--fo-iink2": mix("--site-bg", roles.inverseSecondary, "--site-ink"),
    "--fo-iacg": mix("--site-accent", roles.inverseMark, "--site-bg"),
  } as CSSProperties;
}

/** One treatment for every photo: a filter, and the accent laid over it in colour blend. */
const GRADES: Record<PhotoGrade, { filter: string; overlay: string }> = {
  original: { filter: "none", overlay: "0" },
  tinted: { filter: "grayscale(1) contrast(1.05)", overlay: "0.38" },
  mono: { filter: "grayscale(1) contrast(1.08)", overlay: "0" },
};

export function gradeStyle(grade: PhotoGrade): CSSProperties {
  const { filter, overlay } = GRADES[grade] ?? GRADES.original;
  return { "--fo-gf": filter, "--fo-go": overlay } as CSSProperties;
}
