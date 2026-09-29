import { z } from "zod";

export const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Colors must be 6-digit hex values like #1a2b3c")
  .transform((value) => value.toLowerCase());

export const FONT_PAIRS = ["editorial", "modern", "classic"] as const;
export type FontPair = (typeof FONT_PAIRS)[number];

export const RADII = ["none", "sm", "md", "lg"] as const;
export type Radius = (typeof RADII)[number];

/** WCAG AA for body text. Anything lower is hard to read and looks cheap. */
export const MIN_TEXT_CONTRAST = 4.5;

export const themeSchema = z
  .object({
    colors: z.object({
      background: hexColor,
      foreground: hexColor,
      primary: hexColor,
      accent: hexColor,
      muted: hexColor,
    }),
    fontPair: z.enum(FONT_PAIRS),
    radius: z.enum(RADII),
  })
  .refine(
    (theme) => contrastRatio(theme.colors.foreground, theme.colors.background) >= MIN_TEXT_CONTRAST,
    {
      message: `Text and background colors need a contrast ratio of at least ${MIN_TEXT_CONTRAST}:1`,
      path: ["colors", "foreground"],
    },
  )
  .refine(
    (theme) => contrastRatio(theme.colors.muted, theme.colors.background) >= MIN_TEXT_CONTRAST,
    {
      message: `Secondary text and background colors need a contrast ratio of at least ${MIN_TEXT_CONTRAST}:1`,
      path: ["colors", "muted"],
    },
  );

export type Theme = z.output<typeof themeSchema>;

function channelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = channelToLinear((value >> 16) & 0xff);
  const g = channelToLinear((value >> 8) & 0xff);
  const b = channelToLinear(value & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two #rrggbb colors, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/** Picks black or white text, whichever reads better on the given background. */
export function readableTextOn(background: string): "#000000" | "#ffffff" {
  return contrastRatio(background, "#000000") >= contrastRatio(background, "#ffffff")
    ? "#000000"
    : "#ffffff";
}

export const defaultTheme: Theme = {
  colors: {
    background: "#fbfaf7",
    foreground: "#16181d",
    primary: "#1f3a5f",
    accent: "#b08d57",
    muted: "#6b6f76",
  },
  fontPair: "editorial",
  radius: "sm",
};
