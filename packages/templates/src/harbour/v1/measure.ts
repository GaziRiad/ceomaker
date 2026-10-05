import { contrastRatio, type PhotoGrade, type SiteColors } from "@ceomaker/schema";
import type { CSSProperties } from "react";
import { mixHex } from "../../meridian/v1/measure";

// Harbour's sizes that depend on the content, and its colour roles. Sizes are set inline as
// custom properties; harbour.css fits them to the container with cqw, so they're right at
// every width, not only at 1280, 820 and 390.

/** Figtree Light's average advance per character, in ems (from the design). */
const NAME_EM = 0.56;
const FIGURE_EM = 0.58;

/** The longest piece the name can't break inside: words, split after hyphens. */
export function longestPiece(text: string): number {
  return Math.max(
    1,
    ...text
      .trim()
      .split(/\s+/)
      .flatMap((word) => word.split(/(?<=-)/))
      .map((piece) => [...piece].length),
  );
}

/**
 * The name: 96px on desktop and 54px on phones (76 and 44 past 24 and 22 characters), 16 and 6
 * larger without a portrait, and never wider than its longest piece allows (see harbour.css).
 */
export function nameStyle(name: string, portrait: boolean): CSSProperties {
  const length = [...name.trim()].length;
  const desktop = (length > 24 ? 76 : 96) + (portrait ? 0 : 16);
  const phone = (length > 22 ? 44 : 54) + (portrait ? 0 : 6);
  return {
    "--hb-name-d": `${desktop}px`,
    "--hb-name-p": `${phone}px`,
    "--hb-name-u": String(Math.round(longestPiece(name) * NAME_EM * 100) / 100),
  } as CSSProperties;
}

/** Figures share one size: the widest fits its column (four across, two on phones). */
export function figureStyle(values: string[]): CSSProperties {
  const longest = Math.max(2, ...values.map((value) => [...value].length));
  const count = values.length;
  return {
    "--hb-cols-d": String(Math.max(1, Math.min(count, 4))),
    "--hb-cols-p": String(Math.max(1, Math.min(count, 2))),
    "--hb-fig-u": String(Math.round(longest * FIGURE_EM * 100) / 100),
  } as CSSProperties;
}

/** Gallery photos per row: up to six on wide pages, never fewer than three slots; two on phones. */
export function galleryColumns(count: number): { desktop: number; phone: number } {
  const desktop =
    count <= 6 ? Math.max(count, 3) : ([6, 4, 5, 3].find((columns) => count % columns === 0) ?? 4);
  return { desktop, phone: count === 1 ? 1 : 2 };
}

/** Cards per row on wider pages: three when they fill rows of three (or there are many), else two. */
export function cardColumns(count: number, kind: "focus" | "work"): number {
  if (count === 1) return 1;
  if (kind === "focus") return count % 3 === 0 || count > 4 ? 3 : 2;
  return count % 3 === 0 ? 3 : 2;
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

export interface HarbourRoles {
  /** Percent of text in the background for secondary text: 4.5:1 on every ground. */
  secondary: number;
  /** Percent of text for field borders and link pills: 3:1 on the page and the bands. */
  border: number;
  /** Percent of the accent kept (toward the text) for small accent text: 4.5:1. */
  accentText: number;
  /** The same for large figures, the quote mark and focus rings: 3:1. */
  mark: number;
}

/** The grounds Harbour sets text on: the page, the bands, the cards and the closing panel. */
export function harbourGrounds({ bg, ink, accent }: SiteColors) {
  return {
    surface: mixHex(ink, bg, 0.04),
    surface2: mixHex(ink, bg, 0.07),
    tint: mixHex(accent, bg, 0.16),
  };
}

export function harbourRoles(colors: SiteColors): HarbourRoles {
  const { bg, ink, accent } = colors;
  const { surface, surface2, tint } = harbourGrounds(colors);
  return {
    secondary: rising(ink, bg, [bg, surface, surface2, tint], 50, 4.6),
    border: rising(ink, bg, [bg, surface], 24, 3.1),
    accentText: falling(accent, ink, [bg, surface, surface2, tint], 4.6),
    mark: falling(accent, ink, [bg, surface, surface2], 3.05),
  };
}

const mix = (a: string, share: number, b: string) =>
  share >= 100 ? `var(${a})` : `color-mix(in srgb, var(${a}) ${share}%, var(${b}))`;

/** The computed roles as CSS variables; the fixed mixes live in harbour.css. */
export function harbourRoleStyle(colors: SiteColors): CSSProperties {
  const roles = harbourRoles(colors);
  return {
    "--hb-ink2": mix("--site-ink", roles.secondary, "--site-bg"),
    "--hb-br": mix("--site-ink", roles.border, "--site-bg"),
    "--hb-act": mix("--site-accent", roles.accentText, "--site-ink"),
    "--hb-acg": mix("--site-accent", roles.mark, "--site-ink"),
  } as CSSProperties;
}

/** One treatment for every photo: a filter, and the accent multiplied over it. */
const GRADES: Record<PhotoGrade, { filter: string; overlay: string }> = {
  original: { filter: "none", overlay: "0" },
  tinted: { filter: "grayscale(1) contrast(1.05)", overlay: "0.35" },
  mono: { filter: "grayscale(1) contrast(1.08)", overlay: "0" },
};

export function gradeStyle(grade: PhotoGrade): CSSProperties {
  const { filter, overlay } = GRADES[grade] ?? GRADES.original;
  return { "--hb-gf": filter, "--hb-go": overlay } as CSSProperties;
}
