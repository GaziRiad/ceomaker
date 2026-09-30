/** Same mark as app/(app)/icon.svg, inlined for pages outside the product layout (404s). */
const PLATFORM_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1f3a5f"/><text x="32" y="43" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-weight="600" fill="#fbfaf7">C</text><rect x="20" y="48" width="24" height="2.5" rx="1.25" fill="#b08d57"/></svg>';

export const PLATFORM_ICON_DATA_URI = `data:image/svg+xml,${encodeURIComponent(PLATFORM_ICON_SVG)}`;
