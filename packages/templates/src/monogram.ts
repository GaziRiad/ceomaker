import { readableTextOn, type SiteColors } from "@ceomaker/schema";

/** Up to two initials from a display name, letters only ("Amelia Hart" -> "AH"). */
export function initialsOf(name: string): string {
  const words = name.match(/\p{L}+/gu) ?? [];
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Per-site favicon: the owner's initials on their accent colour, as an inline SVG data URI.
 * No extra request, cached with the page. Inputs are safe to interpolate: initials are letters
 * only and colours are validated #rrggbb.
 */
export function monogramIconDataUri(name: string, colors: SiteColors): string {
  const initials = initialsOf(name) || "•";
  const background = colors.accent;
  const foreground = readableTextOn(background);
  const fontSize = initials.length > 1 ? 26 : 34;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="${background}"/>` +
    `<text x="32" y="${32 + fontSize * 0.36}" text-anchor="middle" font-family="Georgia,serif" ` +
    `font-size="${fontSize}" font-weight="600" fill="${foreground}">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
