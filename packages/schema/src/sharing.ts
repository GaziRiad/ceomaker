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

/**
 * Where Google will cut a title: the last whole word that fits in front of " ...", or null when
 * the whole title shows.
 */
export function titleCutAfter(title: string): string | null {
  if (arialWidth(title, 20) <= GOOGLE_TITLE_PX) return null;
  const room = GOOGLE_TITLE_PX - arialWidth(" ...", 20);
  const words = title.split(/\s+/).filter(Boolean);
  let shown = "";
  let last: string | null = null;
  for (const word of words) {
    const next = shown ? `${shown} ${word}` : word;
    if (arialWidth(next, 20) > room) break;
    shown = next;
    if (/[\p{L}\p{N}]/u.test(word)) last = word.replace(/[,;:·]+$/u, "");
  }
  return last;
}

/** About how many characters of a description Google shows, or null when all of it shows. */
export function descriptionShownChars(description: string): number | null {
  if (arialWidth(description, 14) <= GOOGLE_DESCRIPTION_PX) return null;
  let count = 0;
  let width = arialWidth(" ...", 14);
  for (const character of description) {
    width += arialWidth(character, 14);
    if (width > GOOGLE_DESCRIPTION_PX) break;
    count += 1;
  }
  return count;
}
