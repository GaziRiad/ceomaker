import { z } from "zod";
import {
  resolveTemplateVersion,
  TEMPLATE_KEYS,
  type TemplateKey,
  type TemplateVersionOf,
} from "./templates";

export const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Colors must be 6-digit hex values like #1a2b3c")
  .transform((value) => value.toLowerCase());

/** WCAG AA for body text. Anything lower is hard to read and looks cheap. */
export const MIN_TEXT_CONTRAST = 4.5;

/**
 * The three colours a user picks per template. Templates derive everything else (muted text,
 * hairlines, tints, surfaces) from these, so any choice stays coherent.
 */
export const siteColorsSchema = z.object({
  bg: hexColor,
  ink: hexColor,
  accent: hexColor,
});

export type SiteColors = z.output<typeof siteColorsSchema>;

/**
 * How photos are shown across the site. "original" keeps each photo's own colours; "tinted"
 * turns them grey and washes them in the accent colour, so mixed photos read as one set; "mono"
 * is black and white. Templates that don't treat photos ignore it.
 */
export const PHOTO_GRADES = ["original", "tinted", "mono"] as const;
export type PhotoGrade = (typeof PHOTO_GRADES)[number];
export const DEFAULT_PHOTO_GRADE: PhotoGrade = "original";

/**
 * Stored on every version. Each template remembers its own colours, so switching templates and
 * back never loses a palette. Templates without an entry use their default palette.
 */
export const themeSettingsSchema = z.object({
  palettes: z
    .preprocess(
      // Palettes of retired templates are dropped, so older drafts still save.
      (value) =>
        typeof value === "object" && value !== null && !Array.isArray(value)
          ? Object.fromEntries(
              Object.entries(value).filter(([key]) =>
                (TEMPLATE_KEYS as readonly string[]).includes(key),
              ),
            )
          : value,
      z.partialRecord(z.enum(TEMPLATE_KEYS), siteColorsSchema),
    )
    .default({}),
  photoGrade: z.enum(PHOTO_GRADES).optional(),
});

export type ThemeSettings = z.output<typeof themeSettingsSchema>;
export type ThemeSettingsInput = z.input<typeof themeSettingsSchema>;

export const emptyThemeSettings: ThemeSettings = { palettes: {} };

export interface NamedPalette {
  name: string;
  colors: SiteColors;
}

function palette(name: string, bg: string, ink: string, accent: string): NamedPalette {
  return { name, colors: { bg, ink, accent } };
}

/**
 * Five or six presets per template design. The first one is that design's default. A new design of a
 * template gets its own list; the old design keeps its defaults.
 */
export const TEMPLATE_PALETTES: {
  [K in TemplateKey]: Record<TemplateVersionOf<K>, readonly NamedPalette[]>;
} = {
  meridian: {
    1: [
      palette("Navy", "#fbfbfa", "#16181b", "#1f3a5f"),
      palette("Bottle green", "#fbfbfa", "#161917", "#1e4a3a"),
      palette("Oxblood", "#fbfaf8", "#1b1717", "#6d2433"),
      palette("Graphite", "#ffffff", "#111111", "#3b4048"),
      palette("Ivory", "#f7f4ee", "#1a1a1a", "#7a5f2e"),
      palette("Night", "#111316", "#ecebe6", "#a9bfdc"),
    ],
  },
  harbour: {
    1: [
      palette("Linen", "#ffffff", "#2b2724", "#c97b63"),
      palette("Sand", "#f5efe6", "#2e2621", "#a0603f"),
      palette("Sage", "#eef1ea", "#1f2a23", "#557a5f"),
      palette("Dusk", "#1d1c21", "#f2ede6", "#e6a58f"),
      palette("Harbour", "#13252d", "#e9f0ef", "#8ccfc2"),
    ],
  },
  monument: {
    1: [
      palette("Acid night", "#0f100d", "#efeee6", "#c6f36b"),
      palette("Signal", "#f3f0e8", "#15130f", "#ff5a1f"),
      palette("Cobalt", "#f1f1ee", "#0e1015", "#1f3bff"),
      palette("Forest", "#f2f1ea", "#121512", "#1d5c3a"),
      palette("Oxblood", "#f4efe9", "#1a1414", "#7a1f2b"),
      palette("Ember night", "#14110f", "#f3ede4", "#ff6b2c"),
    ],
  },
  salon: {
    1: [
      palette("Noir", "#0e0e0d", "#ebe6dd", "#c8a273"),
      palette("Ivory", "#f4f0e7", "#151412", "#9a6a3a"),
      palette("Bordeaux", "#1b1013", "#f1e7e3", "#e0948a"),
      palette("Atlantic", "#0d151b", "#e4eaee", "#8db6cf"),
      palette("Linen", "#e8e6dd", "#1a1e19", "#56704d"),
    ],
  },
  folio: {
    1: [
      palette("Paper", "#f6f1e9", "#1b1a17", "#d0501f"),
      palette("Graphite", "#151515", "#eeebe5", "#ff6b3d"),
      palette("Cobalt", "#eef0f3", "#121721", "#2d55d8"),
      palette("Sage", "#e6e9de", "#1b2219", "#55782f"),
      palette("Midnight", "#0f1626", "#e9edf4", "#8fb0ff"),
    ],
  },
  tempo: {
    1: [
      palette("White", "#ffffff", "#0c0c0d", "#5b2eff"),
      palette("Mist", "#eef1f5", "#0f1720", "#0a5cff"),
      palette("Lilac", "#efebfd", "#1a1238", "#6a3cf0"),
      palette("Ink", "#0b0b0c", "#f4f3ef", "#b6a3ff"),
      palette("Moss", "#0f1a15", "#e8efe9", "#c4f06a"),
    ],
  },
};

