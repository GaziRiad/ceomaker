import { z } from "zod";

// C0 control characters (except tab/newline where noted) and DEL never belong in user-facing copy.
const NO_CONTROL_CHARS = /^[^\u0000-\u001f\u007f]*$/;
const NO_CONTROL_CHARS_MULTILINE = /^[^\u0000-\u0008\u000b-\u001f\u007f]*$/;

/** Single-line plain text. Rendered by React as a text node, never as markup. */
export const text = (max: number) =>
  z.string().trim().max(max).regex(NO_CONTROL_CHARS, "Must not contain control characters");

export const requiredText = (max: number) => text(max).min(1);

/** Multi-line plain text (newlines allowed). */
export const longText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .regex(NO_CONTROL_CHARS_MULTILINE, "Must not contain control characters");

/** Raw span text: not trimmed, because spaces between spans are meaningful. */
export const spanText = (max: number) =>
  z.string().max(max).regex(NO_CONTROL_CHARS_MULTILINE, "Must not contain control characters");

const LINK_PROTOCOLS = new Set(["https:", "http:", "mailto:", "tel:"]);
const IN_PAGE_ANCHOR = /^#[a-z0-9][a-z0-9_-]{0,31}$/i;

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * A link a visitor can click. Only http(s), mailto:, tel: and in-page anchors are allowed,
 * which rules out `javascript:`, `data:` and other script-bearing schemes by construction.
 */
export const safeLinkUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => {
      if (IN_PAGE_ANCHOR.test(value)) return true;
      const url = parseUrl(value);
      return url !== null && LINK_PROTOCOLS.has(url.protocol);
    },
    { message: "Links must be https, http, mailto:, tel: or an in-page #anchor" },
  );

export const httpsUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => parseUrl(value)?.protocol === "https:", {
    message: "Must be an https URL",
  });

/** Path of an image uploaded to CEOMaker, served by the app on every host (see /media/[id]). */
export const MEDIA_PATH = /^\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function mediaPath(id: string): string {
  return `/media/${id}`;
}

/** Image sources are our own uploads or absolute https URLs. Nothing else can reach an <img>. */
export const imageSrc = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => MEDIA_PATH.test(value) || parseUrl(value)?.protocol === "https:", {
    message: "Must be an uploaded image or an https URL",
  });

/** An image uploaded to CEOMaker; external URLs are not accepted. */
export const mediaSrc = z.string().trim().regex(MEDIA_PATH, "Must be an uploaded image");

export const imageRef = z.object({
  src: imageSrc,
  alt: text(200),
});

export const callToAction = z.object({
  label: requiredText(40),
  href: safeLinkUrl,
});

/** Stable per-section id, used as React key and in-page anchor. */
export const sectionId = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]{0,31}$/i, "Section ids are 1-32 letters, digits, - or _");

export type ImageRef = z.output<typeof imageRef>;
export type CallToAction = z.output<typeof callToAction>;
