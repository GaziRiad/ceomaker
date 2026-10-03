/** Same mark as app/(app)/icon.svg, inlined for pages outside the product layout (404s). */
const PLATFORM_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="#5980a6" fill-rule="evenodd" d="M0 0H16V3H3V16H0Z M5 5H16V16H5Z"/></svg>';

export const PLATFORM_ICON_DATA_URI = `data:image/svg+xml,${encodeURIComponent(PLATFORM_ICON_SVG)}`;
