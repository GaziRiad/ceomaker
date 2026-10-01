import { z } from "zod";
import { TEMPLATE_KEYS, type TemplateKey } from "./templates";

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
 * Stored on every version. Each template remembers its own colours, so switching templates and
 * back never loses a palette. Templates without an entry use their default palette.
 */
export const themeSettingsSchema = z.object({
  palettes: z.partialRecord(z.enum(TEMPLATE_KEYS), siteColorsSchema).default({}),
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

/** Six presets per template. The first one is the template's default. */
export const TEMPLATE_PALETTES: Record<TemplateKey, readonly NamedPalette[]> = {
  meridian: [
    palette("Navy", "#fbfbfa", "#16181b", "#1f3a5f"),
    palette("Bottle green", "#fbfbfa", "#161917", "#1e4a3a"),
    palette("Oxblood", "#fbfaf8", "#1b1717", "#6d2433"),
    palette("Graphite", "#ffffff", "#111111", "#3b4048"),
    palette("Ivory", "#f7f4ee", "#1a1a1a", "#7a5f2e"),
    palette("Night", "#111316", "#ecebe6", "#a9bfdc"),
  ],
  aurora: [
    palette("Indigo", "#fbfbfd", "#0f1222", "#4f46e5"),
    palette("Ocean", "#f8fbfd", "#0b1b2b", "#0284c7"),
    palette("Emerald", "#fafcfb", "#0c1f17", "#059669"),
    palette("Coral", "#fdfbfa", "#1f1210", "#e11d48"),
    palette("Graphite", "#fafafa", "#111111", "#3f3f46"),
    palette("Midnight", "#0c0e1a", "#eef0fa", "#818cf8"),
  ],
  obsidian: [
    palette("Champagne", "#0b0b0c", "#f2efe9", "#c9a86a"),
    palette("Midnight", "#0a0f1c", "#eef1f7", "#8fb3ff"),
    palette("Bordeaux", "#120a0c", "#f4ece9", "#c2575f"),
    palette("Emerald night", "#08110e", "#e9f2ee", "#6fcf97"),
    palette("Platinum", "#0c0c0d", "#f2f2f2", "#bfc3c9"),
    palette("Daylight", "#f6f3ee", "#141414", "#9a7b45"),
  ],
  monument: [
    palette("Cobalt", "#f2f2ee", "#0a0a0a", "#1f3bff"),
    palette("Signal", "#f2f2ee", "#0a0a0a", "#ff4d00"),
    palette("Forest", "#f0f1ec", "#0b120d", "#0f7b3a"),
    palette("Oxblood", "#efe9df", "#111111", "#b3261e"),
    palette("Acid night", "#0b0b0b", "#f2f2ee", "#c8ff00"),
    palette("Mono", "#ffffff", "#000000", "#000000"),
  ],
  bento: [
    palette("Emerald", "#ececef", "#111113", "#0e7a5f"),
    palette("Sand", "#efebe4", "#1a1714", "#a15c2f"),
    palette("Ice", "#eaeff3", "#0d1620", "#2563eb"),
    palette("Plum", "#eeebf0", "#17111a", "#7c3aed"),
    palette("Carbon", "#0f0f11", "#f2f2f4", "#34d399"),
    palette("Blush", "#f3eceb", "#1c1414", "#be185d"),
  ],
  chronicle: [
    palette("Evergreen", "#f3efe6", "#22211d", "#2f4a3a"),
    palette("Terracotta", "#f4eee6", "#2a1f19", "#b5562f"),
    palette("Ink blue", "#f2f0ea", "#1b2230", "#2d4a7a"),
    palette("Plum", "#f3eee9", "#261d22", "#6b3a52"),
    palette("Charcoal", "#ecebe7", "#1c1c1c", "#555048"),
    palette("Lamplight", "#16140f", "#efe8da", "#d4a55a"),
  ],
};

export function defaultColors(template: TemplateKey): SiteColors {
  return TEMPLATE_PALETTES[template][0]!.colors;
}

/** The colours a template renders with: the user's choice for that template, else its default. */
export function resolveSiteColors(settings: ThemeSettings, template: TemplateKey): SiteColors {
  return settings.palettes[template] ?? defaultColors(template);
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
  return { palettes };
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
