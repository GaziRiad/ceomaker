import { contrastRatio, type PhotoGrade, type SiteColors } from "@ceomaker/schema";
import type { CSSProperties } from "react";
import { mixHex } from "../../meridian/v1/measure";

// Salon sizes, positions and colours that depend on the content itself. The design is drawn at
// three widths (desktop 1280, tablet 820, phone 390); each size is worked out for all three and
// set as CSS variables, and salon.css picks one with container queries on the site's width.

export type Device = "d" | "t" | "p";
export const DEVICES: readonly Device[] = ["d", "t", "p"];

const WIDTH: Record<Device, number> = { d: 1280, t: 820, p: 390 };
const PAD: Record<Device, number> = { d: 48, t: 36, p: 20 };
const MAX_CONTENT = 1184;

/** The page's width less its margins, in cqw. */
function avail(device: Device): number {
  return 100 - ((2 * PAD[device]) / WIDTH[device]) * 100;
}

/** The content column, in cqw. */
function inner(device: Device): number {
  return Math.min(avail(device), (MAX_CONTENT / WIDTH[device]) * 100);
}

/** Hangul, CJK and full-width forms: about one em wide in any fallback font. */
const WIDE = /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/;

/**
 * Advance widths of Italiana in em, measured from the font. Display text is set uppercase, so
 * letters are looked up in capitals; accented letters use their base letter.
 */
const GLYPHS: Record<string, number> = {
  A: 0.62,
  B: 0.57,
  C: 0.62,
  D: 0.62,
  E: 0.52,
  F: 0.5,
  G: 0.65,
  H: 0.59,
  I: 0.32,
  J: 0.29,
  K: 0.6,
  L: 0.48,
  M: 0.79,
  N: 0.59,
  O: 0.72,
  P: 0.57,
  Q: 0.72,
  R: 0.6,
  S: 0.51,
  T: 0.49,
  U: 0.63,
  V: 0.59,
  W: 0.85,
  X: 0.55,
  Y: 0.53,
  Z: 0.54,
  Æ: 0.69,
  Œ: 0.77,
  Ø: 0.72,
  "0": 0.65,
  "1": 0.4,
  "2": 0.44,
  "3": 0.37,
  "4": 0.44,
  "5": 0.35,
  "6": 0.5,
  "7": 0.41,
  "8": 0.54,
  "9": 0.5,
  "-": 0.4,
  "'": 0.1,
  "’": 0.26,
  ".": 0.11,
  ",": 0.09,
  "&": 0.9,
  "%": 0.65,
  "€": 0.5,
  $: 0.58,
  "£": 0.5,
  "+": 0.65,
  ":": 0.25,
  "!": 0.28,
  "?": 0.43,
  "/": 0.49,
  "×": 0.63,
};
const SPACE = 0.3;
/** Display text is tracked +0.01em. */
const TRACKING = 0.01;

/** Words, with hyphenated words split after each hyphen: the places a line may break. */
function units(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word) => word.split(/(?<=-)/));
}

function unitWidth(unit: string): number {
  let width = 0;
  for (const character of unit.toLocaleUpperCase()) {
    if (WIDE.test(character)) {
      width += 1;
      continue;
    }
    const base = character.normalize("NFD")[0] ?? character;
    width += (GLYPHS[character] ?? GLYPHS[base] ?? 0.62) + TRACKING;
  }
  return width;
}

/** Width of a text on one line, in em. */
export function textWidth(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const letters = words.reduce(
    (sum, word) => sum + word.split(/(?<=-)/).reduce((total, unit) => total + unitWidth(unit), 0),
    0,
  );
  return letters + Math.max(0, words.length - 1) * (SPACE + TRACKING);
}

/** The widest place a text can't break, in em: its longest word. */
function longestUnit(text: string): number {
  return Math.max(0.5, ...units(text).map(unitWidth));
}

/** A size no larger than `base`, at which the longest word fits in `room` (both in cqw). */
function fit(text: string, base: number, room: number): number {
  return Math.min(base, (room * 0.95) / longestUnit(text));
}

export type Sizes = Record<Device, string>;

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Sizes in cqw. Above the desktop drawing width they stop growing, so text sized to fit the
 * 1184px column still fits it on a wider screen.
 */
function cq(values: Record<Device, number>): Sizes {
  return {
    d: `min(${round(values.d)}cqw, ${round((values.d * WIDTH.d) / 100)}px)`,
    t: `${round(values.t)}cqw`,
    p: `${round(values.p)}cqw`,
  };
}