/** The presets of one design of a template. */
export function templatePalettes(template: TemplateKey, version: number): readonly NamedPalette[] {
  const byVersion = TEMPLATE_PALETTES[template] as Record<number, readonly NamedPalette[]>;
  return byVersion[resolveTemplateVersion(template, version)]!;
}

export function defaultColors(template: TemplateKey, version: number): SiteColors {
  return templatePalettes(template, version)[0]!.colors;
}

/** The colours a design renders with: the user's choice for that template, else its default. */
export function resolveSiteColors(
  settings: ThemeSettings,
  template: TemplateKey,
  version: number,
): SiteColors {
  return settings.palettes[template] ?? defaultColors(template, version);
}

/**
 * The settings with the template's colours written out, so they no longer follow a default.
 * Published versions are stored this way: a later change to a default can't recolour them.
 */
export function withResolvedColors(
  settings: ThemeSettings,
  template: TemplateKey,
  version: number,
): ThemeSettings {
  return {
    ...settings,
    palettes: { ...settings.palettes, [template]: resolveSiteColors(settings, template, version) },
  };
}

/**
 * Tolerant parse for rendering stored versions. Valid palettes are kept one by one; anything
 * else (older theme shapes, corrupt values) falls back to template defaults instead of failing.
 */
export function parseThemeSettingsForRender(raw: unknown): ThemeSettings {
  const strict = themeSettingsSchema.safeParse(raw);
  if (strict.success) return strict.data;
  const palettes: ThemeSettings["palettes"] = {};
  const candidate =
    typeof raw === "object" && raw !== null ? (raw as { palettes?: unknown }).palettes : null;
  if (typeof candidate === "object" && candidate !== null) {
    for (const key of TEMPLATE_KEYS) {
      const parsed = siteColorsSchema.safeParse((candidate as Record<string, unknown>)[key]);
      if (parsed.success) palettes[key] = parsed.data;
    }
  }
  const grade = z
    .enum(PHOTO_GRADES)
    .safeParse(
      typeof raw === "object" && raw !== null ? (raw as { photoGrade?: unknown }).photoGrade : null,
    );
  return grade.success ? { palettes, photoGrade: grade.data } : { palettes };
}

/** The photo treatment a site renders with. */
export function resolvePhotoGrade(settings: ThemeSettings): PhotoGrade {
  return settings.photoGrade ?? DEFAULT_PHOTO_GRADE;
}

function channelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a #rrggbb color, from 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const value = Number.parseInt(hex.slice(1, 7), 16);
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

/** Dark grounds get lifted surfaces instead of white cards. */
export function isDarkColor(hex: string): boolean {
  return relativeLuminance(hex) < 0.2;
}

export type ContrastLevel = "excellent" | "good" | "low";

export function contrastLevel(colors: SiteColors): ContrastLevel {
  const ratio = contrastRatio(colors.ink, colors.bg);
  if (ratio >= 7) return "excellent";
  if (ratio >= MIN_TEXT_CONTRAST) return "good";
  return "low";
}

/** Drafts may hold any colours while the user experiments; publishing requires readable text. */
export function isPublishableColors(colors: SiteColors): boolean {
  return contrastRatio(colors.ink, colors.bg) >= MIN_TEXT_CONTRAST;
}
