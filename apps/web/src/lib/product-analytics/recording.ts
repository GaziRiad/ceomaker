// Session recordings, with everything personal hidden before it leaves the browser: every
// text and input becomes asterisks, images and canvases are blocked (shown as empty boxes), and
// attributes that carry content (captions, link addresses, labels) are masked. What's left is
// the layout, clicks, scrolling and timing: enough to see where people get stuck. These settings
// win over the PostHog project's own privacy settings.

/** Attributes whose values can be someone's content: alt captions, mailto: links, labels. */
const CONTENT_ATTRIBUTES = new Set([
  "alt",
  "title",
  "aria-label",
  "aria-description",
  "aria-valuetext",
  "placeholder",
  "value",
  "href",
  "src",
  "srcset",
  "content",
  "download",
  "data-value",
]);

export function maskAttribute(name: string, value: string, element?: Element): string {
  // Stylesheet links stay readable, or the replay would lose its styling.
  if (element?.tagName === "LINK") return value;
  return CONTENT_ATTRIBUTES.has(name.toLowerCase()) && value
    ? "*".repeat(Math.min(value.length, 12))
    : value;
}

export const RECORDING_OPTIONS = {
  maskAllInputs: true,
  maskTextSelector: "*",
  blockSelector: "img, picture, video, canvas, iframe, svg image, [style*='background-image']",
  maskAttributeFn: maskAttribute,
  recordHeaders: false,
  recordBody: false,
  recordCrossOriginIframes: false,
  captureJsonLd: false,
};
