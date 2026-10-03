// Search and sharing: the sizes uploads are saved at, the limits they are checked against, and
// how wide Google draws a title.

/** Share images are saved at exactly this size (JPEG). */
export const SHARE_IMAGE = { width: 1200, height: 630 } as const;
/** Favicons are saved at exactly this size (PNG). */
export const FAVICON_SIZE = 512;
/** Smallest favicon upload accepted, before cropping. */
export const FAVICON_MIN = 192;
/** Share image uploads between these width-to-height ratios open the crop without a note. */
export const SHARE_RATIO = { min: 1.43, max: 2.57 } as const;
/** Largest upload accepted for either image, before resizing in the browser. */
export const SHARING_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

/** Google cuts a title wider than this, drawn in 20px Arial. */
export const GOOGLE_TITLE_PX = 600;
/** Google shows about two lines of description: this width at 14px Arial. */
export const GOOGLE_DESCRIPTION_PX = 1150;

/** Arial advance widths in thousandths of an em (the Helvetica metrics Arial shares). */
const ARIAL: Record<string, number> = {
  " ": 278,
  "!": 278,
  '"': 355,
  "#": 556,
  $: 556,
  "%": 889,
  "&": 667,
  "'": 191,
  "(": 333,
  ")": 333,
  "*": 389,
  "+": 584,
  ",": 278,
  "-": 333,
  ".": 278,
  "/": 278,
  ":": 278,
  ";": 278,
  "?": 556,
  "@": 1015,
  "|": 260,
  "·": 278,
  "’": 222,
  "‘": 222,
  "“": 333,
  "”": 333,
  "–": 556,
  "—": 1000,
  "…": 1000,
  A: 667,
  B: 667,
  C: 722,
  D: 722,
  E: 667,
  F: 611,
  G: 778,
  H: 722,
  I: 278,
  J: 500,
  K: 667,
  L: 556,
  M: 833,
  N: 722,
  O: 778,
  P: 667,
  Q: 778,
  R: 722,
  S: 667,
  T: 611,
  U: 722,
  V: 667,
  W: 944,
  X: 667,
  Y: 667,
  Z: 611,
  a: 556,
  b: 556,
  c: 500,
  d: 556,
  e: 556,
  f: 278,
  g: 556,
  h: 556,
  i: 222,
  j: 222,
  k: 500,
  l: 222,
  m: 833,
  n: 556,
  o: 556,
  p: 556,
  q: 556,
  r: 333,
  s: 500,
  t: 278,
  u: 556,
  v: 500,
  w: 722,
  x: 500,
  y: 500,
  z: 500,
};

/** Width of a text in Arial at the given size, in px. Unknown characters count as a digit. */
export function arialWidth(text: string, sizePx: number): number {
  let width = 0;
  for (const character of text) {
    const base = character.normalize("NFD")[0] ?? character;
    width += ARIAL[character] ?? ARIAL[base] ?? 556;
  }
  return (width / 1000) * sizePx;
}

export interface Cut {
  /** The text as Google shows it: whole, or cut at a word with " …" after it. */
  text: string;
  cut: boolean;
  /** Characters that show before the cut. */
  shown: number;
  /** The last word that shows, when cut. */
  last: string | null;
}

/** Cuts a text where Google would, at a word, so that it and " …" fit in maxPx of Arial. */
export function cutToWidth(text: string, sizePx: number, maxPx: number): Cut {
  if (arialWidth(text, sizePx) <= maxPx) {
    return { text, cut: false, shown: text.length, last: null };
  }
  const characters = [...text];
  let fits = 0;
  let width = arialWidth(" …", sizePx);
  for (const character of characters) {
    width += arialWidth(character, sizePx);
    if (width > maxPx) break;
    fits += 1;
  }
  let end = characters.slice(0, fits + 1).lastIndexOf(" ");
  if (end < fits * 0.6) end = fits;
  const kept = characters
    .slice(0, end)
    .join("")
    .replace(/[\s,·.;:–-]+$/u, "");
  return {
    text: `${kept} …`,
    cut: true,
    shown: [...kept].length,
    last: kept.split(/\s+/).pop() ?? null,
  };
}

/** Where Google will cut a title: the last word that shows, or null when all of it shows. */
export function titleCutAfter(title: string): string | null {
  return cutToWidth(title, 20, GOOGLE_TITLE_PX).last;
}

/** About how many characters of a description Google shows, or null when all of it shows. */
export function descriptionShownChars(description: string): number | null {
  const cut = cutToWidth(description, 14, GOOGLE_DESCRIPTION_PX);
  return cut.cut ? cut.shown : null;
}