function each(size: (device: Device) => number): Record<Device, number> {
  return { d: size("d"), t: size("t"), p: size("p") };
}

/** The three sizes as CSS variables: --{name}-d, --{name}-t and --{name}-p. */
export function sizeVars(name: string, sizes: Sizes): CSSProperties {
  return {
    [`--${name}-d`]: sizes.d,
    [`--${name}-t`]: sizes.t,
    [`--${name}-p`]: sizes.p,
  } as CSSProperties;
}

export type HeroMode = "type" | "portrait" | "collage";

/**
 * The name: as large as its length allows (largest with no photo), and never so large that its
 * longest word breaks or it runs past three lines (four when long). With photos on a wide page,
 * a short name keeps to one line between them when it can.
 */
export function nameSizes(name: string, mode: HeroMode): Sizes {
  const length = name.length;
  const total = textWidth(name);
  return cq(
    each((device) => {
      const phone = device === "p";
      const room = mode === "collage" && !phone ? Math.min(avail(device), 86) : avail(device);
      const capBase =
        length <= 26 ? (mode === "type" ? 15.5 : 12) : length <= 50 ? 8 : length <= 85 ? 5.8 : 4.8;
      const cap = phone ? Math.min(capBase * 1.6, 21) : device === "t" ? capBase * 1.2 : capBase;
      const oneLine = (room * 0.95) / Math.max(0.5, total);
      let size = fit(name, cap, room);
      if (!phone && length <= 26 && mode === "collage" && oneLine >= cap * 0.6) {
        size = Math.min(cap, oneLine);
      }
      const lines = (length <= 26 ? 3 : 4) + (phone ? 1 : 0);
      return Math.min(size, (room * lines) / (Math.max(0.5, total) * 1.12));
    }),
  );
}

/** Section titles step down with length and always fit their longest word. */
export function titleSizes(title: string): Sizes {
  const length = title.length;
  const scale = length > 48 ? 0.45 : length > 28 ? 0.6 : length > 16 ? 0.8 : 1;
  const base: Record<Device, number> = { d: 7.2, t: 9, p: 12.5 };
  return cq(each((device) => fit(title, base[device] * scale, inner(device))));
}

/** The closing headline: smaller beside floating photos, in their 48cqw column. */
export function ctaSizes(headline: string, float: boolean): Sizes {
  const length = headline.length;
  return cq(
    each((device) => {
      const beside = float && device !== "p";
      const base =
        (beside
          ? length <= 30
            ? 6
            : length <= 60
              ? 4.4
              : 3.4
          : length <= 30
            ? 8
            : length <= 60
              ? 5.6
              : 4.2) *
        (device === "t" ? 1.15 : 1) *
        (device === "p" ? 1.6 : 1);
      const room = beside ? (device === "d" ? 48 : 46) : inner(device);
      return fit(headline, base, room);
    }),
  );
}

/** The About statement steps down as it lengthens. */
export function statementSizes(length: number): Sizes {
  const step = length <= 170 ? 0 : length <= 320 ? 1 : 2;
  const wide = [3.5, 2.9, 2.4][step]!;
  const sizes = cq({ d: wide, t: wide * 1.3, p: 0 });
  return { ...sizes, p: `${[28, 24, 21][step]}px` };
}

/** A figure, sized by how many share the row and fitted to its column. */
export function figureSizes(value: string, count: number): Sizes {
  const width = Math.max(0.5, textWidth(value));
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
      const base =
        device === "p"
          ? count === 1
            ? 30
            : 15
          : (count === 1 ? 14 : count === 2 ? 10 : count === 3 ? 8 : 7) *
            (device === "t" ? 1.25 : 1);
      return Math.min(base, ((inner(device) / columns) * 0.84) / width);
    }),
  );
}

/** The title on a work tile without an image. */
export function tileSizes(length: number): Sizes {
  const step = length <= 30 ? 0 : length <= 70 ? 1 : 2;
  const wide = [2.5, 1.9, 1.55][step]!;
  const sizes = cq({ d: wide, t: wide * 1.55, p: 0 });
  return { ...sizes, p: `${[30, 25, 21][step]}px` };
}

/** A quote steps down as it lengthens. */
export function quoteSizes(length: number): Sizes {
  const step = length <= 120 ? 0 : length <= 280 ? 1 : 2;
  const wide = [3.1, 2.3, 1.75][step]!;
  const sizes = cq({ d: wide, t: wide * 1.35, p: 0 });
  return { ...sizes, p: `${[27, 22, 19][step]}px` };
}

/** A place in a collage: x and y in cqw from the left and from the top or bottom edge. */
interface Slot {
  x: number;
  top: boolean;
  y: number;
  w: number;
  /** Width over height. */
  r: number;
}

const slot = (x: number, a: "t" | "b", y: number, w: number, r: number): Slot => ({
  x,
  top: a === "t",
  y,
  w,
  r,
});

/** The hero's places, filled in order, so three, six and nine photos each balance. */
const HERO_SLOTS: Record<"wide" | "phone", Slot[]> = {
  wide: [
    slot(8, "t", 5, 14, 0.8),
    slot(66, "t", 0, 14, 0.75),
    slot(41, "b", 0, 13, 0.8),
    slot(3, "b", 5, 11, 1),
    slot(76, "b", 2, 12, 0.8),
    slot(33, "t", 3, 10, 1),
    slot(21, "b", 0, 10, 0.75),
    slot(84, "t", 11, 10, 0.8),
    slot(59, "b", 9, 9, 1),
  ],
  phone: [
    slot(5, "t", 10, 30, 0.8),
    slot(56, "t", 0, 36, 0.75),
    slot(30, "b", 0, 34, 0.8),
    slot(4, "b", 18, 22, 1),
    slot(68, "b", 10, 28, 0.8),
    slot(37, "t", 30, 17, 1),
  ],
};

/** The closing section's places, at both sides of the headline. */
const CTA_SLOTS: Record<"wide" | "phone", Slot[]> = {
  wide: [
    slot(6, "t", 6, 11, 0.75),
    slot(81, "t", 4, 12, 0.8),
    slot(2, "t", 24, 12, 0.8),
    slot(85, "t", 24, 10, 0.75),
    slot(12, "t", 40, 9, 1),
    slot(75, "t", 35, 9, 1),
  ],
  phone: [
    slot(6, "t", 4, 30, 0.8),
    slot(58, "t", 0, 36, 0.75),
    slot(12, "b", 6, 32, 1),
    slot(56, "b", 0, 30, 0.8),
  ],
};

export const HERO_PHOTOS = { wide: 9, phone: 6 } as const;
export const CTA_PHOTOS = { wide: 6, phone: 4 } as const;

/** One photo's place at one width, as CSS values. */
interface Placement {
  left: string;
  top: string;
  bottom: string;
  width: string;
  ratio: string;
  /** Where it drifts in from: outward and from its own edge. */
  dx: string;
  dy: string;
}

interface Collage {
  /** Per photo, per width; null where a width shows fewer photos. */
  places: Record<Device, Placement | null>[];
  /** How far the photos reach from the top and from the bottom, in cqw, per width. */
  reach: Record<Device, { top: number; bottom: number }>;
}

function placeAll(count: number, slots: Slot[], scale: number) {
  let top = 0;
  let bottom = 0;
  const places = slots.slice(0, count).map((at): Placement => {
    const width = at.w * scale;
    const left = Math.min(at.x, 97 - width);
    const y = at.y * scale;
    const height = width / at.r;
    if (at.top) top = Math.max(top, y + height);
    else bottom = Math.max(bottom, y + height);
    return {
      left: `${round(left)}cqw`,
      top: at.top ? `${round(y)}cqw` : "auto",
      bottom: at.top ? "auto" : `${round(y)}cqw`,
      width: `${round(width)}cqw`,
      ratio: String(at.r),
      dx: `${left + width / 2 < 50 ? -18 : 18}px`,
      dy: `${at.top ? -14 : 14}px`,
    };
  });
  return { places, top, bottom };
}

function collage(
  count: number,
  slots: Record<"wide" | "phone", Slot[]>,
  tabletScale: number,
): Collage {
  const d = placeAll(count, slots.wide, 1);
  const t = placeAll(count, slots.wide, tabletScale);
  const p = placeAll(count, slots.phone, 1);
  return {
    places: d.places.map((place, index) => ({
      d: place,
      t: t.places[index] ?? null,
      p: p.places[index] ?? null,
    })),
    reach: {
      d: { top: d.top, bottom: d.bottom },
      t: { top: t.top, bottom: t.bottom },
      p: { top: p.top, bottom: p.bottom },
    },
  };
}

export function heroCollage(count: number): Collage {
  return collage(Math.min(count, HERO_PHOTOS.wide), HERO_SLOTS, 1.25);
}

export function ctaCollage(count: number): Collage {
  return collage(Math.min(count, CTA_PHOTOS.wide), CTA_SLOTS, 1.2);
}

/** A photo's place as CSS variables for every width. */
export function placeVars(place: Record<Device, Placement | null>): CSSProperties {
  const vars: Record<string, string> = {};
  for (const device of DEVICES) {
    const at = place[device];
    if (!at) continue;
    vars[`--sl-left-${device}`] = at.left;
    vars[`--sl-top-${device}`] = at.top;
    vars[`--sl-bottom-${device}`] = at.bottom;
    vars[`--sl-width-${device}`] = at.width;
    vars[`--sl-ratio-${device}`] = at.ratio;
    vars[`--sl-dx-${device}`] = at.dx;
    vars[`--sl-dy-${device}`] = at.dy;
  }
  return vars as CSSProperties;
}

/**
 * The header splits its links either side of a centred name when both halves fit; otherwise it
 * shows a Menu button. Returns the narrowest page width (1000 or 1280) at which they fit, or
 * null when they never do. Below 1000px it's always the menu.
 */
export function splitNavFrom(name: string, labels: string[]): 1000 | 1280 | null {
  const half = Math.ceil(labels.length / 2);
  const width = (list: string[]) =>
    list.reduce((total, label) => total + Math.min(170, label.length * 9.4) + 28, -28);
  // The name is set at 20px, tracked +0.2em.
  const nameWidth = (textWidth(name) + [...name].length * 0.19) * 20;
  for (const page of [1000, 1280] as const) {
    const side = (page - 2 * PAD.d - nameWidth - 48) / 2;
    if (width(labels.slice(0, half)) <= side && width(labels.slice(half)) <= side) return page;
  }
  return null;
}

export interface SalonRoles {
  /** Percent of text mixed into the background for secondary text. */
  secondary: number;
  /** Percent of text mixed into the background for brackets and field underlines. */
  bracket: number;
  /** Percent of accent kept when mixing toward the text colour, for accent text. */
  accentText: number;
  /** Text on the accent colour: the background or the text colour, whichever reads better. */
  onAccent: "bg" | "ink";
}

function rising(from: string, into: string, ground: string, start: number, min: number): number {
  let share = start;
  while (share < 100 && contrastRatio(mixHex(from, into, share / 100), ground) < min) share += 2;
  return Math.min(share, 100);
}

function falling(from: string, into: string, ground: string, min: number): number {
  let share = 100;
  while (share > 0 && contrastRatio(mixHex(from, into, share / 100), ground) < min) share -= 2;
  return Math.max(share, 0);
}

/**
 * The derived colour roles. Each mix is the least that clears its target (4.5:1 for text, 3:1
 * for brackets and field lines) against Surface 2, the darkest ground text sits on, so whatever
 * three colours the owner picks, every text stays readable everywhere it appears.
 */
export function salonRoles({ bg, ink, accent }: SiteColors): SalonRoles {
  const surface = mixHex(ink, bg, 0.09);
  return {
    secondary: rising(ink, bg, surface, 56, 4.6),
    bracket: rising(ink, bg, surface, 28, 3.1),
    accentText: falling(accent, ink, surface, 4.6),
    onAccent: contrastRatio(bg, accent) >= contrastRatio(ink, accent) ? "bg" : "ink",
  };
}

const mix = (a: string, share: number, b: string) =>
  share >= 100 ? `var(${a})` : `color-mix(in srgb, var(${a}) ${share}%, var(${b}))`;

/** The computed roles as CSS variables; the fixed tints live in salon.css. */
export function salonRoleStyle(colors: SiteColors): CSSProperties {
  const roles = salonRoles(colors);
  return {
    "--sl-ink2": mix("--site-ink", roles.secondary, "--site-bg"),
    "--sl-br": mix("--site-ink", roles.bracket, "--site-bg"),
    "--sl-act": mix("--site-accent", roles.accentText, "--site-ink"),
    "--sl-on": roles.onAccent === "bg" ? "var(--site-bg)" : "var(--site-ink)",
  } as CSSProperties;
}

/** One treatment for every photo: a filter, and the accent laid over it in colour blend. */
const GRADES: Record<PhotoGrade, { filter: string; overlay: string }> = {
  tinted: { filter: "grayscale(1) contrast(1.06) brightness(0.94)", overlay: "0.32" },
  mono: { filter: "grayscale(1) contrast(1.08)", overlay: "0" },
  natural: { filter: "saturate(0.82) contrast(1.03)", overlay: "0.08" },
};

export function gradeStyle(grade: PhotoGrade): CSSProperties {
  const { filter, overlay } = GRADES[grade] ?? GRADES.tinted;
  return { "--sl-gf": filter, "--sl-go": overlay } as CSSProperties;
}
